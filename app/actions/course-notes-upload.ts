"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth, requireAdmin } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/utils/error-logging";

// Create a Supabase Storage bucket named "course-notes" (public or with RLS) for uploads to work
const COURSE_NOTES_BUCKET = "course-notes";
const MAX_FILE_SIZE = 32 * 1024 * 1024; // 32MB
const ALLOWED_TYPES = ["application/pdf"];

export type CourseNotesUploadResult = {
  success: boolean;
  error?: string;
  url?: string;
  fileName?: string;
};

/**
 * Upload admin-provided consolidated notes PDF for a course (admin only)
 */
export async function uploadCourseConsolidatedNotesPdfAction(
  courseId: string,
  formData: FormData
): Promise<CourseNotesUploadResult> {
  try {
    await requireAdmin();

    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "Aucun fichier fourni" };
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { success: false, error: "Seuls les fichiers PDF sont acceptés" };
    }
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `Le fichier dépasse la limite de ${MAX_FILE_SIZE / (1024 * 1024)} Mo`,
      };
    }

    const supabase = await createClient();
    const filePath = `admin/${courseId}/consolidated-notes.pdf`;

    const arrayBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(COURSE_NOTES_BUCKET)
      .upload(filePath, fileData, {
        cacheControl: "3600",
        upsert: true,
        contentType: "application/pdf",
      });

    if (uploadError) {
      await logServerError({
        errorMessage: `Failed to upload course consolidated notes: ${uploadError.message}`,
        stackTrace: uploadError.stack,
        severity: "MEDIUM",
      });
      return {
        success: false,
        error: "Erreur lors du téléversement du fichier",
      };
    }

    const { data: urlData } = supabase.storage
      .from(COURSE_NOTES_BUCKET)
      .getPublicUrl(filePath);

    await prisma.course.update({
      where: { id: courseId },
      data: { consolidatedNotesPdfUrl: urlData.publicUrl },
    });

    return {
      success: true,
      url: urlData.publicUrl,
      fileName: file.name,
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Course consolidated notes upload: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });
    return {
      success: false,
      error: "Erreur lors du téléversement du fichier",
    };
  }
}

/**
 * Remove admin-provided consolidated notes PDF (admin only)
 */
export async function removeCourseConsolidatedNotesPdfAction(
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { consolidatedNotesPdfUrl: true },
    });
    if (!course?.consolidatedNotesPdfUrl) {
      return { success: true };
    }

    const supabase = await createClient();
    const filePath = `admin/${courseId}/consolidated-notes.pdf`;
    await supabase.storage.from(COURSE_NOTES_BUCKET).remove([filePath]);

    await prisma.course.update({
      where: { id: courseId },
      data: { consolidatedNotesPdfUrl: null },
    });

    return { success: true };
  } catch (error) {
    await logServerError({
      errorMessage: `Remove course consolidated notes: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });
    return {
      success: false,
      error: "Erreur lors de la suppression du fichier",
    };
  }
}

/**
 * Upload student's consolidated notes PDF for a course (enrolled student only)
 */
export async function uploadStudentConsolidatedNotesPdfAction(
  courseId: string,
  formData: FormData
): Promise<CourseNotesUploadResult> {
  try {
    const user = await requireAuth();

    const enrollment = await prisma.enrollment.findFirst({
      where: { userId: user.id, courseId },
    });
    if (!enrollment) {
      return { success: false, error: "Vous n'êtes pas inscrit à ce cours" };
    }

    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "Aucun fichier fourni" };
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { success: false, error: "Seuls les fichiers PDF sont acceptés" };
    }
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `Le fichier dépasse la limite de ${MAX_FILE_SIZE / (1024 * 1024)} Mo`,
      };
    }

    const supabase = await createClient();
    const timestamp = Date.now();
    const filePath = `students/${user.id}/${courseId}/${timestamp}-consolidated-notes.pdf`;

    const arrayBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(COURSE_NOTES_BUCKET)
      .upload(filePath, fileData, {
        cacheControl: "3600",
        upsert: false,
        contentType: "application/pdf",
      });

    if (uploadError) {
      await logServerError({
        errorMessage: `Failed to upload student consolidated notes: ${uploadError.message}`,
        stackTrace: uploadError.stack,
        userId: user.id,
        severity: "MEDIUM",
      });
      return {
        success: false,
        error: "Erreur lors du téléversement du fichier",
      };
    }

    const { data: urlData } = supabase.storage
      .from(COURSE_NOTES_BUCKET)
      .getPublicUrl(filePath);

    await prisma.userCourseSettings.upsert({
      where: {
        userId_courseId: { userId: user.id, courseId },
      },
      create: {
        userId: user.id,
        courseId,
        consolidatedNotesPdfUrl: urlData.publicUrl,
      },
      update: {
        consolidatedNotesPdfUrl: urlData.publicUrl,
      },
    });

    return {
      success: true,
      url: urlData.publicUrl,
      fileName: file.name,
    };
  } catch (error) {
    await logServerError({
      errorMessage: `Student consolidated notes upload: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });
    return {
      success: false,
      error: "Erreur lors du téléversement du fichier",
    };
  }
}

/**
 * Get the current student's consolidated notes PDF URL for a course (if any)
 */
export async function getStudentConsolidatedNotesPdfUrlAction(
  courseId: string
): Promise<{ url: string | null }> {
  try {
    const user = await requireAuth();
    const settings = await prisma.userCourseSettings.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
      select: { consolidatedNotesPdfUrl: true },
    });
    return { url: settings?.consolidatedNotesPdfUrl ?? null };
  } catch {
    return { url: null };
  }
}
