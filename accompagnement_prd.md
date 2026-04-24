# PRD — Accompagnement ERCI
**Version:** MVP  
**Status:** Draft  
**Working name:** Accompagnement ERCI  
**Scope:** Multi-course accountability and progression companion product integrated with the existing student platform

---

# 1. Product Summary

## 1.1 Core product idea
Accompagnement ERCI is a guided accountability and progression layer built on top of existing self-study prep courses.

Its role is not to replace the course platform or add more passive content. Its purpose is to improve:
- consistency,
- follow-through,
- progression visibility,
- and student support.

The product should deliver structured daily and weekly check-ins, personalized practice, and progression tracking using a combination of:
- rules-based orchestration,
- structured templates,
- and limited AI for classification and summaries.

This system must be course-agnostic and work for any supported course as long as the required question bank exists in Supabase.

---

## 1.2 Positioning
**Suivi et accompagnement personnalisé** pour aider l’étudiant à rester constant, progresser et se préparer jusqu’à l’examen.

The product should feel:
- simple,
- reassuring,
- motivating,
- personalized,
- structured,
- and not overly conversational.

AI should remain mostly invisible and act as a controlled orchestration layer rather than an open tutoring chatbot.

---

# 2. Product Scope

## 2.1 Supported courses
The MVP is multi-course by design.

Initial courses may include:
- NEGP
- ERCI
- others later

All logic must work for any course, provided that the Supabase database contains the necessary questions and chapter metadata.

---

## 2.2 Question bank sources
The system will pull from the following Supabase tables:

- `adaptive_mcq` → multiple-choice questions
- `adaptive_oeq` → open-ended questions

Questions must be tagged so they can be selected by:
- course
- chapter
- topic
- difficulty
- and other routing criteria

---

# 3. UX / UI Principles

## 3.1 Daily interaction model
Daily check-ins must be **message-first** and **low-friction**.

Students choose a preferred delivery medium:
- email
- SMS
- WhatsApp

The system sends a message containing:
- a short context line
- and a secure link to a **no-login daily check-in page**

Students should **not** be required to log in for daily check-ins.

---

## 3.2 Check-in completion model
The no-login check-in page is the primary answer surface for daily and weekly check-ins.

This page should:
- be optimized for mobile
- contain structured answer inputs
- allow the system to capture cleaner data than reply-by-message
- show instant results where applicable
- show confirmation + feedback + next step after submission

---

## 3.3 Dashboard model
The accountability product must also have a **separate dashboard section** integrated into the existing student platform.

This is not the primary daily interaction space. It is the hub for:
- past questions
- results
- weekly plans
- progress tracking
- streaks / consistency

Unlike the daily check-in page, this dashboard will use **normal authenticated login** as part of the existing student area.

---

# 4. Channels and Delivery

## 4.1 Supported channels in MVP
All three channels are in scope:
- Email
- SMS
- WhatsApp

---

## 4.2 Providers
- SMS: Twilio
- WhatsApp: provider TBD
- Email: Sender.net and MailerSend must both remain viable options at this stage

The architecture should be channel-agnostic enough to support all three, while preserving the same underlying check-in logic.

---

## 4.3 Send time
Check-ins are sent according to an admin-defined send time.

### MVP default:
- **7:00 AM Eastern Time**

Students do not choose their own send time in MVP.

---

# 5. Onboarding Requirements

## 5.1 Purpose
The onboarding flow collects the minimum data required to personalize check-ins and weekly planning.

---

## 5.2 Required onboarding inputs
- selected course
- exam date
- available study hours per week
- preferred delivery medium:
  - email
  - SMS
  - WhatsApp
- chapter-by-chapter self-reported status

---

## 5.3 Chapter self-assessment
The onboarding form must pull the list of chapters for the selected course.

For each chapter, the student selects one of four statuses:
- not started
- read but low confidence
- read and somewhat confident
- read and confident

Exact wording may change, but this is the required structure.

This chapter-level self-assessment replaces:
- a general confidence field
- a general advancement field

---

## 5.4 Functional use of onboarding data
Onboarding data is used to:
- identify completed vs incomplete chapters
- estimate current progression
- identify low-confidence chapters
- influence question selection
- influence weak-area detection
- influence weekly plan creation

