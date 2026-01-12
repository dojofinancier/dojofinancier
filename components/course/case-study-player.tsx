"use client";

import { useState, useEffect } from "react";
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
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, ExternalLink, X } from "lucide-react";
import {
  getCaseStudyAction,
  submitCaseStudyAction,
} from "@/app/actions/case-studies";
import { CaseStudyResults } from "./case-study-results";
import { marked } from "marked";

interface CaseStudyPlayerProps {
  caseStudyId: string;
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

export function CaseStudyPlayer({ caseStudyId, onExit }: CaseStudyPlayerProps) {
  const [caseStudy, setCaseStudy] = useState<CaseStudy | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [narrativeModalOpen, setNarrativeModalOpen] = useState(false);

  useEffect(() => {
    loadCaseStudy();
  }, [caseStudyId]);

  const loadCaseStudy = async () => {
    try {
      setLoading(true);
      const result = await getCaseStudyAction(caseStudyId);
      if (result.success && result.data) {
        const data = result.data as any;
        setCaseStudy({
          ...data,
          questions: data.questions.map((q: any) => ({
            ...q,
            options: normalizeQuestionOptions(q.options),
          })),
        });
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
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmit = async () => {
    if (caseStudy && caseStudy.questions.length > 0) {
      const answeredCount = Object.keys(answers).length;
      if (answeredCount < caseStudy.questions.length) {
        const confirmSubmit = confirm(
          `Vous avez répondu à ${answeredCount} sur ${caseStudy.questions.length} questions. Voulez-vous vraiment soumettre ?`
        );
        if (!confirmSubmit) return;
      }
    }

    setSubmitting(true);
    try {
      const result = await submitCaseStudyAction(caseStudyId, answers);
      if (result.success && result.data) {
        setResult(result.data);
        setSubmitted(true);
        setShowResults(true);
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

  const handleNext = () => {
    if (caseStudy && currentQuestionIndex < caseStudy.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
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
            <p className="text-sm whitespace-pre-wrap">{narrative.introduction_box}</p>
          </div>
        )}

        {sections.map((section: any, index: number) => (
          <div key={index} className="space-y-3">
            {section.title && (
              <h3 className="text-lg font-semibold">{section.title}</h3>
            )}
            {section.content && (
              <div className="text-sm whitespace-pre-wrap prose prose-sm max-w-none">
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

  const currentQuestion = caseStudy.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / caseStudy.questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{caseStudy.title}</h2>
          {caseStudy.theme && (
            <p className="text-sm text-muted-foreground mt-1">{caseStudy.theme}</p>
          )}
        </div>
        <Button variant="outline" onClick={onExit}>
          <X className="h-4 w-4 mr-2" />
          Quitter
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Fixed Narrative Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4 max-h-[calc(100vh-2rem)]">
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
              <ScrollArea className="h-[calc(100vh-250px)]">
                {renderNarrative()}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Questions Panel */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Question {currentQuestionIndex + 1} sur {caseStudy.questions.length}
                </CardTitle>
                <Badge variant="outline">
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
                        <div key={key} className="flex items-start space-x-3">
                          <RadioGroupItem value={key} id={key} className="mt-1" />
                          <Label
                            htmlFor={key}
                            className="flex-1 cursor-pointer leading-relaxed"
                          >
                            <span className="font-medium mr-2">{key}:</span>
                            {value}
                          </Label>
                        </div>
                      ))}
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Précédent
                </Button>

                <div className="flex gap-2">
                  {caseStudy.questions.map((q, idx) => (
                    <Button
                      key={q.id}
                      variant={answers[q.id] ? "default" : "outline"}
                      size="sm"
                      className="w-10 h-10 p-0"
                      onClick={() => setCurrentQuestionIndex(idx)}
                    >
                      {idx + 1}
                    </Button>
                  ))}
                </div>

                {currentQuestionIndex < caseStudy.questions.length - 1 ? (
                  <Button onClick={handleNext}>
                    Suivant
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={submitting}>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
