# Study Plan Algorithm - Clarifications & Questions

## Confirmed Requirements

### 1. Block Calculations
- ✅ Videos = 2 blocks
- ✅ Phase 1 mini-quiz = 1 block  
- ✅ Notes = 1 block

### 2. Mock Exams
- ✅ All mock exams must be completed before exam date
- ✅ Last mock exam scheduled in the week before exam (e.g., exam week 10 → last mock in week 9)
- ✅ Other mock exams distributed earlier

### 3. Module Completion
- ✅ All modules must be learned (no optional modules)
- ✅ All short quizzes from phase 1 must be scheduled

### 4. Phase Dependencies
- ✅ Phase 3 cannot start until Phase 1 is complete
- ✅ Phase 1 and Phase 2 can proceed concurrently
- ✅ Phase 2 and Phase 3 can proceed concurrently

### 5. Minimum Study Time
- ✅ Minimum = Phase 1 (4 blocks per module) + Phase 3 (4 blocks per mock exam)
- ✅ Example: 12 modules + 2 mocks = 56 blocks minimum
- ✅ Warning if student doesn't meet minimum

### 6. Phase 1 Pace
- ✅ Default: 3 modules per week
- ✅ Minimum: 1 module per week
- ✅ Maximum: 6 modules per week

### 7. Phase 2 Unlocking
- ✅ When module is learned in Phase 1, it's unlocked for Phase 2
- ✅ Review should be scheduled for learned modules

### 8. Content Completion
- ✅ Not all flashcards, activities, and question banks need to be completed
- ✅ Prioritization: 
   - Coverage (all modules covered)
   - Difficulty (difficult flashcards, activities from failed quizzes)

---

## Questions for Clarification - ✅ ALL ANSWERED

### ✅ Answers Summary

1. **Phase 1 Pace**: Default pace (3/week) if enough time, closer to max (6/week) if exam soon, closer to min (1/week) if exam far. Pace is algorithm-determined, not user-selected.

2. **Mock Exam Distribution**: Option C - First mock after Phase 1 completion, second mock 2 weeks before exam, last mock 1 week before.

3. **Phase 1 Block Calculation**: Use actual content calculation, but most modules will have 1 video, 1 notes, 1 quiz.

4. **Phase 2 Review Scheduling**: Option B - Based on spaced repetition intervals (1d, 4d, 10d, 21d after learning).

5. **Difficult Flashcards & Failed Quiz**:
   - Difficult flashcards: Option A (self-rating from review sessions)
   - Failed quiz: Option B (score < 70%)

6. **Phase 2 Coverage**: Option C - Minimum from each module (e.g., 10 flashcards + 5 activities per module), regardless of content amount.

7. **Question Bank Distribution**: Option B - More practice closer to exam.

8. **Minimum Study Time Warning**: Option D - All of the above (plan generation, settings update, continuously if behind).

9. **Phase 1 Completion Detection**: Option A - All modules marked as "learned". If student tries Phase 3 without completing Phase 1, show clear message to mark modules as completed.

10. **Week 1 Start Date**: Option B - Week 1 starts Monday of week containing start date, extends to ensure full week.

11. **Phase 2 Review Frequency**: By default, all review sessions should include all learned modules. If modules 1-4 are learned, review sessions include items from 1-4. Smart review will determine frequency (recent modules more often, but still include earlier modules). Study plan will say "review modules 1-4" but student can use smart review or manually select.

12. **Phase 1 Module Ordering**: Option A - Sequential by module.order.

---

## Questions for Clarification (Original)

### Question 1: Phase 1 Pace with Many Modules

**Scenario**: 12 modules, 8 weeks until exam

- **Default pace**: 3 modules/week = 4 weeks to complete all modules ✅
- **Minimum pace**: 1 module/week = 12 weeks (would exceed exam date) ❌

**Question**: 
- If minimum pace (1 module/week) would exceed exam date, should we:
  - **Option A**: Ignore minimum and use faster pace to fit in time?
  - **Option B**: Show warning that exam date is too soon?
  - **Option C**: Use maximum pace (6 modules/week) to ensure completion?

**Recommendation**: Option B - Show warning if exam date is too soon for minimum pace.

---

