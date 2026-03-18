"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  extendEnrollmentAccessAction,
  revokeEnrollmentAccessAction,
  deleteEnrollmentAction,
} from "@/app/actions/enrollments";
import {
  getStudentAttemptsAction,
  resetStudentPasswordAction,
  type StudentAttemptsResult,
} from "@/app/actions/students";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Ban,
  Trash2,
  Plus,
  Trophy,
  Loader2,
  CheckCircle2,
  XCircle,
  KeyRound,
  Copy,
  Check,
} from "lucide-react";
import type { UserRole } from "@prisma/client";

type EnrollmentWithCourse = {
  id: string;
  purchaseDate: Date;
  expiresAt: Date;
  orderNumber: number | null;
  course: {
    id: string;
    title: string;
    code: string | null;
    category: {
      id: string;
      name: string;
    };
  };
};

type SubscriptionRow = {
  id: string;
  stripeSubscriptionId: string | null;
  status: string;
  currentPeriodEnd: Date;
  createdAt: Date;
};

type ProgressRow = {
  id: string;
  timeSpent: number;
  completedAt: Date | null;
  lastAccessedAt: Date;
  contentItem?: {
    id: string;
    contentType: string;
    module: {
      id: string;
      title: string;
      course: {
        id: string;
        title: string;
      };
    };
  };
};

type StudentWithDetails = {
  id: string;
  email: string;
  role: UserRole;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
  suspendedAt: Date | null;
  enrollments: EnrollmentWithCourse[];
  subscriptions: SubscriptionRow[];
  progressTracking: ProgressRow[];
};

interface StudentDetailsProps {
  student: StudentWithDetails;
}

