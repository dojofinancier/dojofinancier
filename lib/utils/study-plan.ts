/**
 * Study Plan Algorithm
 * Implements block-based study time allocation with phase distribution
 * based on exam date, weekly study time, and self-rating.
 */

import { SelfRating, TaskType } from "@prisma/client";

// Re-export for convenience
export { TaskType };

export interface StudyPlanConfig {
  examDate: Date;
  studyHoursPerWeek: number;
  selfRating: SelfRating;
  preferredStudyDays?: number[]; // 0-6 (Sunday=0, Monday=1, ..., Saturday=6)
  planCreatedAt: Date;
}

export interface StudyBlock {
  date: Date;
  taskType: TaskType;
  targetModuleId?: string;
  targetContentItemId?: string;
  targetQuizId?: string;
  targetFlashcardIds?: string[];
  estimatedBlocks: number;
  order: number;
}

export interface PhaseAllocation {
  learn: number; // percentage
  review: number; // percentage
  practice: number; // percentage
}

/**
 * Calculate phase allocation based on self-rating
 */
export function getPhaseAllocation(selfRating: SelfRating): PhaseAllocation {
  switch (selfRating) {
    case "NOVICE":
      return { learn: 55, review: 35, practice: 10 };
    case "INTERMEDIATE":
      return { learn: 40, review: 40, practice: 20 };
    case "RETAKER":
      return { learn: 25, review: 35, practice: 40 };
    default:
      return { learn: 50, review: 30, practice: 20 };
  }
}

/**
 * Calculate weeks until exam
 */
export function getWeeksUntilExam(examDate: Date, fromDate: Date = new Date()): number {
  const diffTime = examDate.getTime() - fromDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, Math.ceil(diffDays / 7));
}

/**
 * Calculate blocks per week (1 block = ~25-30 minutes, 1 hour = 2 blocks)
 */
export function getBlocksPerWeek(studyHoursPerWeek: number): number {
  return studyHoursPerWeek * 2;
}

/**
 * Determine phase distribution over time
 * Returns an array indicating which phase should be emphasized each week
 */
export function getPhaseDistribution(
  totalWeeks: number,
  phaseAllocation: PhaseAllocation
): Array<{ week: number; learn: number; review: number; practice: number }> {
  const distribution: Array<{ week: number; learn: number; review: number; practice: number }> = [];

  if (totalWeeks >= 8) {
    // Long timeline: Weeks 1-4: Learn-heavy, Weeks 5-6: Review-heavy, Weeks 7-8: Practice-heavy
    for (let week = 1; week <= totalWeeks; week++) {
      if (week <= 4) {
        distribution.push({
          week,
          learn: 0.7,
          review: 0.2,
          practice: 0.1,
        });
      } else if (week <= 6) {
        distribution.push({
          week,
          learn: 0.3,
          review: 0.5,
          practice: 0.2,
        });
      } else {
        distribution.push({
          week,
          learn: 0.1,
          review: 0.3,
          practice: 0.6,
        });
      }
    }
  } else if (totalWeeks >= 4) {
    // Medium timeline: Compressed phases
    const learnWeeks = Math.ceil(totalWeeks * 0.4);
    const reviewWeeks = Math.ceil(totalWeeks * 0.3);
    // Remaining weeks are practice

    for (let week = 1; week <= totalWeeks; week++) {
      if (week <= learnWeeks) {
        distribution.push({
          week,
          learn: 0.6,
          review: 0.3,
          practice: 0.1,
        });
      } else if (week <= learnWeeks + reviewWeeks) {
        distribution.push({
          week,
          learn: 0.2,
          review: 0.5,
          practice: 0.3,
        });
      } else {
        distribution.push({
          week,
          learn: 0.1,
          review: 0.3,
          practice: 0.6,
        });
      }
    }
  } else {
    // Short timeline: Very compressed
    for (let week = 1; week <= totalWeeks; week++) {
      if (week === 1) {
        distribution.push({
          week,
          learn: 0.5,
          review: 0.3,
          practice: 0.2,
        });
      } else if (week === totalWeeks) {
        distribution.push({
          week,
          learn: 0.1,
          review: 0.2,
          practice: 0.7,
        });
      } else {
        distribution.push({
          week,
          learn: 0.3,
          review: 0.4,
          practice: 0.3,
        });
      }
    }
  }

  return distribution;
}

/**
 * Calculate spacing intervals for spaced repetition
 * Returns intervals in days based on remaining time
 * Used for Phase 2 review scheduling: 1d, 4d, 10d, 21d after learning
 */
