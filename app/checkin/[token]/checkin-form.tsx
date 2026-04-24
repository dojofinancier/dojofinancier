"use client";

import * as React from "react";
import { CheckInType } from "@prisma/client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  submitCheckInAction,
  type SubmitResult,
} from "@/app/actions/checkin-submit";

export interface CheckInQuestion {
  answerId: string;
  source: "MCQ" | "OEQ";
  questionText: string;
  options: Record<string, string>;
  chapter: number;
  topic: string;
}

interface Props {
  token: string;
  type: CheckInType;
  questions: CheckInQuestion[];
}

const PAGE_SIZE = 5;

/** Brand green — matches accompagnement onboarding / transactional emails */
const brandBtn =
  "bg-[#00a63e] hover:bg-[#009030] text-white border border-black font-semibold shadow-sm";
const brandBtnOutline =
  "border-[#00a63e] text-[#00a63e] hover:bg-[#00a63e]/10 font-medium";
const brandRadioItem =
  "border-[#00a63e] text-[#00a63e] data-[state=checked]:bg-[#00a63e]/10 focus-visible:ring-[#00a63e]";

export function CheckInForm({ token, type, questions }: Props) {
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [yesNo, setYesNo] = React.useState<"yes" | "no" | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<SubmitResult | null>(null);
  const [pageIndex, setPageIndex] = React.useState(0);

  const totalPages =
    type === "WEEKLY" ? Math.ceil(questions.length / PAGE_SIZE) : 1;

  const visibleQuestions =
    type === "WEEKLY"
      ? questions.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE)
      : questions;

  const canSubmit = (() => {
    if (type === "WEEKLY") {
      // All MCQs must have an answer
      return questions.every((q) => answers[q.answerId]?.length);
    }
    if (type === "MISSED") {
      return yesNo !== null;
    }
    // LIGHT / MID_WEEK: each question must have an answer
    return questions.every((q) => answers[q.answerId]?.length);
  })();

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        token,
        answers: questions
          .filter((q) => answers[q.answerId]?.length)
          .map((q) => ({
            answerId: q.answerId,
            source: q.source,
            value: answers[q.answerId],
          })),
        yesNoReply:
          type === "MISSED" && yesNo !== null ? yesNo === "yes" : undefined,
      };
      const res = await submitCheckInAction(payload);
      if (!res.success) {
        setError(res.error ?? "Une erreur est survenue.");
      } else {
        setResult(res);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  }

  if (result?.success && result.summary) {
    return <Confirmation summary={result.summary} questions={questions} />;
  }

  return (
    <div>
      {type === "WEEKLY" && (
        <div className="mb-4 text-sm text-slate-500">
          Page {pageIndex + 1} sur {totalPages} — {questions.length} questions
        </div>
      )}

      <div className="space-y-8">
        {visibleQuestions.map((q, idx) => {
          const globalIndex =
            type === "WEEKLY" ? pageIndex * PAGE_SIZE + idx + 1 : idx + 1;
          return (
            <div key={q.answerId}>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Chapitre {q.chapter} · {q.topic}
              </p>
              <p className="mt-1 font-medium text-slate-900">
                {globalIndex}. {q.questionText}
              </p>

              {q.source === "MCQ" ? (
                <RadioGroup
                  value={answers[q.answerId] ?? ""}
                  onValueChange={(v) =>
                    setAnswers((prev) => ({ ...prev, [q.answerId]: v }))
                  }
                  className="mt-3 gap-2"
                >
                  {Object.entries(q.options).map(([letter, text]) => (
                    <label
                      key={letter}
                      htmlFor={`${q.answerId}-${letter}`}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:border-[#00a63e]/40 hover:bg-[#00a63e]/[0.06]"
                    >
                      <RadioGroupItem
                        id={`${q.answerId}-${letter}`}
                        value={letter}
                        className={brandRadioItem}
                      />
                      <span className="text-sm text-slate-700">
                        <strong className="mr-2">{letter}.</strong>
                        {text}
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              ) : (
                <Textarea
                  rows={4}
                  className="mt-3 focus-visible:border-[#00a63e] focus-visible:ring-[#00a63e]/25"
                  placeholder="Votre réponse…"
                  value={answers[q.answerId] ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [q.answerId]: e.target.value,
                    }))
                  }
                />
              )}
            </div>
          );
        })}

        {type === "MISSED" && (
          <div className="border-t pt-6">
            <Label className="text-sm font-medium text-slate-900">
              Tu fais ton bloc d'étude aujourd'hui ?
            </Label>
            <RadioGroup
              value={yesNo ?? ""}
              onValueChange={(v) => setYesNo(v as "yes" | "no")}
              className="mt-3 flex gap-4"
            >
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 transition-colors hover:border-[#00a63e]/40 hover:bg-[#00a63e]/[0.06]">
                <RadioGroupItem
                  id="yesno-yes"
                  value="yes"
                  className={brandRadioItem}
                />
                <span>Oui</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 transition-colors hover:border-[#00a63e]/40 hover:bg-[#00a63e]/[0.06]">
                <RadioGroupItem
                  id="yesno-no"
                  value="no"
                  className={brandRadioItem}
                />
                <span>Non</span>
              </label>
            </RadioGroup>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between">
        {type === "WEEKLY" && totalPages > 1 ? (
          <Button
            type="button"
            variant="outline"
            className={brandBtnOutline}
            disabled={pageIndex === 0}
            onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
          >
            Précédent
          </Button>
        ) : (
          <span />
        )}

        {type === "WEEKLY" && pageIndex < totalPages - 1 ? (
          <Button
            type="button"
            className={brandBtn}
            onClick={() => setPageIndex((i) => i + 1)}
            disabled={visibleQuestions.some((q) => !answers[q.answerId])}
          >
            Suivant
          </Button>
        ) : (
          <Button
            type="button"
            className={brandBtn}
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Envoi…" : "Soumettre"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Confirmation({
  summary,
  questions,
}: {
  summary: NonNullable<SubmitResult["summary"]>;
  questions: CheckInQuestion[];
}) {
  const byId = new Map(questions.map((q) => [q.answerId, q]));
  return (
    <div>
      <div className="mb-6 rounded-lg border-l-4 border-[#00a63e] bg-[#ecfdf5] p-4 text-[#14532d]">
        <p className="text-lg font-semibold">Merci pour votre suivi quotidien !</p>
        <p className="mt-1 text-sm">
          {summary.score !== null
            ? `Score : ${summary.score}% · Taux de réponse : ${summary.responseRate}%`
            : `Taux de réponse : ${summary.responseRate}%`}
        </p>
      </div>

      <div className="space-y-5">
        {summary.perQuestion.map((pq) => {
          const q = byId.get(pq.answerId);
          if (!q) return null;
          const correctLabel =
            pq.isCorrect === true
              ? "Correct"
              : pq.isCorrect === false
                ? "Incorrect"
                : "À revoir";
          const badgeClass =
            pq.isCorrect === true
              ? "bg-[#00a63e]/15 text-[#14532d]"
              : pq.isCorrect === false
                ? "bg-rose-100 text-rose-700"
                : "bg-slate-100 text-slate-700";
          return (
            <div key={pq.answerId} className="rounded-lg border border-slate-200 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Chapitre {q.chapter} · {q.topic}
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}
                >
                  {correctLabel}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-900">{q.questionText}</p>
              {pq.source === "MCQ" && pq.correctAnswer ? (
                <p className="mt-2 text-sm text-slate-600">
                  Bonne réponse : <strong>{pq.correctAnswer}</strong>
                </p>
              ) : null}
              {pq.source === "MCQ" && pq.explanation ? (
                <p className="mt-2 text-sm text-slate-600">{pq.explanation}</p>
              ) : null}
              {pq.source === "OEQ" && pq.feedback ? (
                <p className="mt-2 text-sm text-slate-600">{pq.feedback}</p>
              ) : null}
              {pq.source === "OEQ" && pq.modelAnswerSnippet ? (
                <div className="mt-3 rounded bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Réponse modèle (extrait)
                  </p>
                  <p>{pq.modelAnswerSnippet}</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-sm text-slate-500">
        Vos réponses ont été enregistrées. Rendez-vous dans votre tableau de bord
        pour votre progression.
      </p>
    </div>
  );
}
