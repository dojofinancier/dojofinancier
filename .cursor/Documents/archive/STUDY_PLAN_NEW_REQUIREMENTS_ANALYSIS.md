# Study Plan New Requirements - Analysis & Clarification Questions

## Requirements Summary

### 1. Minimum Hours Per Week by Level
- **Beginners**: 8 hours minimum
- **Intermediate**: 7 hours minimum  
- **Advanced**: 6 hours minimum
- If user selects less → show warning + set to minimum

### 2. Minimum Weeks Before Exam
- Need at least **4 weeks**
- If 0-3 weeks → show warning, omit Phase 1, split evenly between Phase 2 and Phase 3

### 3. Phase 1 Structure (Per Module)
**Order:**
1. Lecture rapide (1 block, 30 min) - off platform
2. Video (2 blocks, 60 min)
3. Lecture lente (3 blocks, 90 min) - off platform
4. Notes (1 block, 30 min)
5. Quiz (1 block, 30 min)

**Total: 8 blocks = 4 hours per module**

### 4. Phase 2 Timing
- Starts **week 2** if ≥ 6 weeks before exam
- Otherwise starts **week 1**
- Finishes same time as Phase 3 (exam week)

### 5. Phase 3 Constraints
- Cannot start until Phase 1 complete
- Finishes exam week

### 6. Time Allocation
- **Until Phase 1 complete**: 80% Phase 1, 20% Phase 2
- **After Phase 1 complete**: 60% Phase 2, 40% Phase 3

### 7. Phase 1 Completion Deadline
- Must finish **before last 2 weeks** before exam
- If not possible → increase hours + show warning

### 8. Phase 3 Practice Exams
- One the **week after** finishing Phase 1
- One the **week before** exam
- Others spread evenly in between

### 9. Phase 2 Presentation
- Aggregate sessions
- Split equally between flashcards and activities
- Format: "X séances de flashcards (ou révision intelligente)"
- Format: "X séances de activités d'apprentissage (ou révision intelligente)"

### 10. Phase 3 Presentation
- Itemize practice exams (specific exam names)
- Aggregate quiz sessions: "X séances de quiz"
- Don't specify module for quizzes

### 11. Long Exam Dates
- If > 15 weeks → show warning suggesting 8-12 weeks
- User can modify or proceed

### 12. Plan du Jour
- Based on current week's tasks
- 4 sections: Session courte (1 block), Session longue (2 blocks), Session courte supplémentaire, Session longue supplémentaire
- Total: 6 blocks = 3 hours
- Phase 1: "Phase 1 - Étude Chapitre 4" (not specific activity)
- Skip modules marked as done

---

## Edge Cases & Clarification Questions

### A. Minimum Hours & Level Mapping

**Question 1:** How do the self-rating levels map to the minimum hours?
- Documentation mentions: `NOVICE`, `INTERMEDIATE`, `RETAKER`
- New requirements: `Beginners`, `Intermediate`, `Advanced`
- **Clarification needed:** What is the mapping?
  - NOVICE = Beginners (8 hours)?
  - INTERMEDIATE = Intermediate (7 hours)?
  - RETAKER = Advanced (6 hours)?

**Question 2:** What if user selects more than minimum?
- Example: Beginner selects 10 hours/week
- Should we use their selected amount or enforce minimum only?
- **Assumption:** Use their selected amount if ≥ minimum

**Question 3:** What if user changes level after plan creation?
- Should we regenerate plan?
- Should we show warning?
- **Clarification needed:** Behavior on level change

### B. Minimum Weeks (0-3 weeks)

**Question 4:** What exactly happens with 0-3 weeks?
- "Omit Phase 1" - does this mean:
  - No Phase 1 tasks at all?
  - Or Phase 1 tasks exist but not scheduled?
- "Split evenly between Phase 2 and Phase 3" - is this:
  - 50% Phase 2, 50% Phase 3?
  - Or based on available content?

**Question 5:** What if exam is in the past or today?
- 0 weeks could mean exam is today or past
- Should we show error or allow?
- **Clarification needed:** Handling of past/today exam dates

**Question 6:** With 0-3 weeks, can Phase 3 start immediately?
- Phase 3 normally requires Phase 1 completion
- But Phase 1 is omitted
- **Clarification needed:** Can Phase 3 start immediately if Phase 1 omitted?

### C. Phase 1 Structure

**Question 7:** "Lecture rapide" and "Lecture lente" are off-platform
- How do we track completion?
- Should they be in `DailyPlanEntry` with special task type?
- Or just shown in plan but not trackable?