export function getSpacingIntervals(weeksUntilExam: number): number[] {
  if (weeksUntilExam >= 8) {
    // Long timeline: longer spacing
    return [1, 4, 10, 21, 45];
  } else if (weeksUntilExam >= 4) {
    // Medium timeline: moderate spacing
    return [1, 4, 10, 21]; // Standard intervals
  } else {
    // Short timeline: compressed spacing
    return [1, 4, 10, 21]; // Still use standard intervals, but may not all fit
  }
}

/**
 * Calculate Phase 1 pace (modules per week)
 * Algorithm-determined based on time available:
 * - Default: 3 modules/week (if enough time)
 * - Exam soon: Closer to max (6/week)
 * - Exam far: Closer to min (1/week)
 */
export function calculatePhase1Pace(
  totalModules: number,
  weeksUntilExam: number
): number {
  // Calculate minimum weeks needed at default pace
  const weeksAtDefaultPace = Math.ceil(totalModules / 3);
  
  // If we have plenty of time (more than 2x default pace), slow down
  if (weeksUntilExam >= weeksAtDefaultPace * 2) {
    // Move toward minimum (1/week) but not below it
    const minPace = 1;
    const maxPace = 3;
    // Linear interpolation: more time = slower pace
    const ratio = Math.min(1, (weeksUntilExam - weeksAtDefaultPace) / weeksAtDefaultPace);
    return Math.max(minPace, maxPace - (maxPace - minPace) * ratio);
  }
  
  // If we have just enough time, use default pace
  if (weeksUntilExam >= weeksAtDefaultPace) {
    return 3;
  }
  
  // If exam is soon, speed up toward maximum (6/week)
  const minPace = 1;
  const maxPace = 6;
  const weeksAtMaxPace = Math.ceil(totalModules / maxPace);
  
  if (weeksUntilExam < weeksAtMaxPace) {
    // Not enough time even at max pace - use max pace and warn
    return maxPace;
  }
  
  // Linear interpolation: less time = faster pace
  const ratio = (weeksAtDefaultPace - weeksUntilExam) / (weeksAtDefaultPace - weeksAtMaxPace);
  return Math.min(maxPace, 3 + (maxPace - 3) * ratio);
}

/**
 * Calculate Week 1 start date
 * Week 1 starts on the plan generation day (startDate) and ends on the next Sunday
 * If they start on Wednesday, week 1 will be Wednesday to Sunday (shorter week)
 */
export function calculateWeek1StartDate(startDate: Date): Date {
  const date = new Date(startDate);
  date.setHours(0, 0, 0, 0);
  return date; // Week 1 starts on the exact day of plan generation
}

/**
 * Calculate blocks for a module based on actual content
 * Videos = 2 blocks, Phase 1 quiz = 1 block, Notes = 1 block
 */
export function calculateModuleBlocks(
  videos: number,
  quizzes: number,
  notes: number
): number {
  return videos * 2 + quizzes * 1 + notes * 1;
}

/**
 * Estimate blocks required for a course (legacy function - kept for backward compatibility)
 * @deprecated Use getCourseContentInventory for accurate counts
 */
export function estimateCourseBlocks(
  moduleCount: number,
  averageContentItemsPerModule: number = 5
): {
  blocksForLearn: number;
  blocksForMinimumReview: number;
  blocksForMinimumPractice: number;
  totalBlocks: number;
} {
  // Estimate: Videos = 2 blocks, Quiz = 1 block, Notes = 1 block
  // Most modules: 1 video + 1 quiz + 1 note = 4 blocks
  const blocksForLearn = moduleCount * 4; // Default assumption

  // Minimum review: 2 review sessions per module
  const blocksForMinimumReview = moduleCount * 2;

  // Minimum practice: 2 mock exams (4 blocks each) + some drills
  const blocksForMinimumPractice = 8 + moduleCount * 1;

  const totalBlocks = blocksForLearn + blocksForMinimumReview + blocksForMinimumPractice;

  return {
    blocksForLearn,
    blocksForMinimumReview,
    blocksForMinimumPractice,
    totalBlocks,
  };
}

/**
 * Check if study plan is feasible
 */
export function checkFeasibility(
  config: StudyPlanConfig,
  moduleCount: number
): {
  feasible: boolean;
  blocksAvailable: number;
  blocksRequired: number;
  deficit?: number;
  recommendation?: string;
} {
  const weeksUntilExam = getWeeksUntilExam(config.examDate, config.planCreatedAt);
  const blocksPerWeek = getBlocksPerWeek(config.studyHoursPerWeek);
  const blocksAvailable = weeksUntilExam * blocksPerWeek;

  const estimates = estimateCourseBlocks(moduleCount);
  const blocksRequired = estimates.totalBlocks;

  const feasible = blocksAvailable >= blocksRequired;
  const deficit = blocksRequired - blocksAvailable;

  let recommendation: string | undefined;
  if (!feasible) {
    if (deficit > 0) {
      const additionalHoursNeeded = Math.ceil(deficit / 2);
      recommendation = `At this pace, you'll cover approximately ${Math.round(
        (blocksAvailable / blocksRequired) * 100
      )}% of the content before the exam. Consider increasing weekly study time by ${additionalHoursNeeded} hours, or accept a "minimum viable" path focusing on high-yield content.`;
    }
  }

  return {
    feasible,
    blocksAvailable,
    blocksRequired,
    deficit: feasible ? undefined : deficit,
    recommendation,
  };
}

