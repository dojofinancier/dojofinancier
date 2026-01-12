# Study Plan Implementation Specification

## Answers Summary

### A. Minimum Hours & Level Mapping
- **NOVICE** = 8 hours minimum
- **INTERMEDIATE** = 7 hours minimum
- **RETAKER** = NOVICE (8 hours minimum)
- Use selected hours (no maximum)
- If user selects less than minimum → show warning + set to minimum
- If user changes level → regenerate plan

### B. Minimum Weeks (0-3 weeks)
- **0-3 weeks before exam:**
  - No Phase 1 tasks at all
  - 50% Phase 2, 50% Phase 3
  - Phase 3 can start immediately (Phase 1 omitted)
- **Past/today exam date:** Show error, ask to select another date
- **< 4 weeks:** Phase 1 omitted, 50/50 Phase 2/3

### C. Phase 1 Structure
- **Order per module:**
  1. Lecture rapide (1 block, 30 min) - off platform, not trackable
  2. Video (2 blocks, 60 min)
  3. Lecture lente (3 blocks, 90 min) - off platform, not trackable
  4. Notes (1 block, 30 min)
  5. Quiz (1 block, 30 min)
- **Total: 8 blocks = 4 hours per module**
- **Off-platform items:** Shown in plan but not trackable (no DailyPlanEntry)
- **Missing content:** Skip if no content
- **Multiple items:** Can be on same day (weekly plan doesn't show granularity)
- **Multiple content:** Schedule all videos/notes/quizzes

### D. Phase 2 Timing
- **≥ 6 weeks before exam:** Phase 2 starts week 2
- **< 6 weeks (1-5 weeks):** Phase 2 starts week 1
- **End date:** Phase 2 continues until exam week (concurrent with Phase 3)

### E. Time Allocation
- **Until Phase 1 complete:** 80% Phase 1, 20% Phase 2 (per week)
- **After Phase 1 complete:** 60% Phase 2, 40% Phase 3 (per week)
- **Mid-week completion:** Wait until next week to switch allocation

### F. Phase 1 Completion Deadline
- **Must finish by end of week that is 2 weeks before exam**
- Example: Exam week 10 → Phase 1 must finish by end of week 8
- **If not possible:** Increase hours to minimum needed + show warning
- **Warning example:** "You need 24 hours/week to complete Phase 1. Consider changing your exam date."
- **Calculation:** 
  - If 4 weeks until exam, need to finish Phase 1 in 2 weeks
  - 12 modules × 4 hours = 48 hours total
  - 48 hours ÷ 2 weeks = 24 hours/week for Phase 1
  - With 80% allocation: 24 hours ÷ 0.8 = 30 hours/week total needed

### G. Phase 3 Practice Exams
- **First exam:** Week after Phase 1 completion (next full week, Monday)
- **Last exam:** Week before exam (if exam in week 10, last exam in week 9)
- **Others:** Spread evenly in between (approximately same spacing)
- **Excess exams:** Schedule multiple per week if needed
- **No exams:** Only show quiz sessions

### H. Phase 2 Presentation
- **Split:** 50% flashcards, 50% activities (of Phase 2 blocks)
- **Format:** "X séances de flashcards (ou révision intelligente)"
- **Format:** "X séances de activités d'apprentissage (ou révision intelligente)"
- **Counting:** Number of review blocks (not actual flashcard count)
- **No content:** Skip Phase 2 if no flashcards/activities

### I. Phase 3 Presentation
- **Practice exams:** Itemize with exam name/title
- **Quiz sessions:** Aggregate by week: "X séances de quiz" (generic, no module)
- **Grouping:** Group quiz sessions by week

### J. Long Exam Dates (>15 weeks)
- **Warning:** Suggest 8-12 weeks for best results
- **Allow proceeding:** User can modify or proceed
- **If proceeding:** Add more review and practice (slow down pace)

### K. Plan du Jour
- **Based on:** Current week's tasks
- **Phase 1:** Show only one module: "Phase 1 - Étude [module title]"
- **Phase 2:** Show all Phase 2 tasks for the week
- **Sections:** Pre-filled with tasks from weekly plan
  - Session courte (1 block)
  - Session longue (2 blocks)
  - Session courte supplémentaire (1 block)
  - Session longue supplémentaire (2 blocks)
  - Total: 6 blocks = 3 hours
- **Task selection:** Show first 6 blocks from weekly plan
- **Module done:** Skip to next module if current module marked as done
- **All modules done:** Show Phase 2 activities according to plan

### L. General
- **No modules:** Allow empty plan
- **Exam date change:** Regenerate plan
- **Study hours change:** Regenerate plan
- **Phase 1 takes longer:** Show warning + adjust Phase 2/3 automatically
- **No practice exams:** Only show quiz sessions in Phase 3

---

## Implementation Algorithm

### Step 1: Validation & Setup

```typescript
function validateAndSetup(config: StudyPlanConfig) {
  // 1. Check exam date
  const weeksUntilExam = getWeeksUntilExam(config.examDate, config.planCreatedAt);
  
  if (weeksUntilExam <= 0) {
    return { error: "Exam date must be in the future" };
  }
  
  // 2. Check minimum weeks
  if (weeksUntilExam < 4) {
    return { 
      omitPhase1: true,
      phase2Allocation: 0.5,
      phase3Allocation: 0.5
    };
  }
  
  // 3. Check minimum hours
  const minHours = config.selfRating === "INTERMEDIATE" ? 7 : 8;
  if (config.studyHoursPerWeek < minHours) {
    return {
      warning: `Minimum ${minHours} hours/week required for ${config.selfRating}`,
      adjustedHours: minHours
    };
  }
  
  // 4. Check long exam date
  if (weeksUntilExam > 15) {
    return {
      warning: "Consider 8-12 weeks for best results"
    };
  }
  
  return { valid: true };
}
```

### Step 2: Calculate Phase 1 Requirements

```typescript
function calculatePhase1Requirements(
  modules: Module[],
  weeksUntilExam: number,
  studyHoursPerWeek: number
) {
  const totalModules = modules.length;
  const blocksPerModule = 8; // Lecture rapide (1) + Video (2) + Lecture lente (3) + Notes (1) + Quiz (1)
  const totalPhase1Blocks = totalModules * blocksPerModule;
  
  // Phase 1 must finish by end of week that is 2 weeks before exam
  const weeksForPhase1 = weeksUntilExam - 2;
  
  if (weeksForPhase1 <= 0) {
    return { error: "Not enough time for Phase 1" };
  }
  
  // Calculate required hours per week for Phase 1
  // 80% allocation to Phase 1
  const phase1BlocksPerWeek = totalPhase1Blocks / weeksForPhase1;
  const phase1HoursPerWeek = phase1BlocksPerWeek / 2; // 1 block = 30 min = 0.5 hours
  const totalHoursPerWeekNeeded = phase1HoursPerWeek / 0.8; // 80% allocation
  
  if (totalHoursPerWeekNeeded > studyHoursPerWeek) {
    return {
      warning: `You need ${Math.ceil(totalHoursPerWeekNeeded)} hours/week to complete Phase 1`,
      requiredHours: Math.ceil(totalHoursPerWeekNeeded),
      suggestChangeExamDate: true
    };
  }
  
  return {
    totalPhase1Blocks,
    weeksForPhase1,
    phase1BlocksPerWeek,
    phase2BlocksPerWeek: (studyHoursPerWeek * 2 * 0.2) // 20% of blocks
  };
}
```

### Step 3: Generate Phase 1 Blocks

```typescript
function generatePhase1Blocks(
  modules: Module[],
  week1StartDate: Date,
  weeksForPhase1: number,
  phase1BlocksPerWeek: number,
  phase2BlocksPerWeek: number,
  preferredDays: number[]
): EnhancedStudyBlock[] {
  const blocks: EnhancedStudyBlock[] = [];
  let currentWeek = 1;
  let moduleIndex = 0;
  
  // Distribute modules across weeks
  const modulesPerWeek = Math.ceil(modules.length / weeksForPhase1);
  
  while (moduleIndex < modules.length && currentWeek <= weeksForPhase1) {
    const weekStart = getWeekStart(week1StartDate, currentWeek);
    const modulesThisWeek = modules.slice(
      moduleIndex,
      Math.min(moduleIndex + modulesPerWeek, modules.length)
    );
    
    // Calculate blocks for this week
    const phase1BlocksThisWeek = Math.min(
      phase1BlocksPerWeek,
      modulesThisWeek.length * 8 // 8 blocks per module
    );
    
    // Schedule modules
    for (const module of modulesThisWeek) {
      // Get module content
      const videos = module.contentItems.filter(c => c.contentType === "VIDEO");
      const notes = module.contentItems.filter(c => c.contentType === "NOTE");
      const quizzes = module.contentItems.filter(c => 
        c.contentType === "QUIZ" && !c.quiz?.isMockExam
      );
      
      // Schedule in order:
      // 1. Lecture rapide (1 block) - off platform, not trackable (just in weekly plan)
      // 2. Video (2 blocks each)
      for (const video of videos) {
        blocks.push({
          date: getPreferredDate(weekStart, preferredDays),
          taskType: TaskType.LEARN,
          targetModuleId: module.id,
          targetContentItemId: video.id,
          estimatedBlocks: 2,
          order: 0
        });
      }
      
      // 3. Lecture lente (3 blocks) - off platform, not trackable (just in weekly plan)
      // 4. Notes (1 block each)
      for (const note of notes) {
        blocks.push({
          date: getPreferredDate(weekStart, preferredDays),
          taskType: TaskType.LEARN,
          targetModuleId: module.id,
          targetContentItemId: note.id,
          estimatedBlocks: 1,
          order: 0
        });
      }
      
      // 5. Quiz (1 block each)
      for (const quiz of quizzes) {
        blocks.push({
          date: getPreferredDate(weekStart, preferredDays),
          taskType: TaskType.LEARN,
          targetModuleId: module.id,
          targetQuizId: quiz.quiz?.id,
          estimatedBlocks: 1,
          order: 0
        });
      }
    }
    
    moduleIndex += modulesThisWeek.length;
    currentWeek++;
  }
  
  return blocks;
}
```

### Step 4: Generate Phase 2 Blocks

```typescript
function generatePhase2Blocks(
  courseId: string,
  userId: string,
  week1StartDate: Date,
  examDate: Date,
  weeksUntilExam: number,
  phase2BlocksPerWeek: number,
  phase1EndWeek: number,
  preferredDays: number[]
): EnhancedStudyBlock[] {
  const blocks: EnhancedStudyBlock[] = [];
  
  // Phase 2 starts week 2 if ≥6 weeks, otherwise week 1
  const phase2StartWeek = weeksUntilExam >= 6 ? 2 : 1;
  
  // Phase 2 continues until exam week
  const phase2EndWeek = weeksUntilExam;
  
  // Split 50/50 between flashcards and activities
  const flashcardBlocksPerWeek = Math.floor(phase2BlocksPerWeek * 0.5);
  const activityBlocksPerWeek = phase2BlocksPerWeek - flashcardBlocksPerWeek;
  
  for (let week = phase2StartWeek; week <= phase2EndWeek; week++) {
    const weekStart = getWeekStart(week1StartDate, week);
    
    // Schedule flashcard sessions
    for (let i = 0; i < flashcardBlocksPerWeek; i++) {
      blocks.push({
        date: getPreferredDate(weekStart, preferredDays),
        taskType: TaskType.REVIEW,
        targetFlashcardIds: [], // Will be populated by Smart Review
        estimatedBlocks: 1,
        order: 0
      });
    }
    
    // Schedule activity sessions
    for (let i = 0; i < activityBlocksPerWeek; i++) {
      blocks.push({
        date: getPreferredDate(weekStart, preferredDays),
        taskType: TaskType.REVIEW,
        targetActivityIds: [], // Will be populated by Smart Review
        estimatedBlocks: 1,
        order: 0
      });
    }
  }
  
  return blocks;
}
```

### Step 5: Generate Phase 3 Blocks

```typescript
function generatePhase3Blocks(
  courseId: string,
  phase1EndWeek: number,
  week1StartDate: Date,
  examDate: Date,
  weeksUntilExam: number,
  phase3BlocksPerWeek: number,
  preferredDays: number[]
): EnhancedStudyBlock[] {
  const blocks: EnhancedStudyBlock[] = [];
  
  // Get practice exams
  const mockExams = await prisma.quiz.findMany({
    where: { courseId, isMockExam: true },
    orderBy: { createdAt: "asc" }
  });
  
  if (mockExams.length === 0) {
    // Only schedule quiz sessions
    return generatePhase3QuizSessions(phase1EndWeek, week1StartDate, examDate, phase3BlocksPerWeek, preferredDays);
  }
  
  // First exam: Week after Phase 1 (next full week, Monday)
  const firstExamWeek = phase1EndWeek + 1;
  const firstExamDate = getWeekStart(week1StartDate, firstExamWeek);
  
  // Last exam: Week before exam
  const lastExamWeek = weeksUntilExam - 1;
  const lastExamDate = getWeekStart(week1StartDate, lastExamWeek);
  
  // Schedule first exam
  if (mockExams.length > 0) {
    blocks.push({
      date: firstExamDate,
      taskType: TaskType.PRACTICE,
      targetQuizId: mockExams[0].id,
      estimatedBlocks: 4,
      order: 0
    });
  }
  
  // Schedule last exam
  if (mockExams.length > 1) {
    blocks.push({
      date: lastExamDate,
      taskType: TaskType.PRACTICE,
      targetQuizId: mockExams[mockExams.length - 1].id,
      estimatedBlocks: 4,
      order: 0
    });
  }
  
  // Schedule remaining exams evenly in between
  const remainingExams = mockExams.slice(1, -1);
  if (remainingExams.length > 0) {
    const weeksBetween = lastExamWeek - firstExamWeek;
    const spacing = Math.floor(weeksBetween / (remainingExams.length + 1));
    
    for (let i = 0; i < remainingExams.length; i++) {
      const examWeek = firstExamWeek + spacing * (i + 1);
      const examDate = getWeekStart(week1StartDate, examWeek);
      
      blocks.push({
        date: examDate,
        taskType: TaskType.PRACTICE,
        targetQuizId: remainingExams[i].id,
        estimatedBlocks: 4,
        order: 0
      });
    }
  }
  
  // Schedule quiz sessions for remaining Phase 3 blocks
  const quizBlocks = generatePhase3QuizSessions(
    phase1EndWeek,
    week1StartDate,
    examDate,
    phase3BlocksPerWeek,
    preferredDays,
    blocks.length // Already scheduled exam blocks
  );
  blocks.push(...quizBlocks);
  
  return blocks;
}
```

### Step 6: Weekly Plan Aggregation

```typescript
function aggregateWeeklyTasks(
  dailyEntries: DailyPlanEntry[],
  modules: Module[]
): WeeklyPlanWeek[] {
  // Group by week
  const weeksMap = new Map<number, DailyPlanEntry[]>();
  
  dailyEntries.forEach(entry => {
    const weekNumber = getWeekNumber(entry.date, week1StartDate);
    if (!weeksMap.has(weekNumber)) {
      weeksMap.set(weekNumber, []);
    }
    weeksMap.get(weekNumber)!.push(entry);
  });
  
  // Aggregate each week
  return Array.from(weeksMap.entries()).map(([weekNumber, entries]) => {
    const learnTasks = aggregateLearnTasks(entries, modules);
    const reviewTasks = aggregateReviewTasks(entries);
    const practiceTasks = aggregatePracticeTasks(entries);
    
    return {
      weekNumber,
      weekStart: getWeekStart(week1StartDate, weekNumber),
      weekEnd: getWeekEnd(week1StartDate, weekNumber),
      tasks: {
        learn: learnTasks,
        review: reviewTasks,
        practice: practiceTasks
      }
    };
  });
}

function aggregateLearnTasks(entries: DailyPlanEntry[], modules: Module[]): string[] {
  // Group by module
  const moduleTasks = new Map<string, string[]>();
  
  entries
    .filter(e => e.taskType === TaskType.LEARN && e.targetModuleId)
    .forEach(entry => {
      const module = modules.find(m => m.id === entry.targetModuleId);
      if (!module) return;
      
      if (!moduleTasks.has(module.id)) {
        moduleTasks.set(module.id, []);
      }
      
      // Add specific items
      if (entry.targetContentItemId) {
        const contentItem = module.contentItems.find(c => c.id === entry.targetContentItemId);
        if (contentItem?.contentType === "VIDEO") {
          moduleTasks.get(module.id)!.push(`${module.title} - Vidéo`);
        } else if (contentItem?.contentType === "NOTE") {
          moduleTasks.get(module.id)!.push(`${module.title} - Notes`);
        }
      }
      
      if (entry.targetQuizId) {
        moduleTasks.get(module.id)!.push(`${module.title} - Quiz`);
      }
    });
  
  // Format: "Lecture rapide [module]", "Vidéo [module]", "Lecture lente [module]", "Notes [module]", "Quiz [module]"
  const tasks: string[] = [];
  moduleTasks.forEach((items, moduleId) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;
    
    tasks.push(`Lecture rapide ${module.title}`);
    items.forEach(item => tasks.push(item));
    tasks.push(`Lecture lente ${module.title}`);
  });
  
  return tasks;
}

function aggregateReviewTasks(entries: DailyPlanEntry[]): string[] {
  const reviewEntries = entries.filter(e => e.taskType === TaskType.REVIEW);
  
  // Count flashcard sessions
  const flashcardSessions = reviewEntries.filter(e => 
    e.targetFlashcardIds && Array.isArray(e.targetFlashcardIds) && e.targetFlashcardIds.length > 0
  ).length;
  
  // Count activity sessions
  const activitySessions = reviewEntries.filter(e => 
    e.targetActivityIds && Array.isArray(e.targetActivityIds) && e.targetActivityIds.length > 0
  ).length;
  
  const tasks: string[] = [];
  if (flashcardSessions > 0) {
    tasks.push(`${flashcardSessions} séances de flashcards (ou révision intelligente)`);
  }
  if (activitySessions > 0) {
    tasks.push(`${activitySessions} séances de activités d'apprentissage (ou révision intelligente)`);
  }
  
  return tasks;
}