### Question 2: Mock Exam Distribution

**Scenario**: 3 mock exams, exam in week 10

- Last mock: Week 9 ✅
- Other 2 mocks: When should they be scheduled?

**Options**:
- **Option A**: Evenly distributed (e.g., weeks 7, 8, 9)
- **Option B**: First mock earlier (e.g., weeks 5, 8, 9)
- **Option C**: Based on Phase 1 completion (first mock after Phase 1, second mock 2 weeks before exam, last mock 1 week before)

**Question**: Which distribution strategy should we use?

**Recommendation**: Option C - First mock after Phase 1 completion, then space them leading up to exam.

---

### Question 3: Phase 1 Block Calculation

**You said**: "Phase 1 (4 blocks per module)" for minimum calculation

**But also**: Videos = 2 blocks, quiz = 1 block, notes = 1 block

**Question**: 
- Is "4 blocks per module" a fixed minimum regardless of actual content?
- Or should we calculate: `(videos × 2) + (quizzes × 1) + (notes × 1)` per module?
- If a module has 2 videos, 1 quiz, 1 note = 6 blocks, does that count as 4 or 6 for minimum?

**Recommendation**: Use actual content calculation, but ensure minimum of 4 blocks per module.

---

### Question 4: Phase 2 Review Scheduling

**Scenario**: Student learns Module 1 in Week 1, Module 2 in Week 2

**Question**: 
- When should review for Module 1 be scheduled?
  - **Option A**: Immediately after learning (Week 1 or Week 2)
  - **Option B**: Based on spaced repetition intervals (e.g., 1 day, 4 days, 10 days after learning)
  - **Option C**: Batch reviews weekly (e.g., review all learned modules at end of week)

**Recommendation**: Option B - Use spaced repetition intervals (1d, 4d, 10d) after module is learned.

---

### Question 5: Phase 2 Prioritization Logic

**You said**: Prioritize "difficult flashcards" and "activities from modules with failed quiz/activities"

**Questions**:
- How do we identify "difficult flashcards"?
  - **Option A**: Based on user's self-rating during review (EASY/MEDIUM/HARD)
  - **Option B**: Based on review history (cards reviewed multiple times = difficult)
  - **Option C**: Admin can mark flashcards as "difficult"
  
- How do we identify "activities from modules with failed quiz"?
  - **Option A**: If quiz score < passing score
  - **Option B**: If quiz score < 70% (or custom threshold)
  - **Option C**: If any question in quiz was answered incorrectly

**Recommendation**: 
- Difficult flashcards: Option A (self-rating from review sessions)
- Failed quiz: Option B (score < passing score)

---

### Question 6: Phase 2 Coverage Priority

**You said**: "Prioritize coverage (all modules covered)"

**Question**: 
- Does this mean we should ensure at least X flashcards/activities from EACH module are reviewed?
- Or just ensure all modules have some review scheduled (even if not all content)?

**Example**: 
- Module 1: 50 flashcards, 20 activities
- Module 2: 30 flashcards, 15 activities
- Not enough time for all

**Should we**:
- **Option A**: Review 20 flashcards from Module 1, 20 from Module 2 (equal distribution)
- **Option B**: Review proportionally (more from Module 1 since it has more content)
- **Option C**: Review minimum from each (e.g., 10 flashcards + 5 activities per module)

**Recommendation**: Option C - Ensure minimum coverage per module (e.g., 10 flashcards + 5 activities), then fill remaining time with difficult/high-priority items.

---

### Question 7: Phase 3 Question Bank Distribution

**You said**: "Not all question banks have to be completed"

**Question**:
- How should we distribute question bank practice?
  - **Option A**: Evenly across available weeks
  - **Option B**: More practice in weeks closer to exam
  - **Option C**: Focus on modules with lower quiz scores
  - **Option D**: Random selection from question banks

**Recommendation**: Option B - More practice closer to exam, with focus on weak areas.

---

### Question 8: Minimum Study Time Warning

**You said**: "Warning should be given if they don't meet the minimum standard"

