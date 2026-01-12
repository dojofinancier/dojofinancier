# Make.com Webhooks Setup - Complete Review

## Overview
This document provides a comprehensive review of all webhooks in the Dojo Financier App, including:
- Webhooks that receive events FROM make.com (webhook endpoints)
- Webhooks that send events TO make.com (outgoing webhooks)
- Webhooks that need to be implemented (TODOs)
- Required environment variables

---

## 1. Webhook Endpoints (Receiving FROM make.com)

These endpoints receive processed events from make.com and update the application state.

### ✅ Implemented Endpoints

#### 1.1. `/api/webhooks/make/payments` ✅
**File**: `app/api/webhooks/make/payments/route.ts`
**Status**: Fully implemented
**Purpose**: Receives payment success events from make.com and creates enrollments
**Events Handled**:
- `payment.success` - Creates course or cohort enrollment
- Supports both course and cohort payments
- Tracks coupon usage
- Calculates expiration dates based on course/cohort access duration

**Expected Payload**:
```json
{
  "eventType": "payment.success",
  "paymentIntentId": "pi_xxx",
  "userId": "user_id",
  "courseId": "course_id",  // For course payments
  "cohortId": "cohort_id",  // For cohort payments
  "type": "course" | "cohort",
  "amount": 100.00,
  "couponCode": "DISCOUNT10",
  "discountAmount": 10.00
}
```

#### 1.2. `/api/webhooks/make/messages` ✅
**File**: `app/api/webhooks/make/messages/route.ts`
**Status**: Fully implemented
**Purpose**: Receives instructor responses from make.com
**Events Handled**:
- `message.received` - Creates message in database from instructor response

**Expected Payload**:
```json
{
  "eventType": "message.received",
  "threadId": "thread_id",
  "userId": "instructor_user_id",
  "content": "Instructor response text",
  "isFromStudent": false
}
```

#### 1.3. `/api/webhooks/make/appointments` ✅
**File**: `app/api/webhooks/make/appointments/route.ts`
**Status**: Fully implemented
**Purpose**: Receives appointment status updates from make.com (calendar integration)
**Events Handled**:
- `appointment.confirmed`
- `appointment.cancelled`
- `appointment.rescheduled`

**Expected Payload**:
```json
{
  "eventType": "appointment.confirmed" | "appointment.cancelled" | "appointment.rescheduled",
  "appointmentId": "appointment_id",
  "status": "confirmed" | "cancelled" | "rescheduled"
}
```

#### 1.4. `/api/webhooks/make/errors` ✅
**File**: `app/api/webhooks/make/errors/route.ts`
**Status**: Fully implemented
**Purpose**: Receives error notifications from make.com for admin alerts
**Events Handled**: Error logging from external systems

**Expected Payload**:
```json
{
  "errorType": "CLIENT" | "SERVER",
  "errorMessage": "Error description",
  "stackTrace": "Stack trace...",
  "userId": "user_id",
  "url": "https://...",
  "userAgent": "Browser info",
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
}
```

#### 1.5. `/api/webhooks/make/support-tickets` ✅
**File**: `app/api/webhooks/make/support-tickets/route.ts`
**Status**: Basic implementation (placeholder)
**Purpose**: Receives support ticket updates from external systems
**Events Handled**:
- `ticket.created`
- `ticket.updated`
- `ticket.replied`

**Note**: Currently just logs events, full implementation pending

#### 1.6. `/api/webhooks/make/cohort-enrollments` ✅
**File**: `app/api/webhooks/make/cohort-enrollments/route.ts`
**Status**: Fully implemented
**Purpose**: Receives cohort enrollment notifications from make.com
**Events Handled**:
- `cohort.enrollment.created` - Logs enrollment event for tracking

**Expected Payload**:
```json
{
  "eventType": "cohort.enrollment.created",
  "enrollmentId": "enrollment_id",
  "userId": "user_id",
  "userEmail": "user@example.com",
  "cohortId": "cohort_id",
  "cohortTitle": "Cohort Name",
  "paymentIntentId": "pi_xxx"
}
```

