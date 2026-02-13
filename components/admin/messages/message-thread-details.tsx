"use client";

import { useState, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  replyToMessageThreadAction,
  updateThreadStatusAction,
  deleteMessageAction,
} from "@/app/actions/messages";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageSquare, Send, Settings, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

const RichTextEditor = lazy(() =>
  import("@/components/admin/courses/rich-text-editor").then((m) => ({ default: m.RichTextEditor }))
);

type ThreadData = {
  thread: {
    id: string;
    subject: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    user: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    };
    course: {
      id: string;
      title: string;
    } | null;
  };
  messages: Array<{
    id: string;
    content: string;
    createdAt: Date;
    isFromStudent: boolean;
    user: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    };
  }>;
};

interface MessageThreadDetailsProps {
  threadData: ThreadData;
}

export function MessageThreadDetails({ threadData: initialThreadData }: MessageThreadDetailsProps) {
  const [threadData, setThreadData] = useState(initialThreadData);
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);

  const isReplyEmpty = (html: string) =>
    !html || html.replace(/<[^>]*>/g, "").trim() === "";

  const handleReply = async () => {
    if (isReplyEmpty(replyMessage)) {
      toast.error("Le message est requis");
      return;
    }

    setSendingReply(true);
    try {
      const result = await replyToMessageThreadAction(threadData.thread.id, replyMessage);
      if (result.success) {
        toast.success("Réponse envoyée");
        setReplyMessage("");
        window.location.reload();
      } else {
        toast.error(result.error || "Erreur lors de l'envoi");
      }
    } catch (error) {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSendingReply(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    const result = await updateThreadStatusAction(threadData.thread.id, status as any);
    if (result.success) {
      toast.success("Statut mis à jour");
      setThreadData({
        ...threadData,
        thread: { ...threadData.thread, status },
      });
    } else {
      toast.error(result.error || "Erreur");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    setDeletingMessageId(messageId);
    try {
      const result = await deleteMessageAction(messageId);
      if (result.success) {
        toast.success("Message supprimé");
        setThreadData({
          ...threadData,
          messages: threadData.messages.filter((m) => m.id !== messageId),
        });
      } else {
        toast.error(result.error || "Erreur lors de la suppression");
      }
    } finally {
      setDeletingMessageId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Messages
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {threadData.messages.map((message) => (
              <div
                key={message.id}
                className={`border rounded-lg p-4 space-y-2 ${
                  !message.isFromStudent ? "bg-muted/50" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">
                      {message.user.firstName || message.user.lastName
                        ? `${message.user.firstName || ""} ${message.user.lastName || ""}`.trim()
                        : message.user.email}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(message.createdAt), "d MMMM yyyy, HH:mm", { locale: fr })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={message.isFromStudent ? "outline" : "default"}>
                      {message.isFromStudent ? "Étudiant" : "Admin"}
                    </Badge>
                    {!message.isFromStudent && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            disabled={deletingMessageId === message.id}
                            title="Supprimer ce message"
                          >
                            {deletingMessageId === message.id ? (
                              <span className="text-xs">...</span>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. Le message ne sera plus visible pour l&apos;étudiant.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteMessage(message.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
                <div 
                  className="mt-2 text-sm prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: message.content }}
                />
              </div>
            ))}

            <div className="border-t pt-4 space-y-4">
              <div>
                <Label htmlFor="reply">Répondre</Label>
                <Suspense fallback={<Skeleton className="h-32 w-full mt-2" />}>
                  <div className="mt-2">
                    <RichTextEditor
                      content={replyMessage}
                      onChange={setReplyMessage}
                      placeholder="Tapez votre réponse (gras, listes, etc.)..."
                    />
                  </div>
                </Suspense>
              </div>
              <Button onClick={handleReply} disabled={sendingReply || isReplyEmpty(replyMessage)}>
                {sendingReply ? (
                  <>
                    <Send className="h-4 w-4 mr-2 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Paramètres
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Statut</Label>
              <Select
                value={threadData.thread.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Ouvert</SelectItem>
                  <SelectItem value="CLOSED">Fermé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4">
              <Label className="text-muted-foreground">Informations étudiant</Label>
              <div className="mt-2 space-y-1">
                <div className="text-sm">
                  <span className="font-medium">Email:</span> {threadData.thread.user.email}
                </div>
                <Link href={`/tableau-de-bord/admin/students/${threadData.thread.user.id}`}>
                  <Button variant="link" size="sm" className="p-0 h-auto">
                    Voir le profil
                  </Button>
                </Link>
              </div>
            </div>

            {threadData.thread.course && (
              <div className="border-t pt-4">
                <Label className="text-muted-foreground">Cours</Label>
                <div className="mt-2">
                  <div className="text-sm font-medium">{threadData.thread.course.title}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

