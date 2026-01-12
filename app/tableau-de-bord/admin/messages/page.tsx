import { requireAdmin } from "@/lib/auth/require-auth";
import { MessageList } from "@/components/admin/messages/message-list";

export default async function AdminMessagesPage() {
  await requireAdmin();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gestion des messages</h1>
        <p className="text-muted-foreground mt-2">
          Consultez et répondez aux questions des étudiants
        </p>
      </div>
      <MessageList />
    </div>
  );
}

