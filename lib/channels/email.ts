import type { CheckInType } from "@prisma/client";
import { sendTransactionalEmail } from "@/lib/email/transactional";
import type { ChannelDispatchParams, ChannelDispatchResult } from "./types";

const CTA_LABEL_BY_TYPE: Record<CheckInType, string> = {
  LIGHT: "Faire mon suivi quotidien",
  MID_WEEK: "Faire mon suivi quotidien",
  WEEKLY: "Faire mon bilan hebdomadaire",
  MISSED: "Reprendre mon étude",
};

const SUBJECT_BY_TYPE: Record<CheckInType, string> = {
  LIGHT: "Votre suivi quotidien",
  MID_WEEK: "Votre suivi quotidien du milieu de semaine",
  WEEKLY: "Votre bilan hebdomadaire",
  MISSED: "On reprend ensemble — suivi quotidien rapide",
};

export async function sendCheckInEmail(
  params: ChannelDispatchParams
): Promise<ChannelDispatchResult> {
  const subject = SUBJECT_BY_TYPE[params.type];
  const ctaLabel = CTA_LABEL_BY_TYPE[params.type];
  const { html, text } = buildCheckInEmail({
    studentFirstName: params.recipientName,
    contextLine: params.contextLine,
    ctaUrl: params.checkInUrl,
    ctaLabel,
    type: params.type,
  });

  try {
    const result = await sendTransactionalEmail({
      to: {
        email: params.recipientEmail,
        ...(params.recipientName?.trim()
          ? { name: params.recipientName.trim() }
          : {}),
      },
      subject,
      html,
      text,
    });

    if (!result.ok) {
      console.error(
        `Failed to send check-in email via ${result.provider}:`,
        result.error
      );
      return { success: false, providerMessageId: null, error: result.error };
    }
    return { success: true, providerMessageId: result.providerMessageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to send check-in email:", message);
    return { success: false, providerMessageId: null, error: message };
  }
}

export interface BuildCheckInEmailParams {
  studentFirstName: string;
  contextLine: string;
  ctaUrl: string;
  ctaLabel: string;
  type: CheckInType;
}

export function buildCheckInEmail(
  params: BuildCheckInEmailParams
): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f5f7f9;font-family:'Inter','Segoe UI',Roboto,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5f7f9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;width:100%;">
          <tr>
            <td style="background:#00a63e;padding:24px 28px;border-radius:12px 12px 0 0;color:#ffffff;">
              <h1 style="margin:0;font-size:20px;font-weight:800;line-height:1.2;">Votre suivi quotidien</h1>
              <p style="margin:10px 0 0;font-size:15px;line-height:1.5;opacity:0.95;">Bonjour ${escapeHtml(params.studentFirstName)},</p>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:28px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
              <p style="line-height:1.65;margin:0 0 20px;font-size:16px;color:#111827;">${escapeHtml(params.contextLine)}</p>
              <p style="text-align:center;margin:28px 0 0;">
                <a href="${params.ctaUrl}" target="_blank" style="display:inline-block;background:#00a63e;color:#ffffff;text-decoration:none;font-weight:700;font-size:17px;line-height:1;padding:14px 26px;border-radius:6px;border:1px solid #000000;">
                  ${escapeHtml(params.ctaLabel)}
                </a>
              </p>
              <p style="color:#6b7280;font-size:13px;margin-top:18px;line-height:1.5;">
                Ce lien est personnel et unique. Vous n'avez pas besoin de vous connecter.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 12px 8px;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">Dojo Financier — Suivi personnalisé</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const text = [
    `Bonjour ${params.studentFirstName},`,
    "",
    params.contextLine,
    "",
    `${params.ctaLabel} : ${params.ctaUrl}`,
    "",
    "Ce lien est personnel et unique. Vous n'avez pas besoin de vous connecter.",
    "",
    "— Dojo Financier, Suivi personnalisé",
  ].join("\n");

  return { html, text };
}

export interface BuildWeeklyRecapEmailParams {
  studentFirstName: string;
  weekLabel: string;
  summaryMarkdown: string;
  score: number | null;
  responseRate: number | null;
  streak: number;
  plannedChapters: number[];
  dashboardUrl: string;
}

