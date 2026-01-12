import { redirect } from "next/navigation";

/**
 * Redirect /cohorte to /formations#cohortes for backward compatibility
 */
export default function CohortePage() {
  redirect("/formations#cohortes");
}