export function StudentDetails({ student }: StudentDetailsProps) {
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null);
  const [additionalDays, setAdditionalDays] = useState("30");
  const [attemptsData, setAttemptsData] = useState<StudentAttemptsResult | null>(null);
  const [attemptsLoading, setAttemptsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("profile");

  const [resetPwdOpen, setResetPwdOpen] = useState(false);
  const [resetPwdStep, setResetPwdStep] = useState<"confirm" | "result">("confirm");
  const [resetPwdLoading, setResetPwdLoading] = useState(false);
  const [newPasswordDisplay, setNewPasswordDisplay] = useState<string | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);

  const loadAttempts = () => {
    if (attemptsData !== null || attemptsLoading) return;
    setAttemptsLoading(true);
    getStudentAttemptsAction(student.id)
      .then((result) => {
        if (result.success) setAttemptsData(result.data);
        else toast.error(result.error);
      })
      .finally(() => setAttemptsLoading(false));
  };

  useEffect(() => {
    if (activeTab === "results") loadAttempts();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExtendAccess = async () => {
    if (!selectedEnrollment) return;
    const days = parseInt(additionalDays, 10);
    if (isNaN(days) || days <= 0) {
      toast.error("Nombre de jours invalide");
      return;
    }
    const result = await extendEnrollmentAccessAction(selectedEnrollment.id, days);
    if (result.success) {
      toast.success(`Accès prolongé de ${days} jours`);
      setExtendDialogOpen(false);
      window.location.reload();
    } else {
      toast.error(result.error || "Erreur lors de la prolongation");
    }
  };

  const handleRevokeAccess = async () => {
    if (!selectedEnrollment) return;
    const result = await revokeEnrollmentAccessAction(selectedEnrollment.id);
    if (result.success) {
      toast.success("Accès révoqué");
      setRevokeDialogOpen(false);
      window.location.reload();
    } else {
      toast.error(result.error || "Erreur lors de la révocation");
    }
  };

  const handleDeleteEnrollment = async () => {
    if (!selectedEnrollment) return;
    const result = await deleteEnrollmentAction(selectedEnrollment.id);
    if (result.success) {
      toast.success("Inscription supprimée");
      setDeleteDialogOpen(false);
      window.location.reload();
    } else {
      toast.error(result.error || "Erreur lors de la suppression");
    }
  };

  const getEnrollmentStatus = (enrollment: { expiresAt: Date }) => {
    const now = new Date();
    const expiresAt = new Date(enrollment.expiresAt);
    if (expiresAt < now) {
      return { label: "Expiré", variant: "destructive" as const };
    }
    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 7) {
      return { label: `Expire dans ${daysUntilExpiry}j`, variant: "secondary" as const };
    }
    return { label: "Actif", variant: "default" as const };
  };

  const completedItems = student.progressTracking.filter((pt) => pt.completedAt !== null).length;
  const totalTimeSpent = student.progressTracking.reduce((sum, pt) => sum + pt.timeSpent, 0);
  const hoursSpent = Math.floor(totalTimeSpent / 3600);
  const minutesSpent = Math.floor((totalTimeSpent % 3600) / 60);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList>
        <TabsTrigger value="profile">Profil</TabsTrigger>
        <TabsTrigger value="enrollments">Inscriptions</TabsTrigger>
        <TabsTrigger value="progress">Progression</TabsTrigger>
        <TabsTrigger value="results">
          <Trophy className="h-4 w-4 mr-2" />
          Résultats
        </TabsTrigger>
        <TabsTrigger value="subscriptions">Abonnements</TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="mt-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium">{student.email}</p>
              </div>
              {student.firstName && (
                <div>
                  <Label className="text-muted-foreground">Prénom</Label>
                  <p className="font-medium">{student.firstName}</p>
                </div>
              )}
              {student.lastName && (
                <div>
                  <Label className="text-muted-foreground">Nom</Label>
                  <p className="font-medium">{student.lastName}</p>
                </div>
              )}
              {student.phone && (
                <div>
                  <Label className="text-muted-foreground">Téléphone</Label>
                  <p className="font-medium">{student.phone}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Date d'inscription</Label>
                <p className="font-medium">
                  {format(new Date(student.createdAt), "d MMMM yyyy", { locale: fr })}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Statut</Label>
                <div className="mt-1">
                  {student.suspendedAt ? (
                    <Badge variant="destructive">Suspendu</Badge>
                  ) : (
                    <Badge className="bg-primary">Actif</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistiques</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Inscriptions</Label>
                <p className="text-2xl font-bold">{student.enrollments.length}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Éléments complétés</Label>
                <p className="text-2xl font-bold">{completedItems}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Temps total</Label>
                <p className="text-2xl font-bold">
                  {hoursSpent}h {minutesSpent}min
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Abonnements actifs</Label>
                <p className="text-2xl font-bold">
                  {student.subscriptions.filter((s) => s.status === "ACTIVE").length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 border-amber-200/80 dark:border-amber-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <KeyRound className="h-5 w-5" />
              Réinitialisation du mot de passe
            </CardTitle>
            <CardDescription>
              Génère un nouveau mot de passe aléatoire dans Supabase Auth lorsque l&apos;étudiant ne
              peut pas se connecter (ex. récupération par email défaillante). Communiquez le mot de
              passe de façon sécurisée ; il ne sera plus affiché après fermeture de la fenêtre.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="border-amber-300 dark:border-amber-800"
              onClick={() => {
                setResetPwdStep("confirm");
                setNewPasswordDisplay(null);
                setPasswordCopied(false);
                setResetPwdOpen(true);
              }}
            >
              <KeyRound className="h-4 w-4 mr-2" />
              Réinitialiser le mot de passe
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="enrollments" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Inscriptions aux cours</CardTitle>
            <CardDescription>
              Gérez les inscriptions et les accès aux cours
            </CardDescription>
          </CardHeader>
          <CardContent>
            {student.enrollments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune inscription
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cours</TableHead>
                      <TableHead>Date d'achat</TableHead>
                      <TableHead>Expiration</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {student.enrollments.map((enrollment) => {
                      const status = getEnrollmentStatus(enrollment);
                      return (
                        <TableRow key={enrollment.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{enrollment.course.title}</div>
                              <div className="text-sm text-muted-foreground">
                                {enrollment.course.category.name}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(enrollment.purchaseDate), "d MMM yyyy", { locale: fr })}
                          </TableCell>
                          <TableCell>
                            {format(new Date(enrollment.expiresAt), "d MMM yyyy", { locale: fr })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedEnrollment(enrollment);
                                  setExtendDialogOpen(true);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Prolonger
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedEnrollment(enrollment);
                                  setRevokeDialogOpen(true);
                                }}
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                Révoquer
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedEnrollment(enrollment);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="progress" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Progression</CardTitle>
            <CardDescription>
              Activité récente et progression dans les cours
            </CardDescription>
          </CardHeader>
          <CardContent>
            {student.progressTracking.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune progression enregistrée
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cours</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Temps passé</TableHead>
                      <TableHead>Dernière visite</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {student.progressTracking.map((progress) => {
                      const hours = Math.floor(progress.timeSpent / 3600);
                      const minutes = Math.floor((progress.timeSpent % 3600) / 60);
                      return (
                        <TableRow key={progress.id}>
                          <TableCell className="font-medium">
                            {progress.contentItem?.module?.course?.title ?? "—"}
                          </TableCell>
                          <TableCell>{progress.contentItem?.module?.title ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{progress.contentItem?.contentType ?? "—"}</Badge>
                          </TableCell>
                          <TableCell>
                            {hours > 0 ? `${hours}h ` : ""}
                            {minutes}min
                          </TableCell>
                          <TableCell>
                            {format(new Date(progress.lastAccessedAt), "d MMM yyyy, HH:mm", {
                              locale: fr,
                            })}
                          </TableCell>
                          <TableCell>
                            {progress.completedAt ? (
                              <Badge className="bg-primary">Complété</Badge>
                            ) : (
                              <Badge variant="secondary">En cours</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="results" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Résultats</CardTitle>
            <CardDescription>
              Examens, quiz et études de cas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {attemptsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : attemptsData && (attemptsData.quizAttempts.length > 0 || attemptsData.caseStudyAttempts.length > 0) ? (
              <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Titre</TableHead>
                          <TableHead>Cours</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Note de passage</TableHead>
                          <TableHead>Résultat</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attemptsData.quizAttempts.map((attempt) => {
                          const passed = attempt.score >= attempt.quiz.passingScore;
                          return (
                            <TableRow key={attempt.id}>
                              <TableCell>
                                <Badge variant="outline">
                                  {attempt.quiz.isMockExam ? "Examen" : "Quiz"}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">{attempt.quiz.title}</TableCell>
                              <TableCell>{attempt.quiz.course.title}</TableCell>
                              <TableCell>{attempt.score}%</TableCell>
                              <TableCell>{attempt.quiz.passingScore}%</TableCell>
                              <TableCell>
                                {passed ? (
                                  <Badge className="bg-primary">
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Réussi
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive">
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Échoué
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {format(new Date(attempt.completedAt), "d MMM yyyy, HH:mm", {
                                  locale: fr,
                                })}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {attemptsData.caseStudyAttempts.map((attempt) => (
                          <TableRow key={attempt.id}>
                            <TableCell>
                              <Badge variant="outline">Étude de cas</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{attempt.caseStudy.title}</TableCell>
                            <TableCell>{attempt.caseStudy.course.title}</TableCell>
                            <TableCell>{attempt.score}%</TableCell>
                            <TableCell>{attempt.caseStudy.passingScore}%</TableCell>
                            <TableCell>
                              {attempt.passed ? (
                                <Badge className="bg-primary">
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Réussi
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Échoué
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {format(new Date(attempt.completedAt), "d MMM yyyy, HH:mm", {
                                locale: fr,
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Aucun résultat enregistré
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="subscriptions" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Abonnements</CardTitle>
            <CardDescription>
              Gérer les abonnements actifs et passés
            </CardDescription>
          </CardHeader>
          <CardContent>
            {student.subscriptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun abonnement
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Stripe</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Période actuelle</TableHead>
                      <TableHead>Date de création</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {student.subscriptions.map((subscription) => (
                      <TableRow key={subscription.id}>
                        <TableCell className="font-mono text-sm">
                          {subscription.stripeSubscriptionId}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              subscription.status === "ACTIVE"
                                ? "default"
                                : subscription.status === "CANCELED"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {subscription.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(subscription.currentPeriodEnd), "d MMM yyyy", {
                            locale: fr,
                          })}
                        </TableCell>
                        <TableCell>
                          {format(new Date(subscription.createdAt), "d MMM yyyy", { locale: fr })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Extend Access Dialog */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prolonger l'accès</DialogTitle>
            <DialogDescription>
              Ajoutez des jours supplémentaires à l'accès de cet étudiant
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nombre de jours supplémentaires</Label>
              <Input
                type="number"
                min="1"
                value={additionalDays}
                onChange={(e) => setAdditionalDays(e.target.value)}
                placeholder="30"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setExtendDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleExtendAccess}>Prolonger</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revoke Access Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Révoquer l'accès</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir révoquer l'accès à ce cours ? L'accès expirera immédiatement.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setRevokeDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleRevokeAccess}>
              Révoquer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Enrollment Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l'inscription</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer cette inscription ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteEnrollment}>
              Supprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resetPwdOpen}
        onOpenChange={(open) => {
          setResetPwdOpen(open);
          if (!open) {
            setNewPasswordDisplay(null);
            setPasswordCopied(false);
            setResetPwdStep("confirm");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {resetPwdStep === "confirm"
                ? "Réinitialiser le mot de passe ?"
                : "Nouveau mot de passe"}
            </DialogTitle>
            <DialogDescription>
              {resetPwdStep === "confirm" ? (
                <>
                  Un mot de passe aléatoire remplacera l&apos;actuel pour{" "}
                  <span className="font-medium text-foreground">{student.email}</span>. L&apos;étudiant
                  pourra se connecter avec ce nouveau mot de passe et le changer depuis son compte.
                </>
              ) : (
                <>Copiez ce mot de passe maintenant. Il ne sera plus accessible après fermeture.</>
              )}
            </DialogDescription>
          </DialogHeader>

          {resetPwdStep === "confirm" && (
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setResetPwdOpen(false)}>
                Annuler
              </Button>
              <Button
                disabled={resetPwdLoading}
                onClick={async () => {
                  setResetPwdLoading(true);
                  try {
                    const result = await resetStudentPasswordAction(student.id);
                    if (result.success) {
                      setNewPasswordDisplay(result.data.temporaryPassword);
                      setResetPwdStep("result");
                      toast.success("Mot de passe réinitialisé");
                    } else {
                      toast.error(result.error);
                    }
                  } finally {
                    setResetPwdLoading(false);
                  }
                }}
              >
                {resetPwdLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Réinitialisation…
                  </>
                ) : (
                  "Confirmer"
                )}
              </Button>
            </div>
          )}

          {resetPwdStep === "result" && newPasswordDisplay && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Mot de passe temporaire</Label>
                <div className="flex gap-2">
                  <Input readOnly value={newPasswordDisplay} className="font-mono text-sm" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Copier"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(newPasswordDisplay);
                        setPasswordCopied(true);
                        toast.success("Copié dans le presse-papiers");
                        setTimeout(() => setPasswordCopied(false), 2000);
                      } catch {
                        toast.error("Impossible de copier");
                      }
                    }}
                  >
                    {passwordCopied ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <Button className="w-full sm:w-auto" onClick={() => setResetPwdOpen(false)}>
                Fermer
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}

