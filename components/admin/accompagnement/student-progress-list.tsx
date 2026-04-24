"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getAccompagnementStudentsAction,
  getStudentAccompagnementDetailAction,
} from "@/app/actions/admin-accompagnement";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, Eye, Flame, Mail, MessageSquare } from "lucide-react";
import { Separator } from "@/components/ui/separator";

type StudentRow = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  productTitle: string;
  channel: "EMAIL" | "SMS";
  phoneE164: string | null;
  isActive: boolean;
  onboardingCompleted: boolean;
  examDate: Date | null;
  totalCheckIns: number;
  responseRate: number;
  streak: number;
  weakAreaCount: number;
  lastResponseDate: Date | null;
  expiresAt: Date;
  createdAt: Date;
};

export function StudentProgressList() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detailEnrollmentId, setDetailEnrollmentId] = useState<string | null>(
    null
  );
  const [detail, setDetail] = useState<unknown>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    const result = await getAccompagnementStudentsAction(undefined, page, 20);
    if (result.success && result.data) {
      setStudents(result.data as StudentRow[]);
      setTotal(result.total ?? 0);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  async function viewDetail(enrollmentId: string) {
    setDetailLoading(true);
    setDetailEnrollmentId(enrollmentId);
    const result = await getStudentAccompagnementDetailAction(enrollmentId);
    if (result.success && result.data) {
      setDetail(result.data);
    }
    setDetailLoading(false);
  }

  if (detailEnrollmentId) {
    return (
      <StudentDetailView
        detail={detail}
        loading={detailLoading}
        onBack={() => {
          setDetailEnrollmentId(null);
          setDetail(null);
        }}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suivi des étudiants</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Chargement...
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun étudiant inscrit à un programme d'accompagnement.
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Étudiant</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Série</TableHead>
                  <TableHead>Suivis quotidiens</TableHead>
                  <TableHead>Taux</TableHead>
                  <TableHead>Zones faibles</TableHead>
                  <TableHead>Dernière réponse</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{s.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.userEmail}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.productTitle}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {s.channel === "EMAIL" ? (
                          <Mail className="h-3 w-3" />
                        ) : (
                          <MessageSquare className="h-3 w-3" />
                        )}
                        {s.channel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Flame className="h-3.5 w-3.5 text-orange-500" />
                        {s.streak}
                      </span>
                    </TableCell>
                    <TableCell>{s.totalCheckIns}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          s.responseRate >= 70
                            ? "default"
                            : s.responseRate >= 40
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {s.responseRate}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {s.weakAreaCount > 0 ? (
                        <Badge variant="destructive">{s.weakAreaCount}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.lastResponseDate
                        ? format(new Date(s.lastResponseDate), "d MMM yyyy", {
                            locale: fr,
                          })
                        : "Jamais"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.isActive ? "default" : "secondary"}>
                        {s.isActive
                          ? s.onboardingCompleted
                            ? "Actif"
                            : "Onboarding"
                          : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewDetail(s.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Détail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {total > 20 && (
              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Précédent
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} sur {Math.ceil(total / 20)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= Math.ceil(total / 20)}
                  onClick={() => setPage(page + 1)}
                >
                  Suivant
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface DetailShape {
  user: { email: string; firstName: string | null; lastName: string | null };
  product: { title: string };
  channel: "EMAIL" | "SMS";
  phoneE164: string | null;
  streak: number;
  onboarding?: {
    examDate: Date | null;
    studyHoursPerWeek: number;
    additionalNotes: string | null;
    chapterAssessments: Array<{
      id: string;
      chapter: number;
      topic: string | null;
      status: string;
    }>;
  } | null;
  checkIns: Array<{
    id: string;
    type: string;
    status: string;
    scheduledFor: Date;
    response: {
      score: number | null;
      responseRate: number | null;
      yesNoReply: boolean | null;
    } | null;
    answers: Array<{
      orderIndex: number;
      source: string;
      adaptiveChapter: number;
      adaptiveTopic: string;
      isCorrect: boolean | null;
      studentAnswer: string | null;
    }>;
  }>;
  weeklyReviews: Array<{
    id: string;
    weekStartDate: Date;
    score: number | null;
    responseRate: number | null;
    summaryMarkdown: string | null;
  }>;
  weeklyPlans: Array<{
    id: string;
    weekStartDate: Date;
    plannedChapters: unknown;
    focusTopics: unknown;
  }>;
  weakAreas: Array<{
    id: string;
    chapter: number;
    topic: string;
    signalType: string;
    createdAt: Date;
  }>;
}

function StudentDetailView({
  detail,
  loading,
  onBack,
}: {
  detail: unknown;
  loading: boolean;
  onBack: () => void;
}) {
  if (loading || !detail) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Retour à la liste
        </Button>
        <div className="text-center py-8 text-muted-foreground">
          Chargement...
        </div>
      </div>
    );
  }

  const d = detail as DetailShape;
  const userName =
    `${d.user.firstName || ""} ${d.user.lastName || ""}`.trim() ||
    d.user.email;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ChevronLeft className="h-4 w-4" />
        Retour à la liste
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{userName}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {d.user.email} · {d.product.title} · Canal {d.channel}
            {d.phoneE164 ? ` (${d.phoneE164})` : ""}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Série</p>
              <p className="font-medium">{d.streak} jours</p>
            </div>
            {d.onboarding && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">Date d'examen</p>
                  <p className="font-medium">
                    {d.onboarding.examDate
                      ? format(
                          new Date(d.onboarding.examDate),
                          "d MMM yyyy",
                          { locale: fr }
                        )
                      : "Non définie"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Heures / semaine
                  </p>
                  <p className="font-medium">
                    {d.onboarding.studyHoursPerWeek}h
                  </p>
                </div>
              </>
            )}
          </div>

          {d.onboarding?.chapterAssessments &&
            d.onboarding.chapterAssessments.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">
                    Auto-évaluation par chapitre
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {d.onboarding.chapterAssessments.map((c) => (
                      <div
                        key={c.id}
                        className="rounded border p-2 text-sm"
                      >
                        <p className="font-medium">
                          Chapitre {c.chapter}
                          {c.topic ? ` — ${c.topic}` : ""}
                        </p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {assessmentLabel(c.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

          {d.weakAreas.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">
                  Signaux de zones à renforcer (30 derniers jours)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {d.weakAreas.slice(0, 12).map((w) => (
                    <Badge key={w.id} variant="outline">
                      Ch. {w.chapter} · {w.topic}
                    </Badge>
                  ))}
                  {d.weakAreas.length > 12 && (
                    <Badge variant="outline">
                      +{d.weakAreas.length - 12}
                    </Badge>
                  )}
                </div>
              </div>
            </>
          )}

          {d.weeklyReviews.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Bilans hebdomadaires</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Semaine</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Constance</TableHead>
                      <TableHead>Résumé</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.weeklyReviews.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(r.weekStartDate), "d MMM yyyy", {
                            locale: fr,
                          })}
                        </TableCell>
                        <TableCell>
                          {r.score !== null ? `${r.score}%` : "—"}
                        </TableCell>
                        <TableCell>
                          {r.responseRate !== null
                            ? `${r.responseRate}%`
                            : "—"}
                        </TableCell>
                        <TableCell className="max-w-md truncate text-sm">
                          {r.summaryMarkdown
                            ? r.summaryMarkdown.split("\n")[0]
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          <Separator />
          <div>
            <h3 className="font-semibold mb-2">
              Derniers suivis quotidiens (50 max)
            </h3>
            {d.checkIns.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun suivi quotidien</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Réponses (Ch/Topic)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.checkIns.map((ci) => (
                    <TableRow key={ci.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(ci.scheduledFor), "d MMM yyyy", {
                          locale: fr,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{ci.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ci.status === "RESPONDED"
                              ? "default"
                              : ci.status === "MISSED"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {ci.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {ci.response?.score !== null &&
                        ci.response?.score !== undefined
                          ? `${ci.response.score}%`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {ci.answers
                          .map(
                            (a) =>
                              `${a.source}·${a.adaptiveChapter}/${a.adaptiveTopic}${a.isCorrect === false ? "✗" : a.isCorrect ? "✓" : ""}`
                          )
                          .join(", ") || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function assessmentLabel(status: string): string {
  switch (status) {
    case "NOT_STARTED":
      return "Pas commencé";
    case "READ_LOW":
      return "Lu, peu solide";
    case "READ_SOMEWHAT":
      return "Lu, assez solide";
    case "READ_CONFIDENT":
      return "Lu, confiant";
    default:
      return status;
  }
}