function aggregatePracticeTasks(entries: DailyPlanEntry[]): string[] {
  const practiceEntries = entries.filter(e => e.taskType === TaskType.PRACTICE);
  
  // Itemize practice exams
  const examEntries = practiceEntries.filter(e => e.targetQuizId);
  const examTasks = examEntries.map(entry => {
    const exam = await prisma.quiz.findUnique({ where: { id: entry.targetQuizId } });
    return exam?.title || "Examen blanc";
  });
  
  // Aggregate quiz sessions
  const quizSessions = practiceEntries.filter(e => !e.targetQuizId).length;
  const quizTasks: string[] = [];
  if (quizSessions > 0) {
    quizTasks.push(`${quizSessions} séances de quiz`);
  }
  
  return [...examTasks, ...quizTasks];
}
```

### Step 7: Plan du Jour Generation

```typescript
function generateTodaysPlan(
  courseId: string,
  userId: string,
  currentWeek: number
): DailyPlanEntry[] {
  // Get current week's tasks
  const weekEntries = await prisma.dailyPlanEntry.findMany({
    where: {
      userId,
      courseId,
      date: {
        gte: getWeekStart(week1StartDate, currentWeek),
        lte: getWeekEnd(week1StartDate, currentWeek)
      }
    },
    orderBy: { order: "asc" }
  });
  
  // Get module progress
  const moduleProgress = await prisma.moduleProgress.findMany({
    where: { userId, courseId }
  });
  
  const doneModules = new Set(
    moduleProgress
      .filter(p => p.learnStatus === "LEARNED")
      .map(p => p.moduleId)
  );
  
  // Filter Phase 1: Show only one module (first not done)
  const phase1Entries = weekEntries.filter(e => 
    e.taskType === TaskType.LEARN && 
    e.targetModuleId && 
    !doneModules.has(e.targetModuleId)
  );
  
  const firstPhase1Module = phase1Entries[0]?.targetModuleId;
  const phase1Tasks = phase1Entries.filter(e => e.targetModuleId === firstPhase1Module);
  
  // Get Phase 2 tasks (all)
  const phase2Tasks = weekEntries.filter(e => e.taskType === TaskType.REVIEW);
  
  // Combine and take first 6 blocks
  const allTasks = [...phase1Tasks, ...phase2Tasks];
  const selectedTasks = allTasks.slice(0, 6);
  
  // Format for display:
  // - Session courte (1 block): First 1-block task
  // - Session longue (2 blocks): First 2-block task
  // - Session courte supplémentaire (1 block): Next 1-block task
  // - Session longue supplémentaire (2 blocks): Next 2-block task
  
  return formatTodaysPlanSections(selectedTasks);
}
```

---

## Database Schema Updates

### DailyPlanEntry
- ✅ Already has: `targetModuleId`, `targetContentItemId`, `targetQuizId`, `targetFlashcardIds`
- ⚠️ Need to add: `targetActivityIds` (Json) for learning activities
- ⚠️ Need to track: Off-platform items (Lecture rapide, Lecture lente) - maybe add `isOffPlatform` boolean?

### Module Progress
- ✅ Already tracks: `learnStatus`, `lastLearnedAt`
- ✅ Can use to determine if module is done

---

## Implementation Checklist

### Phase 1: Core Algorithm
- [ ] Create new study plan generator with all requirements
- [ ] Implement validation (minimum hours, weeks, exam date)
- [ ] Implement Phase 1 block generation (8 blocks per module, proper order)
- [ ] Implement Phase 2 block generation (50/50 split, proper timing)
- [ ] Implement Phase 3 block generation (practice exams, quiz sessions)
- [ ] Handle 0-3 weeks scenario (no Phase 1, 50/50 Phase 2/3)
- [ ] Handle Phase 1 deadline calculation and warnings

### Phase 2: Weekly Plan
- [ ] Implement weekly plan aggregation
- [ ] Format Phase 1 tasks (Lecture rapide, Vidéo, Lecture lente, Notes, Quiz)
- [ ] Format Phase 2 tasks (X séances de flashcards/activités)
- [ ] Format Phase 3 tasks (practice exams, quiz sessions)
- [ ] Update weekly plan component to show aggregated tasks

### Phase 3: Plan du Jour
- [ ] Implement today's plan generation
- [ ] Show one Phase 1 module (first not done)
- [ ] Show all Phase 2 tasks
- [ ] Format into 4 sections (Session courte, Session longue, etc.)
- [ ] Handle all modules done scenario

### Phase 4: Edge Cases & Warnings
- [ ] Handle exam date changes (regenerate)
- [ ] Handle study hours changes (regenerate)
- [ ] Handle level changes (regenerate)
- [ ] Show warnings for minimum hours, long exam dates, Phase 1 deadline
- [ ] Handle Phase 1 taking longer (adjust Phase 2/3)

---

## Next Steps

1. Create new study plan generator file
2. Update `generateStudyPlanAction` to use new algorithm
3. Update weekly plan aggregation
4. Update plan du jour generation
5. Add all warnings and validations
6. Test with various scenarios

