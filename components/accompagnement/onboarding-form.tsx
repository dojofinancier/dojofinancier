"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  loadCourseChaptersAction,
  submitOnboardingAction,
} from "@/app/actions/accompagnement-onboarding";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { normalizePhoneToE164 } from "@/lib/utils/phone-e164";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Clock,
  MessageSquare,
  ListChecks,
} from "lucide-react";

interface OnboardingFormProps {
  enrollmentId: string;
  onComplete: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5;

type ChapterStatus =
  | "NOT_STARTED"
  | "READ_LOW"
  | "READ_SOMEWHAT"
  | "READ_CONFIDENT";

type Channel = "EMAIL" | "SMS";

interface ChapterRow {
  chapter: number;
  title: string;
  status: ChapterStatus;
}

const STATUS_LABELS: Record<ChapterStatus, { label: string; hint: string }> = {
  NOT_STARTED: {
    label: "Pas commencé",
    hint: "Je n'ai pas encore lu ce chapitre.",
  },
  READ_LOW: {
    label: "Lu, peu solide",
    hint: "Je l'ai parcouru mais je ne suis pas à l'aise.",
  },
  READ_SOMEWHAT: {
    label: "Lu, assez solide",
    hint: "Je le connais, avec quelques zones à revoir.",
  },
  READ_CONFIDENT: {
    label: "Lu, confiant",
    hint: "Je maîtrise ce chapitre.",
  },
};

/** Slider positions 0–3, same order as backend `ChapterAssessmentStatus`. */
const CHAPTER_STATUS_STEPS: ChapterStatus[] = [
  "NOT_STARTED",
  "READ_LOW",
  "READ_SOMEWHAT",
  "READ_CONFIDENT",
];

function chapterStatusToStep(status: ChapterStatus): number {
  const i = CHAPTER_STATUS_STEPS.indexOf(status);
  return i === -1 ? 0 : i;
}

function stepToChapterStatus(step: number): ChapterStatus {
  const s = CHAPTER_STATUS_STEPS[Math.max(0, Math.min(3, Math.round(step)))];
  return s ?? "NOT_STARTED";
}

export function OnboardingForm({ enrollmentId, onComplete }: OnboardingFormProps) {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  const [examDate, setExamDate] = useState<string>("");
  const [studyHours, setStudyHours] = useState(10);
  const [channel, setChannel] = useState<Channel>("EMAIL");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(true);

  const totalSteps = 5;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await loadCourseChaptersAction(enrollmentId);
      if (cancelled) return;
      if (res.success) {
        setChapters(
          res.chapters.map((c) => ({
            chapter: c.order,
            title: c.title,
            status: "NOT_STARTED" as ChapterStatus,
          }))
        );
        if (res.suggestedPhoneE164) {
          setPhone(res.suggestedPhoneE164);
        }
      } else {
        toast.error(res.error);
      }
      setChaptersLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [enrollmentId]);

