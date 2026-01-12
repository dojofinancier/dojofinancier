# Cohort Student Dashboard - UI/UX Recommendation

## Overview
The cohort student dashboard should provide a comprehensive, community-focused learning experience that distinguishes cohorts from regular courses while maintaining consistency with the overall platform design.

## Key Design Principles

### 1. **Community-First Approach**
- Emphasize social learning and collaboration
- Make group features (messaging, sessions) highly visible
- Show cohort progress and engagement metrics

### 2. **Quick Access to Key Features**
- Upcoming group coaching sessions (with join buttons)
- Unread message notifications
- Recent activity feed
- Quick navigation to learning content

### 3. **Visual Distinction**
- Use distinct color scheme (blue accent for cohorts vs. default for courses)
- Cohort-specific icons (GraduationCap, Users, MessageSquare, Video)
- Group-oriented imagery and messaging

### 4. **Information Hierarchy**
1. **Primary Actions**: Join session, View messages, Continue learning
2. **Status Indicators**: Upcoming sessions, Unread messages, Progress
3. **Secondary Info**: Instructor, Enrollment dates, Cohort members

## Recommended Layout

### Option A: Enhanced Cards in Courses Tab (Current + Improvements)
**Pros**: Keeps everything in one place, familiar navigation
**Cons**: Cohorts might get lost among courses

**Improvements**:
- Larger, more prominent cohort cards
- Quick action buttons (Join Session, View Messages)
- Status badges (Upcoming Session, New Messages)
- Progress indicators

### Option B: Separate Cohorts Tab (Recommended)
**Pros**: Clear separation, dedicated space for cohort features
**Cons**: Additional navigation tab

**Layout Structure**:
```
┌─────────────────────────────────────────┐
│  Cohorts Tab                            │
├─────────────────────────────────────────┤
│  [Active Cohorts Grid]                  │
│  ┌──────────┐  ┌──────────┐            │
│  │ Cohort 1 │  │ Cohort 2 │            │
│  │ Card     │  │ Card     │            │
│  └──────────┘  └──────────┘            │
│                                         │
│  [Expired Cohorts] (collapsed)         │
└─────────────────────────────────────────┘
```

### Option C: Hybrid Dashboard (Best of Both)
**Pros**: Overview of all learning, dedicated cohort section
**Cons**: More complex layout

**Structure**:
- Main dashboard shows both courses and cohorts
- Cohorts section has enhanced cards with quick actions
- Clicking a cohort opens dedicated cohort dashboard

## Recommended: Enhanced Cohort Cards

### Card Components

```
┌─────────────────────────────────────────┐
│ [Cohort Badge] [Instructor Badge]        │
│                                          │
│  Cohort Title                            │
│  Description/Instructor name             │
│                                          │
│  ┌──────────────────────────────────┐  │
│  │ 🎥 Session in 2 days             │  │
│  │ 💬 3 new messages                │  │
│  │ 📊 45% complete                  │  │
│  └──────────────────────────────────┘  │
│                                          │
│  [Join Session] [View Messages]         │
│  [Continue Learning]                     │
│                                          │
│  Expires: Dec 31, 2024                  │
└─────────────────────────────────────────┘
```

### Status Indicators

1. **Upcoming Session Badge**
   - Shows next session date/time
   - "Join Now" button if session is starting soon
   - Countdown timer for sessions starting today

2. **Message Notification Badge**
   - Unread message count
   - "New" indicator for recent messages
   - Click to jump to message board

3. **Progress Indicator**
   - Visual progress bar
   - Percentage complete
   - Modules completed / total modules

## Cohort Detail Dashboard

When clicking on a cohort, show a dedicated dashboard with:

### Layout Structure

```
┌─────────────────────────────────────────┐
│  Cohort Header                           │
│  [Title] [Instructor] [Progress]        │
├─────────────────────────────────────────┤
│  Tabs: [Content] [Sessions] [Messages] │
├─────────────────────────────────────────┤
│  Quick Actions Bar:                     │
│  [Join Next Session] [View Messages]   │
│  [Continue Learning]                    │
├─────────────────────────────────────────┤
│  Tab Content Area                        │
│  (Content/Sessions/Messages)            │
└─────────────────────────────────────────┘
```

### Quick Actions Bar (Always Visible)

- **Join Next Session**: Direct link to upcoming Zoom/Teams session
- **View Messages**: Jump to message board, show unread count
- **Continue Learning**: Resume from last position
- **View Progress**: Open progress overview

### Content Tab
- Same as current learning interface
- Module navigation
- Content items (videos, quizzes, flashcards)

### Sessions Tab
- **Upcoming Sessions** (top priority)
  - Large cards with join buttons
  - Countdown timers
  - Session details
- **Past Sessions**
  - Recordings (Vimeo embeds)
  - Session notes
  - Collapsible section

### Messages Tab
- Message board interface
- Pinned messages at top
- Recent activity
- Search functionality
- Rich text editor for replies

## Mobile Considerations

- Stack cards vertically
- Swipeable tabs
- Bottom navigation for quick actions
- Collapsible sections for better space usage

## Accessibility

- Clear focus states
- Keyboard navigation
- Screen reader labels
- High contrast for status indicators
- Descriptive button text

## Implementation Priority

1. **Phase 1**: Enhanced cohort cards with quick actions
2. **Phase 2**: Separate Cohorts tab
3. **Phase 3**: Cohort detail dashboard with integrated features
4. **Phase 4**: Advanced features (progress tracking, member list)

