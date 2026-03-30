import type { Metadata } from "next";
import { QuestionnaireClient } from "./questionnaire-client";
import { absoluteUrl, siteOpenGraphDefaults, siteTwitterDefaults } from "@/lib/seo/metadata-helpers";

const TITLE = "Diagnostic investisseur — Questionnaire";
const DESCRIPTION = "Réponds à 6 questions pour clarifier ton style de décision en investissement.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/investisseur/questionnaire" },
  openGraph: {
    ...siteOpenGraphDefaults(),
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/investisseur/questionnaire"),
  },
  twitter: {
    ...siteTwitterDefaults(),
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function InvestisseurQuestionnairePage() {
  return <QuestionnaireClient />;
}