  async function handleSubmit() {
    const smsPhone = normalizePhoneToE164(phone.trim());
    if (channel === "SMS" && !smsPhone) {
      toast.error(
        "Numéro invalide : format international (ex. +14165551234) ou 10 chiffres pour l’Amérique du Nord."
      );
      return;
    }
    if (chapters.length === 0) {
      toast.error("Aucun chapitre trouvé pour ce cours.");
      return;
    }

    setLoading(true);
    try {
      const result = await submitOnboardingAction({
        enrollmentId,
        examDate: examDate || null,
        studyHoursPerWeek: studyHours,
        channel,
        phoneE164: channel === "SMS" ? smsPhone : null,
        additionalNotes: notes || null,
        chapterAssessments: chapters.map((c) => ({
          chapter: c.chapter,
          topic: c.title,
          status: c.status,
        })),
      });

      if (result.success) {
        toast.success(
          "Configuration terminée ! Votre premier suivi quotidien arrive bientôt."
        );
        onComplete();
      } else {
        toast.error(result.error || "Une erreur est survenue");
      }
    } catch {
      toast.error("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  function nextStep() {
    if (step < totalSteps) setStep((step + 1) as Step);
  }
  function prevStep() {
    if (step > 1) setStep((step - 1) as Step);
  }

  const canAdvance =
    step === 3
      ? channel === "EMAIL" || normalizePhoneToE164(phone.trim()) != null
      : true;

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Configuration de votre suivi</CardTitle>
        <CardDescription>
          Étape {step} sur {totalSteps} — Quelques minutes pour personnaliser votre
          accompagnement
        </CardDescription>
        <div className="mt-4 flex gap-1.5">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <Calendar className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Date de votre examen</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Si vous connaissez votre date d'examen, indiquez-la. Cela nous permet
              d'adapter votre rythme.
            </p>
            <div>
              <Label htmlFor="examDate">Date d'examen (optionnel)</Label>
              <Input
                id="examDate"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="mt-1"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <Clock className="h-5 w-5" />
              <h3 className="text-lg font-semibold">
                Heures d'étude par semaine
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Combien d'heures par semaine pouvez-vous consacrer à vos études ?
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Heures par semaine</Label>
                <span className="text-2xl font-bold text-primary">
                  {studyHours}h
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={40}
                value={studyHours}
                onChange={(e) => setStudyHours(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>2h</span>
                <span>10h</span>
                <span>20h</span>
                <span>30h</span>
                <span>40h</span>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <MessageSquare className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Canal de communication</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Par quel canal souhaitez-vous recevoir vos suivis quotidiens ?
            </p>
            <RadioGroup
              value={channel}
              onValueChange={(v) => setChannel(v as Channel)}
              className="space-y-3"
            >
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/50">
                <RadioGroupItem value="EMAIL" id="channel-email" />
                <div>
                  <Label htmlFor="channel-email" className="cursor-pointer font-medium">
                    Email
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Un email avec un lien personnel vers votre suivi quotidien.
                  </p>
                </div>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/50">
                <RadioGroupItem value="SMS" id="channel-sms" />
                <div>
                  <Label htmlFor="channel-sms" className="cursor-pointer font-medium">
                    SMS
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Un SMS court avec un lien sécurisé (sans connexion).
                  </p>
                </div>
              </label>
            </RadioGroup>

            {channel === "SMS" && (
              <div className="space-y-3">
                <Alert>
                  <AlertTitle>Numéro mobile requis</AlertTitle>
                  <AlertDescription>
                    Choisis le numéro qui recevra le lien de chaque suivi. Tu peux
                    saisir +33…, +1…, ou 10 chiffres pour le Canada / É.-U. (nous
                    ajoutons +1 si besoin).
                  </AlertDescription>
                </Alert>
                <div>
                  <Label htmlFor="phone">
                    Numéro de téléphone{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+14165551234 ou 5145551234"
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Format international recommandé (E.164), indicatif pays inclus.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-primary">
              <ListChecks className="h-6 w-6 shrink-0" />
              <h3 className="text-xl font-semibold leading-snug">
                Votre niveau par chapitre
              </h3>
            </div>
            <p className="text-base text-muted-foreground leading-relaxed max-w-prose">
              Où en êtes-vous sur chacun des chapitres du cours ? Cela nous aide à
              orienter vos premières questions.
            </p>

            {chaptersLoading ? (
              <p className="text-base text-muted-foreground">
                Chargement des chapitres…
              </p>
            ) : chapters.length === 0 ? (
              <p className="text-base text-muted-foreground">
                Aucun chapitre trouvé pour ce cours.
              </p>
            ) : (
              <div className="space-y-6">
                {chapters.map((c, idx) => {
                  const step = chapterStatusToStep(c.status);
                  const current = STATUS_LABELS[c.status];
                  return (
                    <div
                      key={c.chapter}
                      className="rounded-xl border bg-card/50 p-5 sm:p-6 space-y-5"
                    >
                      <p className="text-base sm:text-lg font-semibold text-foreground leading-snug">
                        {c.title}
                      </p>
                      <div className="space-y-2">
                        <p className="text-base font-semibold text-primary">
                          {current.label}
                        </p>
                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                          {current.hint}
                        </p>
                      </div>
                      <div className="space-y-4 pt-1">
                        <input
                          type="range"
                          min={0}
                          max={3}
                          step={1}
                          value={step}
                          aria-label={`Niveau de confiance — ${c.title}`}
                          aria-valuemin={0}
                          aria-valuemax={3}
                          aria-valuenow={step}
                          aria-valuetext={current.label}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            setChapters((prev) => {
                              const next = [...prev];
                              next[idx] = {
                                ...next[idx],
                                status: stepToChapterStatus(v),
                              };
                              return next;
                            });
                          }}
                          className="w-full h-2.5 accent-primary cursor-pointer"
                        />
                        <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
                          {CHAPTER_STATUS_STEPS.map((sKey, i) => (
                            <button
                              key={sKey}
                              type="button"
                              onClick={() =>
                                setChapters((prev) => {
                                  const next = [...prev];
                                  next[idx] = {
                                    ...next[idx],
                                    status: sKey,
                                  };
                                  return next;
                                })
                              }
                              className={`rounded-lg px-1 py-2.5 sm:py-3 text-xs sm:text-sm leading-tight transition-colors min-h-[3rem] sm:min-h-[3.25rem] flex items-center justify-center ${
                                step === i
                                  ? "bg-primary/15 font-semibold text-primary ring-1 ring-primary/25"
                                  : "text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              {STATUS_LABELS[sKey].label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <CheckCircle2 className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Notes additionnelles</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Y a-t-il autre chose que nous devrions savoir pour personnaliser votre
              suivi ? (optionnel)
            </p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex. je travaille à temps plein, je préfère étudier le soir…"
              rows={4}
            />
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={step === 1}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>

          {step < totalSteps ? (
            <Button
              onClick={nextStep}
              disabled={!canAdvance}
              className="gap-2"
            >
              Suivant
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading || chaptersLoading}
              className="gap-2"
            >
              {loading ? "Enregistrement…" : "Commencer mon suivi"}
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
