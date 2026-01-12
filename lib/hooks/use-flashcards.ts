"use client";

import { useQuery } from "@tanstack/react-query";
import { getFlashcardsAction } from "@/app/actions/flashcards";

export function useFlashcards(courseId: string) {
  return useQuery({
    queryKey: ["flashcards", courseId],
    queryFn: () => getFlashcardsAction(courseId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

