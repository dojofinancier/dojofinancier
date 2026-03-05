"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, ExternalLink, X, Clock } from "lucide-react";
import {
  getCaseStudyAction,
  submitCaseStudyAction,
} from "@/app/actions/case-studies";
import { CaseStudyResults } from "./case-study-results";
import { marked } from "marked";

const STORAGE_KEY_PREFIX = "casestudy_";

interface CaseStudyPlayerProps {
  caseStudyId: string;
  timeLimit?: number | null; // seconds, null = no timer
  onExit: () => void;
}

type Question = {
  id: string;
  order: number;
  question: string;
  options: Record<string, string>;
  correctAnswer: string;
};

type CaseStudy = {
  id: string;
  caseId: string;
  caseNumber: number;
  title: string;
  theme: string | null;
  narrative: any;
  passingScore: number;
  questions: Question[];
};

function normalizeQuestionOptions(value: unknown): Record<string, string> {
  const toRecord = (v: unknown): Record<string, string> => {
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const obj = v as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, raw] of Object.entries(obj)) {
      if (raw == null) continue;
      out[k] = typeof raw === "string" ? raw : String(raw);
    }
    return out;
  };

  if (typeof value === "string") {
    try {
      return toRecord(JSON.parse(value));
    } catch {
      return {};
    }
  }

  return toRecord(value);
}

