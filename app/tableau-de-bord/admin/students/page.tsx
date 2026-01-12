import { requireAdmin } from "@/lib/auth/require-auth";
import { StudentList } from "@/components/admin/students/student-list";

export default async function AdminStudentsPage() {
  await requireAdmin();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gestion des étudiants</h1>
        <p className="text-muted-foreground mt-2">
          Gérez les comptes étudiants, leurs inscriptions et leur progression
        </p>
      </div>
      <StudentList />
    </div>
  );
}

