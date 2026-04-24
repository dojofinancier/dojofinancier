"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OnboardingForm } from "./onboarding-form";
import { AccompagnementPaymentDialog } from "./accompagnement-payment-dialog";
import {
  getAccompagnementStatusAction,
  getAccompagnementEnrollmentDashboardBundleAction,
  getCheckInHistoryAction,
  getAccompagnementPreferencesAction,
  updateAccompagnementPreferencesAction,
  setAccompagnementCheckInsPausedAction,
  acknowledgeUnrealisticScheduleAction,
  submitWeeklyChapterConfirmationsAction,
  type AccompagnementStatus,
  type AccompagnementEnrollmentSummary,
  type AccompagnementStats,
  type CheckInHistoryEntry,
  type WeeklyPlanBundle,
  type WeeklyReviewSummary,
  type WeakAreaEntry,
  type StudyPlanHorizonV1,
} from "@/app/actions/accompagnement";
import {
  Flame,
  Target,
  TrendingUp,
  CalendarClock,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  BookOpen,
  MessageSquare,
  FileText,
  Settings2,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { normalizePhoneToE164 } from "@/lib/utils/phone-e164";

type AccompagnementProductOffer = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  courseId: string;
  courseTitle: string;
};

export function StudentAccompagnementTab() {
  const [status, setStatus] = useState<AccompagnementStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableProducts, setAvailableProducts] = useState<
    AccompagnementProductOffer[]
  >([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedTabId, setSelectedTabId] = useState<string>("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const statusResult = await getAccompagnementStatusAction();
      if (statusResult.success && statusResult.data) {
        setStatus(statusResult.data);
        setAvailableProducts(statusResult.availableProducts ?? []);
        if (statusResult.currentUserId) {
          setUserId(statusResult.currentUserId);
        }
      }
    } catch (error) {
      console.error("Failed to load accompagnement data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const enrollments = status?.enrollments ?? [];
    if (enrollments.length === 0) {
      setSelectedTabId("");
      return;
    }
    setSelectedTabId((prev) => {
      if (prev && enrollments.some((e) => e.id === prev)) return prev;
      const needsSetup = enrollments.find((e) => !e.onboardingCompleted);
      return (needsSetup ?? enrollments[0]).id;
    });
  }, [status]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-lg border border-dashed animate-pulse bg-muted/40"
          />
        ))}
      </div>
    );
  }

  const enrollments = status?.enrollments ?? [];

  if (enrollments.length === 0) {
    return (
      <NotEnrolledView
        products={availableProducts}
        userId={userId}
        onEnrolled={loadData}
      />
    );
  }

  const effectiveTabId =
    selectedTabId && enrollments.some((e) => e.id === selectedTabId)
      ? selectedTabId
      : enrollments[0].id;

  return (
    <div className="space-y-8">
      <Tabs value={effectiveTabId} onValueChange={setSelectedTabId}>
        <TabsList className="flex h-auto min-h-10 w-full flex-wrap justify-start gap-1 p-1">
          {enrollments.map((e) => (
            <TabsTrigger
              key={e.id}
              value={e.id}
              className="gap-2 data-[state=active]:bg-background"
            >
              <span className="max-w-[200px] truncate">
                {e.product.courseTitle}
              </span>
              {!e.onboardingCompleted && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  À configurer
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {enrollments.map((e) => (
          <TabsContent key={e.id} value={e.id} className="mt-6 space-y-6">
            {effectiveTabId === e.id ? (
              <EnrollmentTabPanel enrollment={e} onUpdated={loadData} />
            ) : null}
          </TabsContent>
        ))}
      </Tabs>

      {availableProducts.length > 0 && (
        <MoreAccompagnementsSection
          products={availableProducts}
          userId={userId}
          onEnrolled={loadData}
        />
      )}
    </div>
  );
}

type AccompagnementPrefsData = {
  channel: "EMAIL" | "SMS";
  phoneE164: string | null;
  examDate: string;
  checkInsPaused: boolean;
};

function AccompagnementPreferencesCard({
  enrollmentId,
  initial,
  onSaved,
}: {
  enrollmentId: string;
  initial: AccompagnementPrefsData;
  onSaved: () => void | Promise<void>;
}) {
  const [channel, setChannel] = useState<"EMAIL" | "SMS">(initial.channel);
  const [phone, setPhone] = useState(initial.phoneE164 ?? "");
  const [examDate, setExamDate] = useState(initial.examDate);
  const [checkInsPaused, setCheckInsPaused] = useState(initial.checkInsPaused);
  const [saving, setSaving] = useState(false);
  const [pauseSaving, setPauseSaving] = useState(false);

  useEffect(() => {
    setChannel(initial.channel);
    setPhone(initial.phoneE164 ?? "");
    setExamDate(initial.examDate);
    setCheckInsPaused(initial.checkInsPaused);
  }, [
    initial.channel,
    initial.phoneE164,
    initial.examDate,
    initial.checkInsPaused,
  ]);

  async function handleSave() {
    const smsPhone = normalizePhoneToE164(phone.trim());
    if (channel === "SMS" && !smsPhone) {
      toast.error(
        "Numéro invalide : format international (ex. +14165551234) ou 10 chiffres pour le Canada / É.-U."
      );
      return;
    }
    setSaving(true);
    try {
      const res = await updateAccompagnementPreferencesAction({
        enrollmentId,
        channel,
        phoneE164: channel === "SMS" ? smsPhone : null,
        examDate: examDate.trim() === "" ? null : examDate,
      });
      if (res.success) {
        toast.success("Préférences enregistrées.");
        await onSaved();
      } else {
        toast.error(res.error || "Impossible d'enregistrer");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Préférences de suivi
        </CardTitle>
        <CardDescription>
          Canal des suivis quotidiens et date d&apos;examen utilisée pour votre rythme.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <Label htmlFor={`exam-${enrollmentId}`} className="text-foreground">
            Date d&apos;examen (optionnel)
          </Label>
          <Input
            id={`exam-${enrollmentId}`}
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="mt-1.5 max-w-xs"
          />
        </div>

        <div className="space-y-2">
          <Label>Canal des suivis quotidiens</Label>
          <RadioGroup
            value={channel}
            onValueChange={(v) => setChannel(v as "EMAIL" | "SMS")}
            className="space-y-2"
          >
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50">
              <RadioGroupItem value="EMAIL" id={`pref-email-${enrollmentId}`} />
              <div>
                <Label
                  htmlFor={`pref-email-${enrollmentId}`}
                  className="cursor-pointer font-medium"
                >
                  Courriel
                </Label>
                <p className="text-sm text-muted-foreground">
                  Lien personnel vers chaque suivi quotidien.
                </p>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50">
              <RadioGroupItem value="SMS" id={`pref-sms-${enrollmentId}`} />
              <div>
                <Label
                  htmlFor={`pref-sms-${enrollmentId}`}
                  className="cursor-pointer font-medium"
                >
                  SMS
                </Label>
                <p className="text-sm text-muted-foreground">
                  Message court avec lien sécurisé.
                </p>
              </div>
            </label>
          </RadioGroup>
        </div>

        {channel === "SMS" && (
          <div className="space-y-3">
            <Alert>
              <AlertTitle>SMS : numéro obligatoire</AlertTitle>
              <AlertDescription>
                Indique le mobile qui recevra chaque lien de suivi. Si ton profil
                principal n&apos;avait pas de numéro, saisis-le ici. Formats
                acceptés : +33…, +1…, ou 10 chiffres (Canada / É.-U., nous
                ajoutons +1 si besoin).
              </AlertDescription>
            </Alert>
            <div>
              <Label htmlFor={`pref-phone-${enrollmentId}`}>
                Numéro de téléphone{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`pref-phone-${enrollmentId}`}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+14165551234 ou 5145551234"
                className="mt-1.5 max-w-md"
                autoComplete="tel"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Format international (E.164) recommandé, indicatif pays inclus.
              </p>
            </div>
          </div>
        )}

        <Separator />

        <div className="space-y-3">
          <div>
            <Label className="text-base">Suivis quotidiens automatiques</Label>
            <p className="text-sm text-muted-foreground mt-1">
              {checkInsPaused
                ? "Tu ne reçois plus de courriel ni de SMS pour cette inscription. Le tableau de bord reste disponible."
                : "Un lien t’est envoyé selon le calendrier du programme (même horaire chaque jour)."}
            </p>
          </div>
          {checkInsPaused ? (
            <Alert>
              <AlertTitle>Suivi en pause</AlertTitle>
              <AlertDescription>
                Les envois sont suspendus. Clique sur « Recommencer le suivi »
                pour réactiver les messages.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? "Enregistrement…" : "Enregistrer les préférences"}
          </Button>
          <Button
            type="button"
            variant={checkInsPaused ? "default" : "outline"}
            className="w-full sm:w-auto sm:shrink-0"
            disabled={pauseSaving}
            onClick={async () => {
              setPauseSaving(true);
              try {
                const nextPaused = !checkInsPaused;
                const res = await setAccompagnementCheckInsPausedAction({
                  enrollmentId,
                  paused: nextPaused,
                });
                if (res.success) {
                  setCheckInsPaused(nextPaused);
                  toast.success(
                    nextPaused
                      ? "Les suivis quotidiens sont en pause."
                      : "C’est reparti : les envois reprendront au prochain créneau."
                  );
                  await onSaved();
                } else {
                  toast.error(res.error ?? "Impossible de mettre à jour");
                }
              } finally {
                setPauseSaving(false);
              }
            }}
          >
            {pauseSaving
              ? "Enregistrement…"
              : checkInsPaused
                ? "Recommencer le suivi"
                : "Mettre les suivis quotidiens en pause"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EnrollmentTabPanel({
  enrollment,
  onUpdated,
}: {
  enrollment: AccompagnementEnrollmentSummary;
  onUpdated: () => void;
}) {
  if (!enrollment.onboardingCompleted) {
    return (
      <OnboardingForm enrollmentId={enrollment.id} onComplete={onUpdated} />
    );
  }
  return <EnrollmentDashboard enrollmentId={enrollment.id} />;
}

function EnrollmentDashboard({ enrollmentId }: { enrollmentId: string }) {
  const [stats, setStats] = useState<AccompagnementStats | null>(null);
  const [history, setHistory] = useState<CheckInHistoryEntry[]>([]);
  const [weekly, setWeekly] = useState<WeeklyPlanBundle | null>(null);
  const [review, setReview] = useState<WeeklyReviewSummary | null>(null);
  const [weakAreas, setWeakAreas] = useState<WeakAreaEntry[]>([]);
  const [prefs, setPrefs] = useState<AccompagnementPrefsData | null>(null);
  const [studyPlanHorizon, setStudyPlanHorizon] =
    useState<StudyPlanHorizonV1 | null>(null);
  const [compressedMode, setCompressedMode] = useState(false);
  const [showUnrealisticScheduleModal, setShowUnrealisticScheduleModal] =
    useState(false);
  const [unrealisticModalOpen, setUnrealisticModalOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [detailLoading, setDetailLoading] = useState(true);

  const fetchDashboard = useCallback(
    async (historyPg: number, withSpinner: boolean) => {
      if (withSpinner) setDetailLoading(true);
      try {
        const bundleRes =
          await getAccompagnementEnrollmentDashboardBundleAction(
            enrollmentId,
            historyPg,
            10
          );

        if (bundleRes.success && bundleRes.data) {
          const d = bundleRes.data;
          setStats(d.stats);
          setHistory(d.history);
          setHistoryTotal(d.historyTotal);
          setWeekly(d.weekly);
          setReview(d.review);
          setWeakAreas(d.weakAreas);
          setPrefs(d.prefs);
          setStudyPlanHorizon(d.studyPlanHorizon);
          setCompressedMode(d.compressedMode);
          setShowUnrealisticScheduleModal(d.showUnrealisticScheduleModal);
        } else {
          setStats(null);
          setHistory([]);
          setHistoryTotal(0);
          setWeekly(null);
          setReview(null);
          setWeakAreas([]);
          setPrefs(null);
          setStudyPlanHorizon(null);
          setCompressedMode(false);
          setShowUnrealisticScheduleModal(false);
        }
      } finally {
        if (withSpinner) setDetailLoading(false);
      }
    },
    [enrollmentId]
  );

  useEffect(() => {
    setHistoryPage(1);
    void fetchDashboard(1, true);
  }, [enrollmentId, fetchDashboard]);

  useEffect(() => {
    if (showUnrealisticScheduleModal) setUnrealisticModalOpen(true);
  }, [showUnrealisticScheduleModal]);

  async function loadHistoryPage(page: number) {
    setHistoryPage(page);
    const res = await getCheckInHistoryAction(enrollmentId, page, 10);
    if (res.success && res.data) {
      setHistory(res.data);
      setHistoryTotal(res.total ?? 0);
    }
  }

  if (detailLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-28 rounded-lg border border-dashed animate-pulse bg-muted/40"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Dialog open={unrealisticModalOpen} onOpenChange={setUnrealisticModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Planning très serré</DialogTitle>
            <DialogDescription className="text-left text-sm text-muted-foreground">
              Avec ta date d&apos;examen et ton rythme déclaré, le parcours
              dépasse ce qu&apos;on peut raisonnablement caser. Tu peux ajuster
              ta date dans les préférences, ou activer un mode rythme serré :
              on compresse les priorités pour coller à l&apos;échéance (tu
              pourras toujours revenir en arrière si tu repousses l&apos;examen).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setUnrealisticModalOpen(false)}
            >
              Plus tard
            </Button>
            <Button
              onClick={async () => {
                const res = await acknowledgeUnrealisticScheduleAction(
                  enrollmentId
                );
                if (res.success) {
                  toast.success("Mode rythme serré activé");
                  setUnrealisticModalOpen(false);
                  await fetchDashboard(historyPage, false);
                } else {
                  toast.error(res.error ?? "Échec");
                }
              }}
            >
              J&apos;active le mode rythme serré
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {stats && (
        <div className="space-y-2">
          {compressedMode && (
            <div className="flex justify-end">
              <Badge variant="outline" className="text-xs font-normal">
                Mode rythme serré
              </Badge>
            </div>
          )}
          <StatsRow stats={stats} />
        </div>
      )}

      {prefs && (
        <AccompagnementPreferencesCard
          enrollmentId={enrollmentId}
          initial={prefs}
          onSaved={() => void fetchDashboard(historyPage, false)}
        />
      )}

      {review && <WeeklyReviewCard review={review} />}

      {weekly &&
        (weekly.plannedChapters.length > 0 ||
          weekly.checkIns.length > 0 ||
          (studyPlanHorizon && studyPlanHorizon.weeks.length > 0)) && (
          <WeeklyPlanCard
            enrollmentId={enrollmentId}
            weekly={weekly}
            studyPlan={studyPlanHorizon}
            onUpdated={() => void fetchDashboard(historyPage, false)}
          />
        )}

      {weakAreas.length > 0 && <WeakAreasCard items={weakAreas} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Historique des suivis quotidiens
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun suivi quotidien pour le moment. Vos premiers suivis quotidiens arriveront
              bientôt !
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <CheckInHistoryCard key={entry.id} entry={entry} />
              ))}

              {historyTotal > 10 && (
                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={historyPage === 1}
                    onClick={() => loadHistoryPage(historyPage - 1)}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Précédent
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {historyPage} sur {Math.ceil(historyTotal / 10)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={historyPage >= Math.ceil(historyTotal / 10)}
                    onClick={() => loadHistoryPage(historyPage + 1)}
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MoreAccompagnementsSection({
  products,
  userId,
  onEnrolled,
}: {
  products: AccompagnementProductOffer[];
  userId: string | null;
  onEnrolled: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Autres accompagnements</CardTitle>
        <p className="text-sm text-muted-foreground font-normal">
          Souscrivez un suivi pour une autre formation à laquelle vous êtes
          inscrit·e.
        </p>
      </CardHeader>
      <CardContent>
        <AccompagnementProductOfferList
          products={products}
          userId={userId}
          onEnrolled={onEnrolled}
        />
      </CardContent>
    </Card>
  );
}

// ─── Stats Row ────────────────────────────────────────────────────────────

function StatsRow({ stats }: { stats: AccompagnementStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6 text-center">
          <Flame className="h-6 w-6 mx-auto mb-2 text-orange-500" />
          <p className="text-2xl font-bold">{stats.streak}</p>
          <p className="text-xs text-muted-foreground">Jours consécutifs</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6 text-center">
          <Target className="h-6 w-6 mx-auto mb-2 text-blue-500" />
          <p className="text-2xl font-bold">{stats.responseRate}%</p>
          <p className="text-xs text-muted-foreground">Taux de réponse</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6 text-center">
          <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-500" />
          <p className="text-2xl font-bold">
            {stats.avgScore !== null ? `${stats.avgScore}%` : "—"}
          </p>
          <p className="text-xs text-muted-foreground">Score moyen MCQ</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6 text-center">
          <CalendarClock className="h-6 w-6 mx-auto mb-2 text-purple-500" />
          <p className="text-2xl font-bold">
            {stats.daysUntilExam !== null ? stats.daysUntilExam : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {stats.daysUntilExam !== null
              ? "Jours avant l'examen"
              : "Pas de date d'examen"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Weekly review + plan ────────────────────────────────────────────────

function WeeklyReviewCard({ review }: { review: WeeklyReviewSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Bilan de la semaine du{" "}
          {format(new Date(review.weekStartDate), "d MMM", { locale: fr })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Score quiz</p>
            <p className="text-xl font-semibold">
              {review.score !== null ? `${review.score}%` : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Constance</p>
            <p className="text-xl font-semibold">
              {review.responseRate !== null ? `${review.responseRate}%` : "—"}
            </p>
          </div>
        </div>
        {review.summaryMarkdown && (
          <div className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">
            {review.summaryMarkdown}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function phaseLabelFr(phase: string | null): string {
  switch (phase) {
    case "apprendre":
      return "Apprendre";
    case "réviser":
      return "Réviser";
    case "pratiquer":
      return "Pratiquer";
    default:
      return phase ?? "—";
  }
}

function planStatusLabelFr(status: string | null): string {
  switch (status) {
    case "on_track":
      return "Sur la bonne voie";
    case "tight":
      return "Serré";
    case "at_risk":
      return "À risque";
    case "unrealistic":
      return "Très ambitieux";
    default:
      return status ?? "—";
  }
}

function WeeklyPlanCard({
  enrollmentId,
  weekly,
  studyPlan,
  onUpdated,
}: {
  enrollmentId: string;
  weekly: WeeklyPlanBundle;
  studyPlan: StudyPlanHorizonV1 | null;
  onUpdated: () => void | Promise<void>;
}) {
  const [confirmSaving, setConfirmSaving] = useState(false);
  const [chapterStatus, setChapterStatus] = useState<
    Record<number, "COMPLETED" | "PARTIAL" | "NOT_COMPLETED" | "">
  >({});

  useEffect(() => {
    const next: Record<number, "COMPLETED" | "PARTIAL" | "NOT_COMPLETED" | ""> =
      {};
    for (const c of weekly.plannedChapters) next[c] = "";
    for (const row of weekly.chapterConfirmations) {
      next[row.chapter] = row.status;
    }
    setChapterStatus(next);
  }, [weekly]);

  const now = Date.now();
  const currentWeekIdx =
    studyPlan?.weeks.findIndex((w) => {
      const a = new Date(w.weekStart).getTime();
      const b = new Date(w.weekEnd).getTime();
      return now >= a && now <= b;
    }) ?? 0;
  const accordionDefault =
    studyPlan && studyPlan.weeks.length > 0
      ? `w-${Math.max(0, currentWeekIdx)}`
      : undefined;

  async function saveChapterConfirmations() {
    const confirmations = weekly.plannedChapters
      .filter((ch) => {
        const s = chapterStatus[ch];
        return s === "COMPLETED" || s === "PARTIAL" || s === "NOT_COMPLETED";
      })
      .map((chapter) => ({
        chapter,
        status: chapterStatus[chapter] as
          | "COMPLETED"
          | "PARTIAL"
          | "NOT_COMPLETED",
      }));

    if (confirmations.length === 0) {
      toast.error("Choisis au moins un statut pour enregistrer.");
      return;
    }

    setConfirmSaving(true);
    try {
      const res = await submitWeeklyChapterConfirmationsAction({
        enrollmentId,
        confirmations,
      });
      if (res.success) {
        toast.success("C'est noté pour tes chapitres.");
        await onUpdated();
      } else {
        toast.error(res.error ?? "Échec");
      }
    } finally {
      setConfirmSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Plan de la semaine
        </CardTitle>
        {(weekly.phase || weekly.planStatus) && (
          <CardDescription className="flex flex-wrap gap-2">
            {weekly.phase ? (
              <Badge variant="secondary">{phaseLabelFr(weekly.phase)}</Badge>
            ) : null}
            {weekly.planStatus ? (
              <Badge variant="outline">
                {planStatusLabelFr(weekly.planStatus)}
              </Badge>
            ) : null}
            {weekly.estimatedHours != null ? (
              <span className="text-xs text-muted-foreground">
                ~{weekly.estimatedHours} h / semaine
              </span>
            ) : null}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {weekly.weeklyGoalSummary ? (
          <p className="text-sm rounded-md bg-muted/50 p-3">
            {weekly.weeklyGoalSummary}
          </p>
        ) : null}

        {weekly.selectedChaptersDetail.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Détail des chapitres
            </p>
            <ul className="space-y-2 text-sm">
              {weekly.selectedChaptersDetail.map((s) => (
                <li
                  key={s.chapter}
                  className="rounded-lg border border-border/80 p-2.5"
                >
                  <p className="font-medium">Chapitre {s.chapter}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {s.reason}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {s.primaryModality} · {s.secondaryModality}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {weekly.plannedChapters.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Chapitres ciblés
            </p>
            <div className="flex flex-wrap gap-1.5">
              {weekly.plannedChapters.map((c) => (
                <Badge key={c} variant="secondary">
                  Chapitre {c}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {weekly.plannedChapters.length > 0 && (
          <div className="rounded-lg border p-3 space-y-3">
            <p className="text-sm font-medium">
              Où en es-tu sur les chapitres de cette semaine ?
            </p>
            <p className="text-xs text-muted-foreground">
              Sans réponse, on s&apos;appuie surtout sur tes quiz et suivis. Une
              indication ici aide à ajuster ton plan.
            </p>
            <div className="space-y-4">
              {weekly.plannedChapters.map((ch) => (
                <div key={ch} className="space-y-2">
                  <p className="text-xs font-medium">Chapitre {ch}</p>
                  <RadioGroup
                    value={chapterStatus[ch] || ""}
                    onValueChange={(v) =>
                      setChapterStatus((prev) => ({
                        ...prev,
                        [ch]: v as
                          | "COMPLETED"
                          | "PARTIAL"
                          | "NOT_COMPLETED"
                          | "",
                      }))
                    }
                    className="grid gap-1.5"
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="COMPLETED" id={`cc-${ch}-ok`} />
                      <span>Plutôt complété</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="PARTIAL" id={`cc-${ch}-mid`} />
                      <span>En partie</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="NOT_COMPLETED" id={`cc-${ch}-no`} />
                      <span>Pas vraiment</span>
                    </label>
                  </RadioGroup>
                </div>
              ))}
            </div>
            <Button
              size="sm"
              disabled={confirmSaving}
              onClick={() => void saveChapterConfirmations()}
            >
              {confirmSaving ? "Enregistrement…" : "Enregistrer mon bilan"}
            </Button>
          </div>
        )}

        {weekly.focusTopics.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Sujets prioritaires
            </p>
            <div className="flex flex-wrap gap-1.5">
              {weekly.focusTopics.map((t) => (
                <Badge key={t} variant="outline">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {studyPlan && studyPlan.weeks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Vue jusqu&apos;à l&apos;examen
            </p>
            <Accordion
              type="single"
              collapsible
              defaultValue={accordionDefault}
              className="rounded-lg border px-3"
            >
              {studyPlan.weeks.map((w, i) => {
                const isCurrent = i === currentWeekIdx;
                return (
                  <AccordionItem key={w.weekStart} value={`w-${i}`} className="border-b-0">
                    <AccordionTrigger
                      className={
                        isCurrent ? "text-foreground font-semibold" : "text-muted-foreground"
                      }
                    >
                      <span className="flex flex-col items-start gap-0.5 text-left sm:flex-row sm:items-center sm:gap-2">
                        <span>
                          {format(new Date(w.weekStart), "d MMM", { locale: fr })} –{" "}
                          {format(new Date(w.weekEnd), "d MMM yyyy", { locale: fr })}
                        </span>
                        {isCurrent ? (
                          <Badge variant="default" className="text-[10px]">
                            Semaine en cours
                          </Badge>
                        ) : w.isSimulated ? (
                          <Badge variant="outline" className="text-[10px] font-normal">
                            Projection
                          </Badge>
                        ) : null}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pb-2 text-sm">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{phaseLabelFr(w.phase)}</Badge>
                          <Badge variant="outline">
                            {planStatusLabelFr(w.planStatus)}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">{w.weeklyGoalSummary}</p>
                        <div className="flex flex-wrap gap-1">
                          {w.plannedChapterNumbers.map((c) => (
                            <Badge key={c} variant="secondary">
                              Ch. {c}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        )}

        {weekly.checkIns.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Suivis quotidiens de la semaine
            </p>
            <div className="grid gap-2">
              {weekly.checkIns.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border p-2.5"
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon status={entry.status} />
                    <div>
                      <p className="text-sm font-medium">
                        {checkInTypeLabel(entry.type)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(
                          new Date(entry.scheduledFor),
                          "EEEE d MMM",
                          { locale: fr }
                        )}
                      </p>
                    </div>
                  </div>
                  <Badge variant={statusVariant(entry.status)}>
                    {statusLabel(entry.status)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WeakAreasCard({ items }: { items: WeakAreaEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Zones à renforcer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((w, i) => (
            <li
              key={`${w.chapter}-${w.topic}-${i}`}
              className="flex items-center justify-between rounded-lg border p-2.5 text-sm"
            >
              <div>
                <p className="font-medium">{w.topic}</p>
                <p className="text-xs text-muted-foreground">
                  Chapitre {w.chapter} · vu{" "}
                  {format(new Date(w.lastSeen), "d MMM", { locale: fr })}
                </p>
              </div>
              <Badge variant="outline">{w.hitCount}×</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ─── History card ─────────────────────────────────────────────────────────

function CheckInHistoryCard({ entry }: { entry: CheckInHistoryEntry }) {
  const [expanded, setExpanded] = useState(false);
  const answered = entry.status === "RESPONDED";

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        className="w-full flex items-center justify-between p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <StatusIcon status={entry.status} />
          <div>
            <p className="font-medium text-sm">
              {checkInTypeLabel(entry.type)}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(
                new Date(entry.scheduledFor),
                "EEEE d MMMM yyyy",
                { locale: fr }
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {entry.response?.score !== null &&
            entry.response?.score !== undefined && (
              <Badge
                variant={
                  entry.response.score >= 50 ? "default" : "destructive"
                }
              >
                {entry.response.score}%
              </Badge>
            )}
          <Badge variant={statusVariant(entry.status)}>
            {statusLabel(entry.status)}
          </Badge>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <Separator />
          {entry.contextLine && (
            <p className="rounded-md bg-muted/40 p-3 text-sm italic">
              {entry.contextLine}
            </p>
          )}

          {entry.type === "MISSED" && entry.response && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Bloc d'étude prévu aujourd'hui ?
              </p>
              <Badge
                variant={entry.response.yesNoReply ? "default" : "secondary"}
              >
                {entry.response.yesNoReply === true
                  ? "Oui, je m'y remets"
                  : entry.response.yesNoReply === false
                    ? "Non, pas aujourd'hui"
                    : "Aucune réponse"}
              </Badge>
            </div>
          )}

          {entry.answers.length === 0 && !answered && (
            <p className="text-sm text-muted-foreground">
              Aucune réponse enregistrée.
            </p>
          )}

          {entry.answers.map((a) => (
            <AnswerRow key={a.orderIndex} a={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function AnswerRow({
  a,
}: {
  a: CheckInHistoryEntry["answers"][number];
}) {
  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {a.source} · Chapitre {a.chapter} — {a.topic}
        </p>
        {a.isCorrect !== null &&
          (a.isCorrect ? (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Correct
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="h-3 w-3 mr-1" />
              Incorrect
            </Badge>
          ))}
      </div>
      <p className="text-sm font-medium">{a.questionText}</p>

      {a.options && (
        <div className="space-y-1">
          {Object.entries(a.options).map(([key, value]) => {
            const isCorrect = a.correctAnswer === key;
            const isStudent = a.studentAnswer === key;
            return (
              <p
                key={key}
                className={`rounded px-2 py-1 text-sm ${
                  isCorrect
                    ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                    : isStudent
                      ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                      : ""
                }`}
              >
                <strong>{key}.</strong> {value}
                {isCorrect && " ✓"}
                {isStudent && !isCorrect && " (votre réponse)"}
              </p>
            );
          })}
        </div>
      )}

      {a.source === "OEQ" && a.studentAnswer && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Votre réponse
          </p>
          <p className="whitespace-pre-wrap rounded bg-muted/40 px-2 py-1 text-sm">
            {a.studentAnswer}
          </p>
        </div>
      )}

      {a.source === "OEQ" && (a.aiLabel || a.aiFeedback) && (
        <div className="rounded-md bg-blue-50 p-3 text-sm dark:bg-blue-950/30">
          <p className="flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-300">
            <MessageSquare className="h-3.5 w-3.5" />
            Évaluation
            {a.aiLabel && (
              <Badge variant="outline" className="ml-auto">
                {a.aiLabel}
              </Badge>
            )}
          </p>
          {a.aiFeedback && (
            <p className="mt-1 text-blue-900 dark:text-blue-200">
              {a.aiFeedback}
            </p>
          )}
        </div>
      )}

      {a.source === "OEQ" && a.modelAnswer && (
        <details className="text-sm">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            Voir la réponse modèle
          </summary>
          <p className="mt-1 whitespace-pre-wrap rounded bg-muted/40 px-2 py-1">
            {a.modelAnswer}
          </p>
        </details>
      )}

      {a.explanation && (
        <details className="text-sm">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            Explication
          </summary>
          <p className="mt-1 whitespace-pre-wrap rounded bg-blue-50 px-2 py-1 text-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
            {a.explanation}
          </p>
        </details>
      )}
    </div>
  );
}

// ─── Not enrolled view + payment ─────────────────────────────────────────

function AccompagnementProductOfferList({
  products,
  userId,
  onEnrolled,
}: {
  products: AccompagnementProductOffer[];
  userId: string | null;
  onEnrolled: () => void;
}) {
  const [selected, setSelected] = useState<AccompagnementProductOffer | null>(
    null
  );

  return (
    <div className="space-y-4">
      {products.map((product) => (
        <Card key={product.id} className="overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <h3 className="text-xl font-bold">{product.title}</h3>
            <p className="text-blue-100 mt-1">{product.courseTitle}</p>
          </div>
          <CardContent className="pt-6">
            {product.description && (
              <p className="text-sm text-muted-foreground mb-4">
                {product.description}
              </p>
            )}
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold">
                {product.price.toFixed(2)} $
              </p>
              <Button
                className="gap-2"
                onClick={() => setSelected(product)}
                disabled={!userId}
              >
                S'inscrire
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {selected && userId && (
        <AccompagnementPaymentDialog
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          productId={selected.id}
          productTitle={selected.title}
          courseTitle={selected.courseTitle}
          amount={selected.price}
          onSuccess={onEnrolled}
        />
      )}
    </div>
  );
}

function NotEnrolledView({
  products,
  userId,
  onEnrolled,
}: {
  products: AccompagnementProductOffer[];
  userId: string | null;
  onEnrolled: () => void;
}) {
  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Sparkles className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">
            Accompagnement personnalisé
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Aucun programme d'accompagnement n'est disponible pour vos
            formations actuelles. Revenez bientôt !
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <AccompagnementProductOfferList
      products={products}
      userId={userId}
      onEnrolled={onEnrolled}
    />
  );
}

// ─── UI helpers ───────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "RESPONDED":
      return (
        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
      );
    case "MISSED":
      return <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />;
    case "SENT":
      return <Mail className="h-5 w-5 text-yellow-500 flex-shrink-0" />;
    default:
      return (
        <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      );
  }
}

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "RESPONDED":
      return "default";
    case "MISSED":
      return "destructive";
    case "SENT":
      return "secondary";
    default:
      return "outline";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "RESPONDED":
      return "Répondu";
    case "MISSED":
      return "Manqué";
    case "SENT":
      return "En attente";
    case "SCHEDULED":
      return "Planifié";
    default:
      return status;
  }
}

function checkInTypeLabel(type: string): string {
  switch (type) {
    case "LIGHT":
      return "Suivi quotidien";
    case "MID_WEEK":
      return "Suivi quotidien mi-semaine";
    case "WEEKLY":
      return "Bilan hebdomadaire";
    case "MISSED":
      return "Rattrapage";
    default:
      return type;
  }
}
