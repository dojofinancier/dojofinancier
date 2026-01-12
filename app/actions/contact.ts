"use server";

import { z } from "zod";
import { sendContactFormWebhook } from "@/lib/webhooks/make";
import { logServerError } from "@/lib/utils/error-logging";

const contactFormSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Courriel invalide"),
  subject: z.string().min(1, "Le sujet est requis"),
  message: z.string().min(1, "Le message est requis"),
});

export type ContactFormResult = {
  success: boolean;
  error?: string;
};

/**
 * Submit contact form and send webhook to Make.com
 */
export async function submitContactFormAction(
  data: z.infer<typeof contactFormSchema>
): Promise<ContactFormResult> {
  try {
    const validatedData = contactFormSchema.parse(data);

    // Send webhook to Make.com
    await sendContactFormWebhook({
      name: validatedData.name,
      email: validatedData.email,
      subject: validatedData.subject,
      message: validatedData.message,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Données invalides",
      };
    }

    await logServerError({
      errorMessage: `Failed to submit contact form: ${error instanceof Error ? error.message : "Unknown error"}`,
      stackTrace: error instanceof Error ? error.stack : undefined,
      severity: "MEDIUM",
    });

    return {
      success: false,
      error: "Erreur lors de l'envoi du message. Veuillez réessayer.",
    };
  }
}
