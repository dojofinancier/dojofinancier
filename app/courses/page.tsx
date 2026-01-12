import { redirect } from "next/navigation";

/**
 * Redirect /courses to /formations for backward compatibility
 */
export default async function CoursesPage() {
  redirect("/formations");
}

