import type { Metadata } from "next";
import { QuestionnaireClient } from "./questionnaire-client";

export const metadata: Metadata = {
  title: "Diagnostic Investisseur — Questionnaire | Le Dojo Financier",
  description: "Réponds à 6 questions pour clarifier ton style de décision en investissement.",
};

export default function InvestisseurQuestionnairePage() {
  return <QuestionnaireClient />;
}