---

# 6. Check-in Types and Cadence

## 6.1 Weekly schedule
### Light check-ins:
- Monday
- Tuesday
- Wednesday
- Friday
- Saturday

### Mid-week checkpoint:
- Thursday

### Weekly quiz / review / plan:
- Sunday

This cadence is fixed for MVP.

---

## 6.2 Missed-day logic
If a student does not respond within **24 hours** of a sent check-in:
- the next scheduled check-in is replaced by the missed-day accountability version

It is **not** sent as an additional message.

---

# 7. Check-in Formats

## 7.1 Light day check-in
Content:
- short context line
- 1 MCQ
- 1 short open-ended question
- 1 next step

---

## 7.2 Mid-week checkpoint
Content:
- short context line
- 5 MCQs
- 1 short open-ended question
- 1 next step

---

## 7.3 Missed prior day accountability check-in
Content:
- missed-response acknowledgment
- 1 MCQ
- “Will you complete today’s study block?” yes/no
- 1 next step

This format replaces the normal scheduled check-in after a missed day.

---

## 7.4 Weekly quiz, review and plan
Content:
- 20 MCQs
- weekly review
- next week plan

The weekly review must include:
- score
- response rate / consistency
- weak areas
- chapters/topics covered
- next week plan

---

# 8. Question Selection Logic

## 8.1 General principles
Question selection must be rules-based and predictable.

The system should not rely on open-ended generative selection logic.

Selection must prioritize:
- relevance
- variety
- low repetition
- weak-area reinforcement
- current or recent study context

---

## 8.2 Question source tables
- MCQs come from `adaptive_mcq`
- Open-ended questions come from `adaptive_oeq`

---

## 8.3 Core selection filters
Questions must be selectable using at least:
- course
- chapter
- topic
- difficulty

The product assumes these tables contain sufficient tagging to support routing.

---

## 8.4 Topic priority logic
For daily and weekly check-ins, question selection should prioritize in this order:

1. planned or currently relevant chapters/topics
2. weak areas
3. recent chapters/topics
4. broader reinforcement if needed

---

## 8.5 Weekly quiz weighting
The weekly 20-MCQ quiz must use a **mixed with weighted priority** model:
- more weight for recent topics
- more weight for weak areas

It should not be purely random.

---

## 8.6 Weak area definition
Weak areas are identified through a combination of:
- incorrect answers
- self-reported low confidence

Both should influence routing and reinforcement.

---

# 9. Contextual Messaging Strategy

## 9.1 Core approach
Contextual messages should be built using:
- predefined templates
- structured variables
- AI only where needed for classification and summaries

The system should avoid open freeform AI-generated day-to-day messaging.

---

## 9.2 Context line types
Examples of contextual categories:
- normal progress
- weak area reinforcement
- missed-response acknowledgment
- plan reminder
- exam urgency

Each check-in should use one appropriate context line.

---

## 9.3 Recommended approach
For MVP:
- context lines should come from predefined template libraries
- AI may support classification and summary generation
- AI should not improvise uncontrolled coaching text

---

# 10. AI Usage

## 10.1 Allowed AI roles
AI is allowed for:
- open-ended answer classification
- generation of weekly review summaries
- limited structured feedback generation

---

## 10.2 Not allowed / not desired in MVP
AI should not be used as:
- an open chat tutor
- a freeform conversational coach
- a primary message composer without template constraints

---

## 10.3 Open-ended answer evaluation
Open-ended answers should be classified by AI into structured categories such as:
- correct
- partially correct
- incorrect
- unclear

Exact labels can be finalized later, but the architecture should support structured classification.

---

## 10.4 Weekly summaries
Weekly summaries may be AI-generated, but only from structured performance data and within a constrained output format.

---

# 11. Immediate Response UX

## 11.1 After daily submission
After submitting a check-in, the student must see:
- confirmation
- feedback
- next step

---

## 11.2 MCQ correction
MCQ feedback should be **instant**.

The student should see:
- whether the answer is correct
- short feedback/explanation
- and the next step

---

