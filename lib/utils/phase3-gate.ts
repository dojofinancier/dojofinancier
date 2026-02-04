/**
 * Phase 3 Gate Check
 * Phase 3 (Pratiquer) is accessible to all students; the previous requirement
 * to complete all Phase 1 chapters has been removed.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface Phase3GateResult {
  canAccess: boolean;
  learnedModules: number;
  totalModules: number;
  unlearnedModules: Array<{ id: string; title: string; order: number }>;
  message?: string;
}

/**
 * Check if user can access Phase 3. Access is no longer gated by Phase 1 completion.
 */
export async function checkPhase3Access(
  _userId: string,
  courseId: string
): Promise<Phase3GateResult> {
  const modules = await prisma.module.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    select: { id: true, title: true, order: true },
  });

  return {
    canAccess: true,
    learnedModules: modules.length,
    totalModules: modules.length,
    unlearnedModules: [],
  };
}