#### 1.7. `/api/webhooks/make/cohort-messages` ✅
**File**: `app/api/webhooks/make/cohort-messages/route.ts`
**Status**: Fully implemented
**Purpose**: Receives cohort message board notifications from make.com
**Events Handled**:
- `cohort.message.created` - Logs message event for tracking

**Expected Payload**:
```json
{
  "eventType": "cohort.message.created",
  "cohortId": "cohort_id",
  "messageId": "message_id",
  "authorId": "user_id",
  "authorEmail": "user@example.com",
  "cohortTitle": "Cohort Name",
  "messagePreview": "Message preview text"
}
```

---

## 2. Outgoing Webhooks (Sending TO make.com)

These webhooks send events from the application to make.com for processing and automation.

### ✅ Implemented Outgoing Webhooks

#### 2.1. Error Notifications ✅
**Location**: `lib/utils/error-logging.ts`
**Status**: Implemented
**Trigger**: When HIGH or CRITICAL errors occur
**Environment Variable**: `MAKE_WEBHOOK_ERRORS_URL`
**Payload**:
```json
{
  "errorId": "error_id",
  "errorType": "CLIENT" | "SERVER",
  "errorMessage": "Error description",
  "severity": "HIGH" | "CRITICAL",
  "url": "https://...",
  "userId": "user_id",
  "stackTrace": "Stack trace...",
  "userAgent": "Browser info",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### 2.2. Payment Success ✅
**Location**: `app/api/webhooks/stripe/route.ts`
**Status**: Implemented
**Trigger**: When Stripe payment intent succeeds
**Environment Variable**: `MAKE_WEBHOOK_PAYMENTS_URL`
**Payload**:
```json
{
  "eventType": "payment.success",
  "paymentIntentId": "pi_xxx",
  "userId": "user_id",
  "courseId": "course_id",
  "enrollmentId": "enrollment_id",
  "amount": 100.00,
  "originalAmount": 100.00,
  "discountAmount": 0.00,
  "couponCode": null
}
```

---

### ❌ Missing Outgoing Webhooks (TODOs)

#### 2.3. Appointment Created ❌
**Location**: `app/actions/appointments.ts` (line 79)
**Status**: TODO - Not implemented
**Trigger**: When a new appointment is created
**Required**: Send webhook for calendar integration
**Suggested Payload**:
```json
{
  "eventType": "appointment.created",
  "appointmentId": "appointment_id",
  "userId": "user_id",
  "studentEmail": "student@example.com",
  "studentName": "Student Name",
  "courseId": "course_id",
  "courseTitle": "Course Name",
  "contentItemId": "content_id",
  "contentItemTitle": "Content Title",
  "scheduledAt": "2024-01-01T10:00:00Z",
  "duration": 60,
  "status": "pending",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### 2.4. Appointment Payment Confirmed ❌
**Location**: `app/actions/appointment-payment.ts` (line 326)
**Status**: TODO - Not implemented
**Trigger**: When appointment payment is confirmed
**Required**: Send webhook for calendar integration
**Suggested Payload**:
```json
{
  "eventType": "appointment.payment.confirmed",
  "appointmentId": "appointment_id",
  "paymentIntentId": "pi_xxx",
  "userId": "user_id",
  "amount": 100.00,
  "confirmedAt": "2024-01-01T00:00:00Z"
}
```

#### 2.5. Appointment Cancelled/Rescheduled ❌
**Location**: `app/actions/appointments.ts` (line 395)
**Status**: TODO - Not implemented
**Trigger**: When appointment is cancelled or rescheduled
**Required**: Send webhook for calendar integration
**Suggested Payload**:
```json
{
  "eventType": "appointment.cancelled" | "appointment.rescheduled",
  "appointmentId": "appointment_id",
  "userId": "user_id",
  "reason": "Cancellation reason",
  "oldScheduledAt": "2024-01-01T10:00:00Z",  // For rescheduled
  "newScheduledAt": "2024-01-01T14:00:00Z",  // For rescheduled
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### 2.6. Student Question/Message to Instructor ❌
**Location**: `app/actions/messages.ts` (line 98)
**Status**: TODO - Not implemented
**Trigger**: When student sends a question/message to instructor
**Required**: Send webhook for instructor notification
**Suggested Payload**:
```json
{
  "eventType": "message.sent",
  "messageId": "message_id",
  "threadId": "thread_id",
  "studentId": "user_id",
  "studentEmail": "student@example.com",
  "studentName": "Student Name",
  "instructorId": "instructor_id",
  "instructorEmail": "instructor@example.com",
  "content": "Question text",
  "contentItemId": "content_id",
  "contentItemTitle": "Content Title",
  "courseId": "course_id",
  "courseTitle": "Course Name",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### 2.7. Cohort Enrollment Created ❌
**Status**: TODO - Not implemented
**Trigger**: When a cohort enrollment is created (after payment)
**Required**: Send webhook for welcome emails, instructor notifications
**Suggested Payload**:
```json
{
  "eventType": "cohort.enrollment.created",
  "enrollmentId": "enrollment_id",
  "userId": "user_id",
  "userEmail": "user@example.com",
  "userName": "User Name",
  "cohortId": "cohort_id",
  "cohortTitle": "Cohort Name",
  "paymentIntentId": "pi_xxx",
  "expiresAt": "2025-01-01T00:00:00Z",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### 2.8. Cohort Message Posted ❌
**Status**: TODO - Not implemented
**Trigger**: When a message is posted to cohort message board
**Required**: Send webhook for notifications to instructors/admins
**Suggested Payload**:
```json
{
  "eventType": "cohort.message.created",
  "messageId": "message_id",
  "cohortId": "cohort_id",
  "cohortTitle": "Cohort Name",
  "authorId": "user_id",
  "authorEmail": "user@example.com",
  "authorName": "User Name",
  "content": "Message content",
  "hasAttachments": false,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### 2.9. Support Ticket Created ❌
**Status**: TODO - Not implemented
**Trigger**: When a support ticket is created
**Required**: Send webhook for ticket management automation
**Suggested Payload**:
```json
{
  "eventType": "ticket.created",
  "ticketId": "ticket_id",
  "ticketNumber": "TKT-001",
  "userId": "user_id",
  "userEmail": "user@example.com",
  "subject": "Ticket subject",
  "description": "Ticket description",
  "category": "technical",
  "priority": "medium",
  "status": "open",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### 2.10. Support Ticket Status Changed ❌
**Status**: TODO - Not implemented
**Trigger**: When support ticket status changes
**Required**: Send webhook for ticket management automation
**Suggested Payload**:
```json
{
  "eventType": "ticket.status_changed",
  "ticketId": "ticket_id",
  "ticketNumber": "TKT-001",
  "userId": "user_id",
  "oldStatus": "open",
  "newStatus": "in_progress",
  "changedBy": "admin_id",
  "reason": "Status change reason",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### 2.11. Support Ticket Reply Added ❌
**Status**: TODO - Not implemented
**Trigger**: When a reply is added to a support ticket
**Required**: Send webhook for ticket management automation
**Suggested Payload**:
```json
{
  "eventType": "ticket.reply_added",
  "ticketId": "ticket_id",
  "replyId": "reply_id",
  "authorId": "user_id",
  "authorRole": "student" | "admin",
  "message": "Reply content",
  "isInternal": false,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

## 3. Environment Variables Required

### Currently Used
- `MAKE_WEBHOOK_ERRORS_URL` - For error notifications (HIGH/CRITICAL)
- `MAKE_WEBHOOK_PAYMENTS_URL` - For payment success events

### Required for Missing Webhooks
- `MAKE_WEBHOOK_APPOINTMENTS_URL` - For appointment events (created, cancelled, rescheduled, payment confirmed)
- `MAKE_WEBHOOK_MESSAGES_URL` - For student questions/messages to instructors
- `MAKE_WEBHOOK_COHORT_ENROLLMENTS_URL` - For cohort enrollment notifications
- `MAKE_WEBHOOK_COHORT_MESSAGES_URL` - For cohort message board posts
- `MAKE_WEBHOOK_SUPPORT_TICKETS_URL` - For support ticket events

### Optional (Can use fallback URLs)
- `MAKE_WEBHOOK_ADMIN_URL` - For admin operations (can fallback to other URLs)

---

## 4. Reference: "4as app v2" Implementation

The "4as app v2" workspace has a comprehensive webhook implementation that can serve as a reference:

**File**: `c:\Users\User\Desktop\4as app v2\lib\webhooks\make.ts`

**Implemented Webhook Types**:
1. `signup` - User signup events
2. `booking.created` - Booking created
3. `booking.cancelled` - Booking cancelled
4. `booking.rescheduled` - Booking rescheduled
5. `appointment.completed` - Appointment completed
6. `order.refunded` - Order refunded
7. `message.sent` - Message sent
8. `rating.created` / `rating.updated` - Rating events
9. `ticket.created` / `ticket.status_changed` / `ticket.message_added` - Support ticket events
10. `error.occurred` - Error events
11. Admin operations: `course.created`, `course.updated`, `course.deleted`, `tutor.created`, `tutor.updated`, `tutor.rate.updated`

**Features**:
- Centralized webhook sender with retry logic (3 attempts with exponential backoff)
- Event recording in database (webhookEvent table)
- Type-safe webhook payloads
- Environment variable mapping for different webhook types

**Environment Variables Used**:
- `MAKE_SIGNUP_WEBHOOK_URL`
- `MAKE_BOOKING_WEBHOOK_URL`
- `MAKE_CANCELLATION_WEBHOOK_URL`
- `MAKE_RESCHEDULE_WEBHOOK_URL`
- `MAKE_COMPLETION_WEBHOOK_URL`
- `MAKE_REFUND_WEBHOOK_URL`
- `MAKE_MESSAGE_WEBHOOK_URL`
- `MAKE_RATING_WEBHOOK_URL`
- `MAKE_TICKET_WEBHOOK_URL`
- `MAKE_ERROR_WEBHOOK_URL`
- `MAKE_ADMIN_WEBHOOK_URL`

---

## 5. Implementation Recommendations

### 5.1. Create Centralized Webhook Utility
Similar to "4as app v2", create a centralized webhook sender utility:
- **Location**: `lib/webhooks/make.ts`
- **Features**:
  - Retry logic (3 attempts with exponential backoff)
  - Error handling
  - Type-safe payloads
  - Environment variable mapping

### 5.2. Priority Implementation Order
1. **High Priority**:
   - Appointment webhooks (created, payment confirmed, cancelled, rescheduled)
   - Student message/question webhook
   - Cohort enrollment webhook

2. **Medium Priority**:
   - Cohort message webhook
   - Support ticket webhooks (created, status changed, reply added)

3. **Low Priority**:
   - Additional admin operation webhooks
   - Rating webhooks (if ratings are implemented)

### 5.3. Webhook Payload Standardization
All webhooks should follow a consistent structure:
```json
{
  "type": "event.type",
  "payload": {
    // Event-specific data
  },
  "event_id": "unique_event_id",
  "sent_at": "2024-01-01T00:00:00Z"
}
```

### 5.4. Error Handling
- All webhook calls should be non-blocking (use `.catch()`)
- Log webhook failures but don't fail the main operation
- Consider implementing a webhook retry queue for failed webhooks

---

## 6. Summary

### ✅ Completed
- 7 webhook endpoints (receiving from make.com)
- 2 outgoing webhooks (errors, payments)

### ❌ Missing
- 9 outgoing webhooks need to be implemented
- Centralized webhook utility needs to be created
- Environment variables need to be configured

### 📋 Next Steps
1. Create centralized webhook utility (`lib/webhooks/make.ts`)
2. Implement missing outgoing webhooks
3. Configure environment variables in production
4. Test webhook flows end-to-end
5. Set up monitoring for webhook delivery



