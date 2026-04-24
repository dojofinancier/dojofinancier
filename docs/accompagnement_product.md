# Product Brief — Accountability / Suivi Product for CIRE Students

## 1. Core Product Idea

Create a lightweight companion product for students already enrolled in the CIRE preparatory training.

The core purpose of the product is not to add more content, but to increase follow-through, consistency, and motivation through structured daily follow-up and personalized progression support.

This product should act as a guided layer on top of the existing self-study course by helping students:
- stay on track,
- know what to do next,
- remain engaged,
- and feel supported until exam day.

AI should be used primarily to personalize the experience, adapt routing, and automate communications at scale. The experience should remain structured, predictable, and operationally simple.

---

## 2. Positioning

### Main positioning
**Suivi et accompagnement personnalisé pour aider l’étudiant à rester constant et progresser jusqu’à l’examen.**

### Positioning idea
This is not tutoring and not a replacement for the course platform.  
It is a separate accountability and progression product designed to support execution.

### Value proposition
The student already has access to tools, content, and a study path.  
This product adds:
- structure,
- regular follow-up,
- personalized communication,
- progression visibility,
- and accountability.

### What the product should feel like
- simple
- reassuring
- motivating
- personalized
- structured
- not overly conversational
- not “chatbot-like”

AI should feel invisible and useful, not dominant.

---

## 3. MVP Scope

The MVP should focus on a small number of high-value features that create a strong feeling of guidance and momentum.

### Feature 1 — Onboarding Form

Create an onboarding flow that collects the minimum data required to personalize the experience.

#### Required inputs
- exam date
- available study hours per week
- current level / progression
- confidence level

#### Purpose
This information will be used to:
- estimate pace,
- generate weekly plans,
- adapt communications,
- and determine the student’s general profile and urgency level.

#### Notes
The onboarding experience should be fast, simple, and frictionless.

---

### Feature 2 — Weekly Personalized Email System

Transactional email uses **Sender.net** (`SENDER_API_TOKEN`, `SENDER_CHECKIN_FROM_*`) for check-ins and weekly recaps.

#### Email content may include
- weekly stats
- progression summary
- completed check-ins
- current advancement
- recommended focus for the week
- encouragement / reinforcement
- study tips
- onboarding videos or guidance content when relevant

#### Purpose
The weekly email acts as a structured summary and planning tool.  
It should reinforce the sense that the student is being followed and guided.

#### Notes
The weekly emails should be personalized, but not overly complex.  
They should use student data already stored in the system and be easy to generate consistently.

---

### Feature 3 — Daily Check-In System (Core MVP Feature)

This is the central feature of the product.

The system should send daily check-ins via:
- WhatsApp,
- SMS,
- or email

Final channel logic can be determined later, but the architecture should support multiple channels if possible.

#### Daily check-in content may include
- short MCQs
- open-ended questions
- feedback
- encouragement
- progression prompts
- reminders
- simple completion confirmations

#### Product logic
This should **not** behave like an open AI conversation.

Instead, the interaction model should be:
- structured,
- mostly linear,
- fairly predictable,
- and driven by predefined flows and decision logic.

AI should mainly function as a **smart router** that helps determine:
- which message to send next,
- which content block to use,
- how to classify the student’s answer,
- and how to redirect the student toward the appropriate next step.

#### Design principle
The communication flow should feel personal, but remain controlled and operationally reliable.

#### Key objective
Make the student feel that someone/something is checking in on them every day and helping them stay engaged.

---

### Feature 4 — Separate Progress Dashboard

Create a dashboard dedicated to this accountability product, separate from the main course dashboard.

#### The dashboard should display
- past MCQs
- student progression
- weekly plans
- historical follow-up data
- key stats linked to daily check-ins

#### Purpose
The dashboard should give the student a clear and motivating view of their consistency and progress.

It should act as the “home base” for the accountability product and complement the email/check-in system.

#### Notes
The dashboard does not need to be overly complex in the MVP.  
Priority should be given to clarity and usefulness rather than feature depth.

---

## 4. Product Principles

The product should follow these principles:

### Structured over open-ended
The experience should rely on controlled flows rather than freeform AI chat.

### Motivating over complex
The product should help the student keep going, not overwhelm them.

### Personalized over generic
Student data should shape pacing, messaging, and recommended focus.

### Lightweight over bloated
The MVP should remain simple enough to build quickly and test with real users.

### Complementary to existing course
This product is a support layer, not a replacement for the prep platform.

---

## 5. Role of AI

AI should be used selectively and pragmatically.

### AI should be used for
- routing students through predefined flows
- adapting messages based on answers
- generating personalized summaries
- classifying student responses
- supporting light personalization at scale

### AI should not be used for
- fully open-ended coaching conversations
- unpredictable freeform tutoring experiences
- complex autonomous behavior that reduces control

The desired model is:  
**AI as orchestration and personalization layer, not as open chat agent.**

---

## 6. Desired MVP Outcome

At MVP stage, the product should successfully deliver the following experience:

- the student signs up and completes onboarding,
- receives a personalized study rhythm,
- gets daily structured check-ins,
- receives weekly personalized recap emails,
- and can view progress in a dedicated dashboard.

If this works well, the student should feel:
- more consistent,
- more supported,
- more aware of their progress,
- and less alone in their preparation.

---

## 7. Open Items / To Be Defined Later

- final product name
- final communication channels for daily check-ins
- detailed routing logic for check-in flows
- exact scoring / progression rules
- visual design and branding
- future premium features beyond MVP
