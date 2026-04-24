"use client";

import { LearningActivityPlayer } from "./learning-activity-player";

interface LearningActivityReviewProps {
  activityId: string;
  activity: {
    id: string;
    title: string;
    activityType: string;
    instructions: string | null;
    content: any;
    correctAnswers?: any;
    tolerance?: number | null;
    moduleId?: string | null;
  };
  reviewMode?: boolean;
  onNext?: () => void;
  onComplete?: (score: number | null) => void;
}

/**
 * Learning Activity Review Component
 * Displays a learning activity in review mode (compact, focused)
 */
export function LearningActivityReview({
  activityId,
  activity,
  reviewMode = false,
  onNext,
  onComplete,
}: LearningActivityReviewProps) {
  return (
    <LearningActivityPlayer
      activityId={activityId}
      activity={{
        id: activity.id,
        activityType: activity.activityType,
        title: activity.title,
        instructions: activity.instructions,
        content: activity.content,
        correctAnswers: activity.correctAnswers ?? null,
        tolerance: activity.tolerance ?? null,
      }}
      reviewMode={reviewMode}
      onNext={onNext}
      onComplete={onComplete}
    />
  );
}
