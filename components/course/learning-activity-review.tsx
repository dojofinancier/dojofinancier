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
    moduleId?: string | null;
  };
  reviewMode?: boolean;
}

/**
 * Learning Activity Review Component
 * Displays a learning activity in review mode (compact, focused)
 */
export function LearningActivityReview({
  activityId,
  activity,
  reviewMode = false,
}: LearningActivityReviewProps) {
  // In review mode, we show a compact version
  // For now, we'll reuse the existing player but in a simplified view
  return (
    <LearningActivityPlayer
      activityId={activityId}
      activity={{
        id: activity.id,
        activityType: activity.activityType,
        title: activity.title,
        instructions: activity.instructions,
        content: activity.content,
        correctAnswers: null, // Not shown in review mode
        tolerance: null,
      }}
      reviewMode={reviewMode}
    />
  );
}