## 11.3 Open-ended feedback
Open-ended feedback should rely on AI classification and should be kept concise and structured.

---

# 12. Student Dashboard Requirements

## 12.1 Dashboard placement
The accountability dashboard must be integrated into the existing student platform as a **new tab / section**.

---

## 12.2 Dashboard features in MVP
The dashboard must include:
- past questions
- results
- weekly plans
- streak / consistency tracking

This is the minimum required scope.

---

## 12.3 Dashboard role
The dashboard is not the primary daily response space.

It is a support layer for:
- reviewing history
- understanding progress
- seeing plans
- and maintaining motivation through visibility

---

# 13. Integration Requirements

## 13.1 Existing platform integration
The product must be integrated with the existing student platform.

It should not be a fully separate standalone product in MVP.

---

## 13.2 Course integration
The accountability system should work with the existing course architecture and student records.

It must support:
- multiple courses
- chapter metadata
- course-linked onboarding
- future scaling beyond ERCI

---

# 14. Functional Logic Flows

## 14.1 Daily sending flow
1. Determine student’s selected channel
2. Determine today’s scheduled check-in type
3. Check whether prior day was missed
4. If missed within rule threshold, replace today’s check-in with missed-day format
5. Select questions from Supabase based on rules
6. Select context template
7. Generate secure no-login check-in link
8. Send message through selected channel

---

## 14.2 Daily response flow
1. Student opens no-login check-in page
2. Student answers questions
3. System stores responses
4. System evaluates MCQs instantly
5. System classifies open-ended answer using AI
6. System shows confirmation + feedback + next step
7. System updates progress/state data

---

## 14.3 Weekly quiz/review flow
1. Generate weekly 20-MCQ quiz with weighted priority
2. Student completes weekly quiz via no-login page
3. System calculates score and topic-level performance
4. System identifies weak areas and covered areas
5. System generates weekly review summary
6. System generates next week plan
7. Weekly summary is visible in dashboard and may also be sent by email

---

## 14.4 Missed-day flow
1. Student does not respond within 24 hours
2. Student is marked as missed for that check-in
3. Next scheduled check-in is replaced by accountability format
4. Message acknowledges missed response and redirects toward re-engagement

---

# 15. Data Model Requirements

## 15.1 Existing question tables
The system must consume:
- `adaptive_mcq`
- `adaptive_oeq`

These tables must support question selection by:
- course
- chapter
- topic
- difficulty

---

## 15.2 Student state requirements
The system must store or access enough state to support routing, including at minimum:
- student ID
- selected course
- exam date
- study hours per week
- preferred channel
- chapter self-assessment statuses
- last sent check-in timestamp
- last completed check-in timestamp
- missed check-in status
- weak areas
- past results
- streak / consistency
- weekly plan data

---

## 15.3 Check-in history
The system should maintain a history of:
- sent check-ins
- completed check-ins
- questions served
- student answers
- results
- classifications
- next-step recommendations

This is necessary for:
- avoiding repetition
- tracking performance
- generating weekly summaries
- showing dashboard history

---

# 16. Non-Goals for MVP

The following are not primary goals for MVP:
- open-ended chatbot-style coaching
- student-controlled custom send times
- fully AI-generated conversational accountability
- standalone app separate from current platform
- login-required daily check-ins
- manual grading workflows as core logic

---

# 17. Success Criteria for MVP

The MVP should successfully enable the following end-to-end experience:

1. Student enrolls and completes onboarding
2. Student selects preferred medium
3. System sends scheduled check-ins automatically
4. Student completes check-ins through secure no-login pages
5. Student receives instant MCQ feedback and structured follow-up
6. System tracks performance and weak areas
7. Student receives weekly review and next-week plan
8. Student can view past results, plans, and streaks inside the existing dashboard

If successful, the product should leave students feeling:
- more supported
- more consistent
- more aware of progress
- less likely to drift in self-study

---

# 18. Open Items / To Finalize Later

- final product naming
- exact WhatsApp provider
- exact AI classification labels and prompt specifications
- exact template library wording
- exact dashboard visual design
- exact repetition-avoidance logic
- exact chapter/topic metadata structure in Supabase
- final choice between Sender.net and MailerSend for first implementation