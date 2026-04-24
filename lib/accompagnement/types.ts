/**
 * Shared types for the Accompagnement engine.
 *
 * Maps PRD §7 check-in formats to required question counts.
 */

import { CheckInType } from "@prisma/client";

export interface CheckInShape {
  mcqCount: number;
  oeqCount: number;
  yesNo: boolean;
}

export const CHECKIN_SHAPE: Record<CheckInType, CheckInShape> = {
  LIGHT: { mcqCount: 1, oeqCount: 1, yesNo: false },
  MID_WEEK: { mcqCount: 5, oeqCount: 1, yesNo: false },
  WEEKLY: { mcqCount: 20, oeqCount: 0, yesNo: false },
  MISSED: { mcqCount: 1, oeqCount: 0, yesNo: true },
};

export interface AdaptiveMcqRow {
  id: string;
  questionId: string;
  course: string;
  chapter: number;
  topic: string;
  difficulty: string;
  questionText: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation: string;
}

export interface AdaptiveOeqRow {
  id: string;
  questionId: string;
  course: string;
  chapter: number;
  topic: string;
  difficulty: string;
  questionText: string;
  modelAnswer: string;
  explanation: string;
}

export interface PickedQuestions {
  mcqs: AdaptiveMcqRow[];
  oeqs: AdaptiveOeqRow[];
}

export interface SelectionContext {
  enrollmentId: string;
  courseSlug: string;
  plannedChapters: number[];
  weakAreaChapters: number[];
  recentChapters: number[];
  recentAdaptiveQuestionIds: string[];
}
