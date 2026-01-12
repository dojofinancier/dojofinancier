"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getQuestionBankQuestionsAction,
  getQuestionBankAttemptsAction,
  getQuestionBankStatsAction,
} from "@/app/actions/question-bank-practice";

export function useQuestionBankQuestions(courseId: string) {
  return useQuery({
    queryKey: ["question-bank-questions", courseId],
    queryFn: () => getQuestionBankQuestionsAction(courseId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useQuestionBankAttempts(courseId: string) {
  return useQuery({
    queryKey: ["question-bank-attempts", courseId],
    queryFn: () => getQuestionBankAttemptsAction(courseId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useQuestionBankStats(courseId: string) {
  return useQuery({
    queryKey: ["question-bank-stats", courseId],
    queryFn: () => getQuestionBankStatsAction(courseId),
    staleTime: 2 * 60 * 1000, // 2 minutes (stats change more frequently)
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