**Question 8:** What if a module has no video/notes/quiz?
- Should we skip missing items?
- Or use placeholder blocks?
- **Clarification needed:** Handling missing content

**Question 9:** Phase 1 order is strict (Lecture rapide → Video → Lecture lente → Notes → Quiz)
- Should these be scheduled on separate days?
- Or can multiple items be on same day?
- **Clarification needed:** Scheduling granularity

**Question 10:** What if module has multiple videos/notes/quizzes?
- Should we schedule all of them?
- Or just one of each type?
- **Clarification needed:** Multiple content items per type

### D. Phase 2 Timing

**Question 11:** "Starts week 2 if ≥ 6 weeks, otherwise week 1"
- Does this mean:
  - If 6+ weeks: Phase 2 starts week 2 (Phase 1 gets week 1 exclusively)?
  - If < 6 weeks: Phase 2 starts week 1 (concurrent with Phase 1)?
- **Clarification needed:** Exact interpretation

**Question 12:** Phase 2 "finishes same time as Phase 3 (exam week)"
- Does this mean:
  - Phase 2 continues until exam week?
  - Or Phase 2 stops when Phase 3 starts?
- **Clarification needed:** Phase 2 end date

### E. Time Allocation

**Question 13:** "80% Phase 1, 20% Phase 2 until Phase 1 complete"
- Is this calculated:
  - Per week?
  - Across all weeks until Phase 1 complete?
- Example: 10 hours/week = 8 hours Phase 1, 2 hours Phase 2 per week?
- **Clarification needed:** Calculation method

**Question 14:** "60% Phase 2, 40% Phase 3 after Phase 1 complete"
- Is this:
  - Per week after Phase 1?
  - Or total remaining time?
- **Clarification needed:** Calculation method

**Question 15:** What if Phase 1 completes mid-week?
- Should we:
  - Switch allocation mid-week?
  - Wait until next week?
- **Clarification needed:** Mid-week completion handling

### F. Phase 1 Completion Deadline

**Question 16:** "Must finish before last 2 weeks"
- Does this mean:
  - Phase 1 must complete by end of "2 weeks before exam"?
  - Or Phase 1 must complete before "last 2 weeks" start?
- Example: Exam week 10 → Phase 1 must finish by end of week 8?
- **Clarification needed:** Exact deadline calculation

**Question 17:** "If not possible → increase hours + show warning"
- How do we calculate required hours?
- Should we:
  - Increase to minimum needed?
  - Or suggest a specific increase?
- **Clarification needed:** Hours increase calculation

**Question 18:** What if increasing hours still doesn't work?
- Example: 2 modules, 1 week until exam, 8 blocks needed
- Even with 24 hours/week, can't fit 8 blocks in 1 week?
- **Clarification needed:** Handling impossible scenarios

### G. Phase 3 Practice Exams

**Question 19:** "One the week after finishing Phase 1"
- If Phase 1 finishes mid-week, does "week after" mean:
  - The week containing the day after completion?
  - Or the next full week (Monday)?
- **Clarification needed:** Week calculation

**Question 20:** "One the week before exam"
- Does this mean:
  - The week that ends 1 week before exam?
  - Or the week that starts 1 week before exam?
- Example: Exam on Friday week 10 → practice exam in week 9?
- **Clarification needed:** Week before calculation

**Question 21:** "Others spread evenly in between"
- If 3 total practice exams:
  - One after Phase 1
  - One before exam
  - One in between?
- How do we calculate "evenly"?
- **Clarification needed:** Distribution algorithm

**Question 22:** What if there are more practice exams than available weeks?
- Example: 5 practice exams, 3 weeks between Phase 1 end and exam
- Should we:
  - Schedule multiple per week?
  - Or skip some?
- **Clarification needed:** Handling excess exams

### H. Phase 2 Presentation

**Question 23:** "Split equally between flashcards and activities"
- Is this:
  - 50% of Phase 2 blocks for flashcards, 50% for activities?
  - Or based on available content?
- **Clarification needed:** Split calculation

**Question 24:** "X séances de flashcards (ou révision intelligente)"
- Should we count:
  - Actual flashcard IDs in sessions?
  - Or number of review blocks?
- Example: 4 review blocks → "4 séances de flashcards"?
- **Clarification needed:** Session counting method

**Question 25:** What if there are no flashcards or activities?
- Should we:
  - Show 0 sessions?
  - Or skip Phase 2 entirely?
- **Clarification needed:** Empty content handling

### I. Phase 3 Presentation

