# Availability System Changes - Analysis & Requirements

## Current System (Dojo_Financier_App) vs Target System (4as app v2)

### Current System Issues:
1. **Pre-generates individual slots**: Creates hundreds/thousands of 60-minute slots upfront
2. **Inefficient storage**: Each slot is a separate database record
3. **Fixed duration**: Slots are created with a fixed 60-minute duration
4. **Admin sees all slots**: Displays all generated slots in the admin interface

### Target System (4as app v2) Architecture:

#### 1. **Availability Rules (Not Slots)**
- Stores **recurring availability windows** (e.g., "Monday 9:00-17:00")
- Stores **date exceptions** (specific dates that override rules)
- **NO pre-generated slots** - slots are generated on-demand when students view availability

#### 2. **On-Demand Slot Generation**
- When a student requests availability for a date:
  - System reads availability rules
  - Generates slots dynamically based on:
    - Availability windows for that day
    - Booked appointments (excluded from available slots)
    - Student's selected duration (60, 90, or 120 min)
  - Each slot can support multiple durations (60, 90, 120 min) if they fit in the window

#### 3. **Slot Structure**
```typescript
TimeSlot {
  startDatetime: Date,  // Start time of the slot
  availableDurations: [
    { minutes: 60, price: number },
    { minutes: 90, price: number },
    { minutes: 120, price: number }
  ]
}
```

#### 4. **Booking Logic**
- Student selects a start time and duration
- System checks if that duration fits in the availability window
- System checks if the time slot overlaps with existing appointments
- Once booked, the appointment blocks that time slot

#### 5. **Admin Interface**
- Shows availability **rules** (not individual slots)
- Shows **booked appointments** (not available slots)
- No need to see all generated slots

## Required Changes

### 1. **Database Schema Changes**

#### Option A: Keep current schema, change usage
- Keep `AppointmentAvailability` but use it differently:
  - Store availability **windows** instead of individual slots
  - Remove `durationMinutes` field (or set to null for windows)
  - Use `startTime` and `endTime` to represent availability windows

#### Option B: New schema (Recommended)
- Create `AvailabilityRule` model (recurring weekly rules)
- Create `AvailabilityException` model (date-specific exceptions)
- Keep `AppointmentAvailability` for backward compatibility or remove it
- Use `Appointment` model to track booked slots

**Recommended Schema:**
```prisma
model AvailabilityRule {
  id            String   @id @default(uuid())
  courseId      String?  @map("course_id") // null = all courses
  weekday       Int      // 0-6 (Sunday-Saturday)
  startTime     String   // "09:00" format
  endTime       String   // "17:00" format
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  
  course Course? @relation(fields: [courseId], references: [id], onDelete: Cascade)
  
  @@map("availability_rules")
}

model AvailabilityException {
  id            String   @id @default(uuid())
  courseId      String?  @map("course_id") // null = all courses
  startDate     DateTime @map("start_date")
  endDate       DateTime @map("end_date")
  isUnavailable Boolean  @default(true) @map("is_unavailable")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  
  course Course? @relation(fields: [courseId], references: [id], onDelete: Cascade)
  
  @@map("availability_exceptions")
}
```

### 2. **API Changes**

Create new API endpoint: `/api/course-availability`
- **GET**: Get available slots for a specific date and duration
- **POST**: Get availability map for multiple dates (for calendar dots)

**Request:**
```
GET /api/course-availability?courseId=xxx&date=2024-01-15&duration=60
```

**Response:**
```json
{
  "hasAvailability": true,
  "slots": [
    {
      "start": "2024-01-15T09:00:00Z",
      "end": "2024-01-15T10:00:00Z",
      "available": true,
      "duration": 60,
      "price": 50.00
    },
    {
      "start": "2024-01-15T09:00:00Z",
      "end": "2024-01-15T10:30:00Z",
      "available": true,
      "duration": 90,
      "price": 75.00
    }
  ]
}
```

### 3. **Slot Generation Logic**

Create `lib/slots/generator.ts`:
- `getAvailableSlots(courseId, fromDate, toDate)` - Main function
- Reads availability rules
- Applies exceptions
- Generates slots on 30-minute grid
- Excludes booked appointments
- Calculates available durations for each slot

**Key Logic:**
1. For each day in the date range:
   - Get weekday (0-6)
   - Find availability rules for that weekday
   - Apply exceptions (unavailable dates)
   - Generate time slots on 30-minute grid within availability windows
   - For each slot, check which durations (60, 90, 120 min) fit
   - Exclude slots that overlap with booked appointments

### 4. **Admin Interface Changes**

**Availability Management Component:**
- Remove "Disponibilités existantes" section (no need to show generated slots)
- Keep "Disponibilités récurrentes" (availability rules)
- Keep "Exceptions de dates" (date exceptions)
- Change "Sauvegarder" to save rules/exceptions (not generate slots)
- Show summary of rules instead of individual slots

### 5. **Student Booking Interface Changes**

**Appointment Booking Component:**
- Call `/api/course-availability` API instead of `getAvailabilityAction`
- Display slots dynamically based on selected duration
- Show available durations for each slot (if multiple fit)
- When booking, create `Appointment` record (not `AppointmentAvailability`)

### 6. **Constants**

Create `lib/slots/types.ts`:
```typescript
export const SLOT_GRID_MINUTES = 30  // Slots generated on 30-min intervals
export const LEAD_TIME_HOURS = 12     // Minimum hours in advance
export const MAX_ADVANCE_DAYS = 120   // Maximum days in advance
export const VALID_DURATIONS = [60, 90, 120]  // Valid appointment durations
```

## Implementation Steps

1. **Create new database models** (AvailabilityRule, AvailabilityException)
2. **Create migration** to add new tables
3. **Create slot generator** (`lib/slots/generator.ts`)
4. **Create API endpoint** (`app/api/course-availability/route.ts`)
5. **Update admin availability management** to save rules instead of generating slots
6. **Update student booking interface** to use new API
7. **Remove old slot generation logic** from admin component
8. **Update appointment creation** to check slot availability dynamically

## Benefits

1. **Efficient**: No pre-generated slots cluttering the database
2. **Flexible**: Students can choose any duration that fits
3. **Real-time**: Slots are always up-to-date with current bookings
4. **Scalable**: Works for any number of courses and availability rules
5. **Clean admin interface**: Shows rules, not thousands of slots