**Question**:
- When should this warning appear?
  - **Option A**: When generating initial plan (if blocks available < minimum required)
  - **Option B**: When user updates study hours (if new hours don't meet minimum)
  - **Option C**: Continuously displayed if behind schedule
  - **Option D**: All of the above

**Recommendation**: Option D - Check at plan generation, on settings update, and show indicator if behind.

---

### Question 9: Phase 1 Completion Detection

**You said**: "Phase 3 cannot start if Phase 1 is not completed"

**Question**:
- How do we detect Phase 1 completion?
  - **Option A**: All modules marked as "learned" (via "Mark as learned" button)
  - **Option B**: All modules have completed quizzes
  - **Option C**: All modules have watched all videos + completed quizzes
  - **Option D**: Combination of above

**Recommendation**: Option A - All modules marked as "learned" (this is the explicit completion signal).

---

### Question 10: Week 1 Start Date

**You said**: "Week 1 should include at least a full week so if the student starts on a Wednesday November 26, he will be at week one until Sunday December 7"

**Question**:
- If student starts on Wednesday Nov 26, should Week 1 be:
  - **Option A**: Mon Nov 24 - Sun Dec 1 (includes start date, but starts before student started)
  - **Option B**: Mon Nov 24 - Sun Dec 7 (full week starting Monday before, ending 2 weeks later)
  - **Option C**: Mon Dec 1 - Sun Dec 7 (next full week after start)

**Based on your example** (Week 1 until Sunday Dec 7), it seems like **Option B** - Week 1 starts on the Monday of the week containing the start date, and extends to ensure it's a full week.

**Confirmation needed**: Is this correct?

---

### Question 11: Phase 2 Review Frequency

**You said**: "Every time a student finishes a module in phase 1, it is unlocked for phase 2"

**Question**:
- How many review sessions should be scheduled per module?
  - **Option A**: Fixed number (e.g., 2-3 sessions per module)
  - **Option B**: Based on spaced repetition schedule (e.g., 1d, 4d, 10d, 21d after learning)
  - **Option C**: Based on available time (distribute review blocks across learned modules)

**Recommendation**: Option B - Use spaced repetition intervals, but ensure minimum coverage.

---

### Question 12: Phase 1 Module Ordering

**Question**:
- Should modules always be learned in order (Module 1, then 2, then 3...)?
- Or can the algorithm reorder based on:
  - **Option A**: Always sequential (1, 2, 3...)
  - **Option B**: Based on exam weight (if modules have examWeight field)
  - **Option C**: Based on dependencies (if some modules depend on others)

**Recommendation**: Option A - Sequential by module.order, unless dependencies exist.

---

## Algorithm Flow Summary (Based on Clarifications)

### Phase 1: Learn
1. Calculate blocks per module: `(videos × 2) + (quizzes × 1) + (notes × 1)`
2. Distribute modules across weeks:
   - Default: 3 modules/week
   - Minimum: 1 module/week (warn if insufficient time)
   - Maximum: 6 modules/week
3. Schedule all modules sequentially (by order)
4. When module is learned → unlock for Phase 2

### Phase 2: Review (Concurrent with Phase 1)
1. For each learned module, schedule review sessions:
   - Use spaced repetition intervals (1d, 4d, 10d, 21d after learning)
   - Prioritize: coverage (all modules) + difficulty (difficult items)
2. Distribute flashcards and activities:
   - Ensure minimum per module (e.g., 10 flashcards + 5 activities)
   - Then prioritize difficult items
3. Continue until exam date

### Phase 3: Practice (After Phase 1 Complete)
1. Schedule all mock exams:
   - Last mock: Week before exam
   - Other mocks: Distributed earlier (after Phase 1 completion)
2. Distribute question bank practice:
   - More practice closer to exam
   - Focus on weak areas
3. Not all question banks need to be completed

### Minimum Study Time Check
- Calculate: `(modules × 4) + (mockExams × 4)`
- Warn if `blocksAvailable < minimumRequired`
- Show warning at plan generation and if behind schedule

---

## Implementation Priority

1. **Critical**: Phase dependencies, minimum study time, block calculations
2. **Important**: Phase 1 pace constraints, Phase 2 unlocking, mock exam scheduling
3. **Nice to have**: Advanced prioritization (difficulty, failed quizzes)

---

Please confirm/clarify the questions above so I can implement the algorithm correctly!