**Question 26:** "Itemize practice exams"
- Should we show:
  - Exam name/title?
  - Or just "Examen blanc"?
- **Clarification needed:** Exam naming

**Question 27:** "Aggregate quiz sessions: X séances de quiz"
- Should we:
  - Count all quiz blocks?
  - Or group by week?
- **Clarification needed:** Aggregation method

**Question 28:** "Don't specify module for quizzes"
- Should we show:
  - "X séances de quiz" (generic)?
  - Or "X séances de quiz - Tous les modules"?
- **Clarification needed:** Format

### J. Long Exam Dates (>15 weeks)

**Question 29:** "Show warning suggesting 8-12 weeks"
- Should we:
  - Force them to change?
  - Or just warn and allow proceeding?
- **Clarification needed:** Enforcement vs suggestion

**Question 30:** If user proceeds with >15 weeks, how should plan work?
- Should we:
  - Slow down Phase 1 pace?
  - Add more review/practice?
- **Clarification needed:** Plan adaptation for long timelines

### K. Plan du Jour

**Question 31:** "Based on current week's tasks"
- Should we:
  - Show all tasks from current week?
  - Or only today's tasks?
- **Clarification needed:** Scope

**Question 32:** "4 sections: Session courte (1 block), Session longue (2 blocks), Session courte supplémentaire, Session longue supplémentaire"
- Total: 1 + 2 + 1 + 2 = 6 blocks = 3 hours
- Should these be:
  - Pre-filled with tasks from weekly plan?
  - Or empty slots to be filled?
- **Clarification needed:** Section population

**Question 33:** "Phase 1 - Étude Chapitre 4"
- Should we:
  - Show module title instead of "Chapitre 4"?
  - Or use module order number?
- **Clarification needed:** Naming convention

**Question 34:** "If module marked as done, skip to next one"
- What if all modules for the week are done?
- Should we:
  - Show empty sections?
  - Or show next week's tasks?
- **Clarification needed:** All modules done handling

**Question 35:** How do we distribute 6 blocks across weekly tasks?
- If week has 10 Phase 1 blocks, which 6 do we show?
- Should we:
  - Show first 6?
  - Or prioritize by order?
- **Clarification needed:** Task selection

### L. General Edge Cases

**Question 36:** What if user has no modules?
- Should we:
  - Show error?
  - Or allow empty plan?
- **Clarification needed:** Empty course handling

**Question 37:** What if user changes exam date after plan creation?
- Should we:
  - Regenerate plan automatically?
  - Or show warning to regenerate?
- **Clarification needed:** Plan regeneration trigger

**Question 38:** What if user changes study hours after plan creation?
- Should we:
  - Regenerate plan automatically?
  - Or show warning to regenerate?
- **Clarification needed:** Plan regeneration trigger

**Question 39:** What if Phase 1 completion takes longer than expected?
- Should we:
  - Adjust Phase 2/3 automatically?
  - Or show warning?
- **Clarification needed:** Dynamic adjustment

**Question 40:** What if there are no practice exams?
- Should Phase 3:
  - Only show quiz sessions?
  - Or be omitted entirely?
- **Clarification needed:** Empty Phase 3 handling

---

## Critical Clarifications Needed

### Priority 1 (Blocking Implementation)

1. **Level mapping** (Question 1)
2. **0-3 weeks behavior** (Question 4, 6)
3. **Phase 1 structure** (Question 7, 8, 9)
4. **Time allocation calculation** (Question 13, 14)
5. **Phase 1 deadline** (Question 16, 17)
6. **Practice exam scheduling** (Question 19, 20, 21)

### Priority 2 (Important for UX)

7. **Phase 2 timing** (Question 11, 12)
8. **Phase 2/3 presentation** (Question 23, 24, 26, 27)
9. **Plan du jour structure** (Question 31, 32, 35)

### Priority 3 (Edge Cases)

10. **Long exam dates** (Question 29, 30)
11. **Empty content** (Question 25, 40)
12. **Plan regeneration** (Question 37, 38)

---

## Recommended Implementation Order

1. **Phase 1:** Implement minimum hours, weeks validation, Phase 1 structure
2. **Phase 2:** Implement Phase 2 timing, allocation, presentation
3. **Phase 3:** Implement Phase 3 constraints, practice exam scheduling
4. **Plan du Jour:** Implement daily plan based on weekly plan
5. **Edge Cases:** Handle all edge cases and warnings

---

## Next Steps

Please answer the Priority 1 questions so we can proceed with implementation. The other questions can be answered as we implement, but Priority 1 questions are blocking.