export function buildWeeklyRecapEmail(
  params: BuildWeeklyRecapEmailParams
): { html: string; text: string } {
  const summaryHtml = markdownToBasicHtml(params.summaryMarkdown);
  const plannedChaptersLine =
    params.plannedChapters.length > 0
      ? `Chapitres planifiés : ${params.plannedChapters.join(", ")}`
      : "Plan à venir dans votre tableau de bord.";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f5f7f9;font-family:'Inter','Segoe UI',Roboto,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5f7f9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;width:100%;">
          <tr>
            <td style="background:#00a63e;padding:24px 28px;border-radius:12px 12px 0 0;color:#ffffff;">
              <h1 style="margin:0;font-size:20px;font-weight:800;line-height:1.2;">Bilan de la semaine</h1>
              <p style="margin:10px 0 0;font-size:15px;line-height:1.5;opacity:0.95;">${escapeHtml(params.weekLabel)}</p>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:28px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Bonjour ${escapeHtml(params.studentFirstName)},</p>
              <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:0 0 18px;">
                <p style="margin:0 0 6px;"><strong>Score quiz :</strong> ${params.score !== null ? `${params.score}%` : "N/A"}</p>
                <p style="margin:0 0 6px;"><strong>Taux de réponse :</strong> ${params.responseRate !== null ? `${params.responseRate}%` : "N/A"}</p>
                <p style="margin:0;"><strong>Série :</strong> ${params.streak} jour${params.streak === 1 ? "" : "s"}</p>
              </div>
              <div style="line-height:1.65;">${summaryHtml}</div>
              <div style="background:#ecfdf5;padding:16px;border-radius:8px;margin-top:18px;border-left:4px solid #00a63e;">
                <p style="margin:0;"><strong>Semaine prochaine</strong></p>
                <p style="margin:8px 0 0;">${escapeHtml(plannedChaptersLine)}</p>
              </div>
              <p style="text-align:center;margin:28px 0 0;">
                <a href="${params.dashboardUrl}" target="_blank" style="display:inline-block;background:#00a63e;color:#ffffff;text-decoration:none;font-weight:700;font-size:17px;line-height:1;padding:14px 26px;border-radius:6px;border:1px solid #000000;">
                  Voir mon tableau de bord
                </a>
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 12px 8px;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">Dojo Financier — Suivi personnalisé</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const text = [
    `Bonjour ${params.studentFirstName},`,
    `Bilan de la semaine — ${params.weekLabel}`,
    "",
    `Score quiz : ${params.score !== null ? `${params.score}%` : "N/A"}`,
    `Taux de réponse : ${params.responseRate !== null ? `${params.responseRate}%` : "N/A"}`,
    `Série : ${params.streak} jour${params.streak === 1 ? "" : "s"}`,
    "",
    params.summaryMarkdown.replace(/[#*_]/g, ""),
    "",
    plannedChaptersLine,
    "",
    `Tableau de bord : ${params.dashboardUrl}`,
    "",
    "— Dojo Financier, Suivi personnalisé",
  ].join("\n");

  return { html, text };
}

/**
 * Welcome email after accompagnement onboarding (French).
 */
export async function sendAccompagnementOnboardingWelcomeEmail(params: {
  recipientEmail: string;
  recipientName: string;
  /** Display lines e.g. module titles for self-reported weak chapters */
  weakChapterLines: string[];
  dashboardUrl: string | null;
}): Promise<
  | { ok: true; emailId: string | null }
  | { ok: false; error: string }
> {
  const subject = "Votre accompagnement personnalisé est activé";
  const first = params.recipientName.trim() || "Bonjour";
  const baseUrl = params.dashboardUrl?.trim() || null;

  const weakSectionHtml =
    params.weakChapterLines.length > 0
      ? `<p style="margin:16px 0 8px;font-weight:600;">Zones à renforcer (selon votre auto-évaluation)</p>
         <ul style="margin:0;padding-left:20px;line-height:1.6;">
           ${params.weakChapterLines
             .map((line) => `<li>${escapeHtml(line)}</li>`)
             .join("")}
         </ul>
         <p style="font-size:13px;color:#6b7280;margin-top:12px;">
           Nous utiliserons ces indications — et vos réponses aux suivis quotidiens — pour cibler vos prochaines questions.
         </p>`
      : `<p style="margin:16px 0;color:#374151;">
           Vous n'avez pas indiqué de chapitre prioritaire : le suivi s'adaptera au fil de vos réponses.
         </p>`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f5f7f9;font-family:'Inter','Segoe UI',Roboto,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5f7f9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;width:100%;">
          <tr>
            <td align="center" style="padding:0 0 12px;">
              <a href="https://dojofinancier.com" target="_blank" style="text-decoration:none;">
                <img src="https://dojofinancier.netlify.app/_next/image?url=%2Flogo_dark.png&w=300&q=100" alt="Dojo Financier" width="300" style="display:block;border:0;outline:none;max-width:300px;height:auto;">
              </a>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:12px 12px 0 0;padding:30px 40px 20px;text-align:center;">
              <p style="margin:0 0 8px;color:#00a63e;font-size:16px;font-weight:700;">Salut, ${escapeHtml(first)}</p>
              <h1 style="margin:0;font-size:30px;line-height:1.2;font-weight:800;color:#000000;">Bienvenue dans votre accompagnement</h1>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:0 40px;">
              <p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#111827;">
                Merci d'avoir complété votre configuration. Voici comment fonctionne votre accompagnement personnalisé :
              </p>
              <ul style="margin:0 0 16px;padding-left:20px;line-height:1.7;color:#111827;font-size:16px;">
                <li><strong>Suivi quotidien</strong> (courriel ou SMS) avec un <strong>lien personnel</strong> sans connexion.</li>
                <li>Des questions ciblées selon votre cours, votre rythme et les sujets à consolider.</li>
                <li>Un <strong>bilan hebdomadaire</strong> pour suivre votre progression.</li>
              </ul>
              ${weakSectionHtml}
            </td>
          </tr>
          ${
            baseUrl
              ? `<tr>
                   <td align="center" style="background:#ffffff;padding:12px 40px 22px;">
                     <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                       <tr><td style="border-top:1px solid #eeeeee;height:20px;line-height:20px;"></td></tr>
                     </table>
                     <a href="${escapeHtml(baseUrl)}" target="_blank" style="display:inline-block;background:#00a63e;color:#ffffff;text-decoration:none;font-weight:700;font-size:17px;line-height:1;padding:14px 26px;border-radius:6px;border:1px solid #000000;">
                       Ouvrir mon tableau de bord
                     </a>
                     <p style="margin:14px 0 0;font-size:12px;color:#6b7280;line-height:1.5;">
                       Vous pourrez y consulter votre série, votre plan de semaine et l'historique de vos suivis quotidiens.
                     </p>
                   </td>
                 </tr>`
              : ""
          }
          <tr>
            <td align="center" style="background:#00a63e;padding:22px 20px 14px;">
              <a href="https://dojofinancier.com" target="_blank" style="text-decoration:none;">
                <img src="https://dojofinancier.netlify.app/_next/image?url=%2Flogo_light.png&w=300&q=100" alt="Dojo Financier" width="260" style="display:block;border:0;outline:none;max-width:260px;height:auto;">
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="background:#00a63e;padding:0 20px 26px;">
              <p style="margin:0;color:#ffffff;font-size:13px;line-height:1.5;">Dojo Financier — Suivi personnalise</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  const weakText =
    params.weakChapterLines.length > 0
      ? [
          "Zones à renforcer (auto-évaluation) :",
          ...params.weakChapterLines.map((l) => `• ${l}`),
          "",
          "Ces indications et vos réponses aux suivis quotidiens guident les prochaines questions.",
          "",
        ].join("\n")
      : "Vous n'avez pas indiqué de chapitre prioritaire : le suivi s'adaptera au fil de vos réponses.\n\n";

  const text = [
    `Bonjour ${first},`,
    "",
    "Merci d'avoir complété votre configuration. Votre accompagnement personnalisé est activé.",
    "",
    "Fonctionnement :",
    "• Suivi quotidien par e-mail ou SMS avec un lien personnel (sans connexion).",
    "• Questions ciblées selon votre cours et vos besoins.",
    "• Bilan hebdomadaire et progression suivie.",
    "",
    weakText,
    baseUrl ? `Tableau de bord : ${baseUrl}\n` : "",
    "— Dojo Financier, Suivi personnalisé",
  ].join("\n");

  try {
    const result = await sendTransactionalEmail({
      to: { email: params.recipientEmail, name: first },
      subject,
      html,
      text,
    });
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    return { ok: true, emailId: result.providerMessageId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export async function sendWeeklyRecapEmail(params: {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}): Promise<string | null> {
  try {
    const result = await sendTransactionalEmail({
      to: {
        email: params.recipientEmail,
        ...(params.recipientName?.trim()
          ? { name: params.recipientName.trim() }
          : {}),
      },
      subject: params.subject,
      html: params.htmlBody,
      text: params.textBody,
    });

    if (!result.ok) {
      console.error(
        `Failed to send weekly recap email via ${result.provider}:`,
        result.error
      );
      return null;
    }
    return result.providerMessageId;
  } catch (error) {
    console.error("Failed to send weekly recap email:", error);
    return null;
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function markdownToBasicHtml(md: string): string {
  // Very small markdown -> HTML conversion for the weekly recap summary.
  const escaped = escapeHtml(md.trim());
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const withItalic = withBold.replace(/\*(.+?)\*/g, "<em>$1</em>");
  const lines = withItalic.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  for (const line of lines) {
    if (/^[-*] /.test(line)) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${line.replace(/^[-*] /, "")}</li>`);
      continue;
    }
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
    if (line.trim() === "") {
      out.push("");
      continue;
    }
    if (/^### /.test(line)) out.push(`<h3>${line.replace(/^### /, "")}</h3>`);
    else if (/^## /.test(line)) out.push(`<h3>${line.replace(/^## /, "")}</h3>`);
    else out.push(`<p>${line}</p>`);
  }
  if (inList) out.push("</ul>");
  return out.join("\n");
}