/**
 * Generate study blocks for a specific date range
 */
export function generateStudyBlocks(
  config: StudyPlanConfig,
  startDate: Date,
  endDate: Date,
  availableModules: Array<{ id: string; order: number }>,
  phaseDistribution: Array<{ week: number; learn: number; review: number; practice: number }>
): StudyBlock[] {
  const blocks: StudyBlock[] = [];
  const blocksPerWeek = getBlocksPerWeek(config.studyHoursPerWeek);
  const preferredDays = config.preferredStudyDays || [1, 2, 3, 4, 5]; // Default: Mon-Fri

  let currentDate = new Date(startDate);
  let blockOrder = 0;
  let weekNumber = 1;

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();

    // Only schedule on preferred study days
    if (preferredDays.includes(dayOfWeek)) {
      // Determine which week we're in
      const weeksFromStart = Math.floor(
        (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
      );
      const currentWeek = weeksFromStart + 1;

      // Get phase distribution for this week
      const weekDistribution =
        phaseDistribution[Math.min(currentWeek - 1, phaseDistribution.length - 1)] ||
        phaseDistribution[phaseDistribution.length - 1];

      // Calculate blocks for this day (distribute weekly blocks across preferred days)
      const studyDaysThisWeek = preferredDays.filter((d) => {
        const date = new Date(currentDate);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        const checkDate = new Date(weekStart);
        while (checkDate <= weekEnd) {
          if (checkDate.getDay() === d) {
            return true;
          }
          checkDate.setDate(checkDate.getDate() + 1);
        }
        return false;
      }).length;

      const blocksThisDay = Math.ceil(blocksPerWeek / studyDaysThisWeek);

      // Allocate blocks by phase
      const learnBlocks = Math.round(blocksThisDay * weekDistribution.learn);
      const reviewBlocks = Math.round(blocksThisDay * weekDistribution.review);
      const practiceBlocks = blocksThisDay - learnBlocks - reviewBlocks;

      // Generate Learn blocks
      for (let i = 0; i < learnBlocks; i++) {
        const moduleIndex = (blockOrder + i) % availableModules.length;
        blocks.push({
          date: new Date(currentDate),
          taskType: TaskType.LEARN,
          targetModuleId: availableModules[moduleIndex]?.id,
          estimatedBlocks: 1,
          order: blockOrder++,
        });
      }

      // Generate Review blocks
      for (let i = 0; i < reviewBlocks; i++) {
        blocks.push({
          date: new Date(currentDate),
          taskType: TaskType.REVIEW,
          estimatedBlocks: 1,
          order: blockOrder++,
        });
      }

      // Generate Practice blocks
      for (let i = 0; i < practiceBlocks; i++) {
        blocks.push({
          date: new Date(currentDate),
          taskType: TaskType.PRACTICE,
          estimatedBlocks: 1,
          order: blockOrder++,
        });
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return blocks;
}

/**
 * Calculate exam countdown status
 */
export function getExamStatus(
  examDate: Date,
  currentProgress: { completedBlocks: number; totalBlocks: number }
): {
  daysUntilExam: number;
  status: "on_track" | "slightly_behind" | "at_risk";
  progressPercentage: number;
} {
  const now = new Date();
  const diffTime = examDate.getTime() - now.getTime();
  const daysUntilExam = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const progressPercentage = currentProgress.totalBlocks > 0
    ? (currentProgress.completedBlocks / currentProgress.totalBlocks) * 100
    : 0;

  // Calculate expected progress based on days elapsed
  const totalDays = Math.ceil((examDate.getTime() - currentProgress.totalBlocks) / (1000 * 60 * 60 * 24));
  const expectedProgress = totalDays > 0 ? ((totalDays - daysUntilExam) / totalDays) * 100 : 0;

  let status: "on_track" | "slightly_behind" | "at_risk";
  if (progressPercentage >= expectedProgress * 0.9) {
    status = "on_track";
  } else if (progressPercentage >= expectedProgress * 0.7) {
    status = "slightly_behind";
  } else {
    status = "at_risk";
  }

  return {
    daysUntilExam,
    status,
    progressPercentage,
  };
}