export function CaseStudyPlayer({ caseStudyId, timeLimit = null, onExit }: CaseStudyPlayerProps) {
  const [caseStudy, setCaseStudy] = useState<CaseStudy | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [narrativeModalOpen, setNarrativeModalOpen] = useState(false);

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const answersRef = useRef<Record<string, string>>({});
  const timeRemainingRef = useRef<number | null>(null);
  const currentQuestionIndexRef = useRef<number>(0);
  const handleTimeUpRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const storageKey = `${STORAGE_KEY_PREFIX}${caseStudyId}_${timeLimit ?? "none"}`;

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
  }, [timeRemaining]);
  useEffect(() => {
    currentQuestionIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  useEffect(() => {
    loadCaseStudy();
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [caseStudyId, timeLimit]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const startTimer = (initialTime: number) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          handleTimeUpRef.current();
          return 0;
        }
        const newTime = prev - 1;
        timeRemainingRef.current = newTime;
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            answers: answersRef.current,
            timeRemaining: newTime,
            currentQuestionIndex: currentQuestionIndexRef.current,
          })
        );
        return newTime;
      });
    }, 1000);
  };

  const loadCaseStudy = async () => {
    try {
      setLoading(true);
      const result = await getCaseStudyAction(caseStudyId);
      if (result.success && result.data) {
        const data = result.data as any;
        const normalizedCaseStudy = {
          ...data,
          questions: data.questions.map((q: any) => ({
            ...q,
            options: normalizeQuestionOptions(q.options),
          })),
        };
        setCaseStudy(normalizedCaseStudy);

        let restoredAnswers: Record<string, string> = {};
        let restoredTimeRemaining: number | null = null;
        let restoredQuestionIndex = 0;

        if (timeLimit) {
          const savedState = localStorage.getItem(storageKey);
          if (savedState) {
            try {
              const parsed = JSON.parse(savedState);
              restoredAnswers = parsed.answers || {};
              restoredTimeRemaining = parsed.timeRemaining ?? null;
              restoredQuestionIndex = parsed.currentQuestionIndex ?? 0;
            } catch (e) {
              console.error("Error parsing saved case study state:", e);
            }
          }

          const savedStartTime = localStorage.getItem(`${storageKey}_startTime`);
          const now = Date.now();

          if (savedStartTime && restoredTimeRemaining !== null && restoredTimeRemaining > 0) {
            const elapsed = Math.floor((now - parseInt(savedStartTime)) / 1000);
            const remaining = Math.max(0, restoredTimeRemaining - elapsed);
            setTimeRemaining(remaining);
            timeRemainingRef.current = remaining;
            setAnswers(restoredAnswers);
            answersRef.current = restoredAnswers;
            const validIndex = Math.max(
              0,
              Math.min(restoredQuestionIndex, normalizedCaseStudy.questions.length - 1)
            );
            setCurrentQuestionIndex(validIndex);
            currentQuestionIndexRef.current = validIndex;
            startTimer(remaining);
          } else {
            setTimeRemaining(timeLimit);
            timeRemainingRef.current = timeLimit;
            localStorage.setItem(`${storageKey}_startTime`, now.toString());
            startTimer(timeLimit);
          }
        }
      } else {
        toast.error(result.error || "Erreur lors du chargement de l'étude de cas");
        onExit();
      }
    } catch (error) {
      console.error("Error loading case study:", error);
      toast.error("Erreur lors du chargement de l'étude de cas");
      onExit();
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);
    answersRef.current = newAnswers;
    if (timeLimit) {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          answers: newAnswers,
          timeRemaining: timeRemainingRef.current,
          currentQuestionIndex: currentQuestionIndexRef.current,
        })
      );
    }
  };

  const handleSubmit = async (isTimeUp: boolean = false) => {
    if (submitting || submitted) return;

    if (caseStudy && caseStudy.questions.length > 0 && !isTimeUp) {
      const answersToCheck = answersRef.current ?? answers;
      const answeredCount = Object.keys(answersToCheck).length;
      if (answeredCount < caseStudy.questions.length) {
        const confirmSubmit = confirm(
          `Vous avez répondu à ${answeredCount} sur ${caseStudy.questions.length} questions. Voulez-vous vraiment soumettre ?`
        );
        if (!confirmSubmit) return;
      }
    }

    setSubmitting(true);
    try {
      const answersToSubmit = answersRef.current ?? answers;
      const result = await submitCaseStudyAction(caseStudyId, answersToSubmit);
      if (result.success && result.data) {
        setResult(result.data);
        setSubmitted(true);
        setShowResults(true);

        if (timeLimit) {
          localStorage.removeItem(storageKey);
          localStorage.removeItem(`${storageKey}_startTime`);
        }
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }

        if (!isTimeUp) {
          toast.success("Étude de cas soumise avec succès !");
        }
      } else {
        toast.error(result.error || "Erreur lors de la soumission");
      }
    } catch (error) {
      console.error("Error submitting case study:", error);
      toast.error("Erreur lors de la soumission");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    handleTimeUpRef.current = async () => {
      if (submitted || submitting) return;
      toast.warning("Le temps est écoulé. L'étude de cas est en cours de soumission...");
      await handleSubmit(true);
    };
  });

  const saveProgressToStorage = () => {
    if (timeLimit) {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          answers: answersRef.current,
          timeRemaining: timeRemainingRef.current,
          currentQuestionIndex: currentQuestionIndexRef.current,
        })
      );
    }
  };

  const handleNext = () => {
    if (caseStudy && currentQuestionIndex < caseStudy.questions.length - 1) {
      const newIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(newIndex);
      currentQuestionIndexRef.current = newIndex;
      saveProgressToStorage();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      const newIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(newIndex);
      currentQuestionIndexRef.current = newIndex;
      saveProgressToStorage();
    }
  };

  const renderNarrative = () => {
    if (!caseStudy?.narrative) return null;

    const narrative = caseStudy.narrative.case_narrative || caseStudy.narrative;
    const sections = narrative.sections || [];

    return (
      <div className="space-y-4">
        {narrative.introduction_box && (
          <div className="p-4 bg-muted rounded-lg border-l-4 border-primary">
                <p className="text-base sm:text-sm whitespace-pre-wrap">{narrative.introduction_box}</p>

          </div>
        )}

        {sections.map((section: any, index: number) => (
          <div key={index} className="space-y-3">
            {section.title && (
              <h3 className="text-lg font-semibold">{section.title}</h3>
            )}
              {section.content && (
                <div className="text-base sm:text-sm whitespace-pre-wrap prose prose-sm max-w-none">
                  {section.content}
                </div>
              )}

            {section.tables && section.tables.length > 0 && (
              <div className="space-y-4">
                {section.tables.map((table: any, tableIndex: number) => (
                  <div key={tableIndex} className="overflow-x-auto">
                    {table.title && (
                      <p className="font-semibold text-sm mb-2">{table.title}</p>
                    )}
                    {table.markdown && (
                      <div
                        className="prose prose-sm max-w-none overflow-x-auto"
                        dangerouslySetInnerHTML={{
                          __html: marked.parse(table.markdown, { breaks: true }) as string,
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {narrative.closing && (
          <div className="p-4 bg-muted rounded-lg mt-4">
            <p className="text-sm font-semibold">{narrative.closing}</p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!caseStudy) {
    return null;
  }

  if (showResults && result) {
    return (
      <CaseStudyResults
        result={{
          ...result,
          attemptId: result.attemptId || result.attempt?.id,
        }}
        caseStudy={caseStudy}
        onRetake={() => {
          if (timeLimit) {
            localStorage.removeItem(storageKey);
            localStorage.removeItem(`${storageKey}_startTime`);
          }
          setSubmitted(false);
          setShowResults(false);
          setResult(null);
          setAnswers({});
          setCurrentQuestionIndex(0);
        }}
        onExit={onExit}
      />
    );
  }

  if (!caseStudy.questions?.length) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Cette étude de cas n'a pas de questions.</p>
        <Button className="mt-4" variant="outline" onClick={onExit}>
          Retour
        </Button>
      </div>
    );
  }

  const currentQuestion = caseStudy.questions[currentQuestionIndex];
  if (!currentQuestion) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Question introuvable.</p>
        <Button className="mt-4" variant="outline" onClick={onExit}>
          Retour
        </Button>
      </div>
    );
  }

  const progress = ((currentQuestionIndex + 1) / caseStudy.questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{caseStudy.title}</h2>
          {caseStudy.theme && (
            <p className="text-sm text-muted-foreground mt-1">{caseStudy.theme}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {timeLimit && timeRemaining !== null && (
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Temps restant</div>
              <div
                className={`text-lg font-semibold flex items-center gap-2 ${
                  timeRemaining < 300 ? "text-red-600" : ""
                }`}
              >
                <Clock className="h-4 w-4" />
                {formatTime(timeRemaining)}
              </div>
            </div>
          )}
          <Button className="w-full sm:w-auto" variant="outline" onClick={onExit}>
            <X className="h-4 w-4 mr-2" />
            Quitter
          </Button>
        </div>
      </div>


        <div className="space-y-4">
          {/* Narrative Panel - Full Width on Top */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Récit du cas</CardTitle>
                <Dialog open={narrativeModalOpen} onOpenChange={setNarrativeModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{caseStudy.title}</DialogTitle>
                      <DialogDescription>Récit complet de l'étude de cas</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[calc(90vh-120px)] mt-4">
                      {renderNarrative()}
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <ScrollArea className="h-[40vh] sm:h-[45vh] lg:h-[50vh]">
                {renderNarrative()}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Questions Panel - Full Width Below */}
          <Card>
            <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle>
                    Question {currentQuestionIndex + 1} sur {caseStudy.questions.length}
                  </CardTitle>
                  <Badge variant="outline" className="w-fit">
                    {answeredCount} / {caseStudy.questions.length} répondues
                  </Badge>
                </div>

              <Progress value={progress} className="mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <p className="text-lg font-medium">{currentQuestion.question}</p>

                <RadioGroup
                  value={answers[currentQuestion.id] || ""}
                  onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                >
                  <div className="space-y-3">
                    {Object.entries(currentQuestion.options)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([key, value]) => (
                        <div key={key} className="flex items-start space-x-3 py-2">
                          <RadioGroupItem value={key} id={key} className="self-center" />
                          <Label
                            htmlFor={key}
                            className="flex-1 cursor-pointer leading-relaxed text-base"
                          >
                            <span className="font-medium mr-2">{key}:</span>
                            {value}
                          </Label>
                        </div>
                      ))}
                  </div>

                </RadioGroup>
              </div>

              <div className="flex flex-col gap-3 pt-4 border-t sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                    className="w-full sm:w-auto"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Précédent
                  </Button>
                  {currentQuestionIndex < caseStudy.questions.length - 1 ? (
                    <Button className="w-full sm:w-auto" onClick={handleNext}>
                      Suivant
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button className="w-full sm:w-auto" onClick={handleSubmit} disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Soumission...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Soumettre
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {caseStudy.questions.map((q, idx) => (
                    <Button
                      key={q.id}
                      variant={answers[q.id] ? "default" : "outline"}
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={() => {
                        setCurrentQuestionIndex(idx);
                        currentQuestionIndexRef.current = idx;
                        saveProgressToStorage();
                      }}
                    >
                      {idx + 1}
                    </Button>
                  ))}
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
    </div>
  );
}
