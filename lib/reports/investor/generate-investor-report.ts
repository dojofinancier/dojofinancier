import {
  INVESTISSEUR_ARCHETYPES,
  INVESTISSEUR_QUESTIONS,
  type InvestisseurResult,
} from "@/lib/constants/investisseur-diagnostic";

export type GenerateInvestorReportInput = {
  firstName: string;
  email: string;
  responses: Record<string, string>;
  result: InvestisseurResult;
  reportVersion: string;
};

export type GeneratedInvestorReport = {
  renderedMd: string;
  reportTitle: string;
  version: string;
};

type ProfileId =
  | "architecte"
  | "stratege"
  | "delegateur"
  | "navigateur"
  | "optimiseur"
  | "prudent"
  | "explorateur";

const PROFILE_CONTENT: Record<
  ProfileId,
  {
    whatItMeans: string;
    strengths: string[];
    blindSpot: string;
    topMistakes: Array<{ title: string; fix: string }>;
    next7Days: string[];
  }
> = {
  architecte: {
    whatItMeans:
      "Tu investis avec une logique de système : règles, discipline, horizon long terme. Ton avantage, c’est la constance. Ton risque, c’est de devenir trop rigide (ou trop confiant dans “le plan” sans re-questionner les hypothèses).",
    strengths: [
      "Capacité à tenir le cap quand ça bouge",
      "Vision long terme et patience",
      "Structure (écrit, règles, process)",
    ],
    blindSpot:
      "Rigidité : refuser d’ajuster une stratégie même quand le contexte ou tes objectifs ont changé.",
    topMistakes: [
      {
        title: "Optimiser des détails avant d’optimiser les fondamentaux",
        fix: "Reviens aux 3 piliers : allocation, coûts, comportement. Tout le reste vient après.",
      },
      {
        title: "Sous-estimer le risque de concentration",
        fix: "Vérifie tes 5 plus grosses positions et ton exposition sectorielle/pays. Fixe une limite simple.",
      },
      {
        title: "Confondre discipline et entêtement",
        fix: "Planifie une revue trimestrielle : objectifs, horizon, risques, et ajustements autorisés (à l’avance).",
      },
    ],
    next7Days: [
      "Écris ton “Investor Policy Statement” en 10 lignes (objectifs, horizon, tolérance aux baisses, règles).",
      "Établis une allocation cible (ex: actions/obligations/cash) + une marge de rééquilibrage.",
      "Supprime 1 complexité inutile (produit opaque, doublon, stratégie non comprise).",
      "Active une routine de revue (15 min/semaine) et une revue trimestrielle (45 min).",
    ],
  },
  stratege: {
    whatItMeans:
      "Tu as une bonne direction et tu réfléchis bien, mais ton cadre n’est pas encore assez explicite. Ton levier principal : transformer une “bonne intuition” en règles simples, pour éviter les décisions au feeling.",
    strengths: ["Bon jugement global", "Réévalue sans paniquer", "Capacité à apprendre vite"],
    blindSpot:
      "Manque de formalisation : tu sais où tu veux aller, mais tu n’as pas encore un système qui te protège de toi-même quand l’émotion monte.",
    topMistakes: [
      {
        title: "Changer de stratégie sans t’en rendre compte",
        fix: "Définis 3 règles immuables (ex: allocation cible, fréquence de rééquilibrage, budget “expérimentation”).",
      },
      {
        title: "Trop d’information, pas assez de décisions",
        fix: "Réduis tes sources à 2-3 maximum et transforme-les en checklists (pas en impulsions).",
      },
      {
        title: "Sous-estimer le rôle du comportement",
        fix: "Écris ton plan “quand ça baisse de 20%” (quoi faire / quoi ne pas faire).",
      },
    ],
    next7Days: [
      "Écris ta stratégie sur 1 page (objectif, horizon, allocation, règles de contribution).",
      "Crée une checklist de décision (avant d’acheter : pourquoi, horizon, risque, alternative).",
      "Fixe un budget “opportunités” (petit %) pour éviter de contaminer le cœur du portefeuille.",
      "Choisis 1 métrique simple de suivi (ex: % actions, coût total, taux d’épargne).",
    ],
  },
  delegateur: {
    whatItMeans:
      "Tu délègues beaucoup — parfois par confiance, parfois pour éviter la complexité. Le vrai risque ici n’est pas “le conseiller” : c’est l’asymétrie d’information. Ton levier : comprendre assez pour piloter.",
    strengths: ["Simplicité", "Moins d’impulsivité", "Peut gagner du temps si bien encadré"],
    blindSpot:
      "Tu peux être investi dans un portefeuille que tu ne comprends pas vraiment (produits, frais, risques).",
    topMistakes: [
      {
        title: "Ne pas connaître tes frais totaux",
        fix: "Demande noir sur blanc : frais de gestion + frais des produits + frais de transaction, en $/an et en %.",
      },
      {
        title: "Confondre “déléguer” et “abandonner”",
        fix: "Définis ton cadre (objectif, horizon, limites) et exige des explications simples et régulières.",
      },
      {
        title: "Ne pas vérifier l’alignement d’intérêts",
        fix: "Clarifie comment ton conseiller est rémunéré et compare 1 alternative (FNB/portefeuille modèle).",
      },
    ],
    next7Days: [
      "Obtiens un “snapshot” de ton portefeuille (allocation, produits, frais, rendement).",
      "Pose 5 questions essentielles (frais, risques, scénario -20%, plan de rééquilibrage, justification).",
      "Écris tes objectifs en 5 lignes et partage-les à ton conseiller.",
      "Décide d’une cadence de revue (trimestrielle) et d’un format de rapport standard.",
    ],
  },
  navigateur: {
    whatItMeans:
      "Tu avances au fil de l’information. Le danger : l’actualité pilote ton portefeuille. Ton levier : une boussole simple (objectifs + règles) pour filtrer l’info.",
    strengths: ["Curiosité", "Réactivité", "Capacité à repérer des idées"],
    blindSpot:
      "Volatilité de stratégie : tu peux avoir raison sur des idées, mais perdre sur l’exécution (timing, incohérence, rotation).",
    topMistakes: [
      { title: "Surconsommer l’info", fix: "Passe d’un flux quotidien à une revue hebdo + une checklist d’action." },
      { title: "Acheter des récits", fix: "Exige une thèse simple : pourquoi ça marche, quand ça échoue, horizon." },
      { title: "Manquer de cœur de portefeuille", fix: "Construis un noyau (80-90%) stable, et garde l’exploration à part." },
    ],
    next7Days: [
      "Crée ton noyau (ex: 2-4 FNB diversifiés) + une règle de contribution automatique.",
      "Réduis tes sources à 2 (1 long format + 1 synthèse), le reste = “bonus”.",
      "Sépare “cœur” et “satellites” (petit budget idées).",
      "Écris 3 règles anti-impulsivité (délai 48h, taille max position, validation checklist).",
    ],
  },
  optimiseur: {
    whatItMeans:
      "Tu es très impliqué et tu cherches à faire mieux… mais tu optimises parfois au mauvais endroit (trop tôt). Ton levier : simplifier et mesurer ce qui compte.",
    strengths: ["Énergie", "Apprentissage", "Volonté d’améliorer les résultats"],
    blindSpot:
      "Tu peux confondre activité et progrès. Plus d’actions ≠ meilleurs résultats (et ça augmente les erreurs).",
    topMistakes: [
      { title: "Trop de transactions", fix: "Réduis la fréquence. Mets l’effort sur l’allocation et les contributions." },
      { title: "Optimiser pour le court terme", fix: "Choisis 1 horizon principal, et aligne le portefeuille sur cet horizon." },
      { title: "Complexifier (produits/stratégies)", fix: "Si tu ne peux pas l’expliquer en 30 secondes, ce n’est pas un “core holding”." },
    ],
    next7Days: [
      "Mesure tes coûts (frais + turnover). Choisis 1 amélioration à fort impact.",
      "Définis ton noyau simple + ton budget d’expérimentation (petit %).",
      "Crée une règle de “moins mais mieux” : 1 décision/sem max, si checklist validée.",
      "Planifie une revue mensuelle : allocation, contributions, erreurs, leçons.",
    ],
  },
  prudent: {
    whatItMeans:
      "La sécurité et la protection du capital sont centrales. Ton risque : laisser l’émotion dicter les décisions, surtout en baisse. Ton levier : un plan de risque clair (à l’avance).",
    strengths: ["Prudence", "Sens du risque", "Recherche de stabilité"],
    blindSpot:
      "Risque de vendre au mauvais moment (ou de rester trop en retrait) et de manquer la croissance nécessaire à tes objectifs.",
    topMistakes: [
      { title: "Vendre en panique", fix: "Écris une règle : aucune vente sous stress sans 72h + checklist." },
      { title: "Trop de cash par défaut", fix: "Décide d’un cash cible (ex: 3-6 mois) et investis le surplus systématiquement." },
      { title: "Confondre volatilité et risque", fix: "Relie ton horizon et ton besoin de liquidité au niveau de risque acceptable." },
    ],
    next7Days: [
      "Écris ton plan “marché -20%” (quoi faire / quoi ne pas faire).",
      "Définis un cash buffer et automatise tes contributions (petit montant).",
      "Choisis 1 portefeuille simple qui respecte ton risque (ex: mix actions/obligations).",
      "Réduis les sources anxiogènes (news) et remplace par 1 revue hebdo structurée.",
    ],
  },
  explorateur: {
    whatItMeans:
      "Tu es curieux et opportuniste. Ton risque : l’incohérence dans le temps. Ton levier : cadrer l’exploration pour qu’elle serve tes objectifs (au lieu de les remplacer).",
    strengths: ["Ouverture", "Flexibilité", "Capacité à saisir des opportunités"],
    blindSpot:
      "Tu peux passer d’une idée à l’autre sans capitaliser (pas de répétition, pas de système, pas de mesure).",
    topMistakes: [
      { title: "Changer trop souvent", fix: "Impose un horizon minimum par position (sauf invalidation claire)." },
      { title: "Absence de noyau", fix: "Construis un cœur stable, puis explore avec un budget limité." },
      { title: "Décisions guidées par le narratif", fix: "Utilise une thèse écrite : pourquoi / quand / combien / sortie." },
    ],
    next7Days: [
      "Définis ton “terrain de jeu” (budget explorateur) et protège le reste.",
      "Crée un journal d’investissement (décision, thèse, horizon, critères de sortie).",
      "Établis une allocation simple pour le noyau et automatise les apports.",
      "Choisis 1 thème d’apprentissage structuré (pas 5 en parallèle).",
    ],
  },
};

function mdEscape(text: string): string {
  // Minimal escaping to avoid breaking markdown headings/links
  return text.replace(/\r?\n/g, " ").trim();
}

function getArchetypeName(id: string): string {
  return INVESTISSEUR_ARCHETYPES.find((a) => a.id === id)?.name ?? id;
}

function getAnswerText(questionId: string, answerId: string | undefined): string | null {
  if (!answerId) return null;
  const q = INVESTISSEUR_QUESTIONS.find((qq) => qq.id === questionId);
  const a = q?.answers.find((aa) => aa.id === answerId);
  return a?.text ?? null;
}

function confidenceLabel(confidence: InvestisseurResult["confidence"]): string {
  switch (confidence) {
    case "high":
      return "Élevée";
    case "medium":
      return "Moyenne";
    default:
      return "Faible";
  }
}

export function generateInvestorReport(input: GenerateInvestorReportInput): GeneratedInvestorReport {
  const primaryId = input.result.primary.id as ProfileId;
  const secondaryId = (input.result.secondary?.id ?? null) as ProfileId | null;

  const primaryContent = PROFILE_CONTENT[primaryId] ?? null;
  const secondaryContent = secondaryId ? PROFILE_CONTENT[secondaryId] ?? null : null;

  const reportTitle = `Rapport Investisseur — ${mdEscape(input.firstName)}`;

  const answersSummary = [
    ["Objectif", getAnswerText("q1_goal", input.responses["q1_goal"])],
    ["Horizon", getAnswerText("q2_horizon", input.responses["q2_horizon"])],
    ["Réaction aux baisses", getAnswerText("q3_drawdown_reaction", input.responses["q3_drawdown_reaction"])],
    ["Structure", getAnswerText("q4_structure", input.responses["q4_structure"])],
    ["Source d’info", getAnswerText("q5_info_source", input.responses["q5_info_source"])],
    ["Temps/énergie", getAnswerText("q6_time_energy", input.responses["q6_time_energy"])],
  ]
    .filter(([, v]) => Boolean(v))
    .map(([k, v]) => `- **${k}**: ${v}`);

  const lines: string[] = [];
  lines.push(`# ${reportTitle}`);
  lines.push("");
  lines.push(`Bonjour **${mdEscape(input.firstName)}**,`);
  lines.push("");
  lines.push(
    "Ce rapport est conçu pour te donner une lecture claire de ta manière d’investir, tes points forts, tes pièges typiques, et un plan simple pour progresser rapidement."
  );
  lines.push("");
  lines.push("> Éducation seulement. Ceci n’est pas un conseil d’investissement personnalisé.");
  lines.push("");

  lines.push("## 1) Ton résultat");
  lines.push("");
  lines.push(`- **Profil principal**: ${getArchetypeName(primaryId)} (${input.result.primary.score} pts)`);
  if (secondaryId) {
    lines.push(`- **Profil secondaire**: ${getArchetypeName(secondaryId)} (${input.result.secondary?.score ?? 0} pts)`);
  } else {
    lines.push(`- **Profil secondaire**: Aucun (selon les règles d’éligibilité du diagnostic)`);
  }
  lines.push(`- **Confiance**: ${confidenceLabel(input.result.confidence)}`);
  lines.push("");

  if (answersSummary.length) {
    lines.push("### Tes réponses (résumé)");
    lines.push("");
    lines.push(...answersSummary);
    lines.push("");
  }

  lines.push("## 2) Lecture rapide (ce que ça veut dire)");
  lines.push("");
  if (primaryContent) {
    lines.push(primaryContent.whatItMeans);
  } else {
    lines.push("Ton profil indique une manière d’investir spécifique. Le rapport complet sera enrichi au fil des versions.");
  }
  lines.push("");

  if (secondaryId && secondaryContent) {
    lines.push("### Comment tes 2 profils se combinent");
    lines.push("");
    lines.push(
      `Ton profil secondaire (${getArchetypeName(secondaryId)}) colore ton style principal : ça peut être une force si c’est cadré, ou une source de friction si tu n’as pas de règles simples.`
    );
    lines.push("");
  }

  lines.push("## 3) Tes forces (à conserver)");
  lines.push("");
  if (primaryContent) {
    for (const s of primaryContent.strengths) lines.push(`- ${s}`);
  } else {
    lines.push("- Capacité à apprendre et à ajuster.");
  }
  lines.push("");

  lines.push("## 4) Ton angle mort (à surveiller)");
  lines.push("");
  lines.push(primaryContent?.blindSpot ?? "Un risque comportemental peut nuire à tes résultats si tu n’as pas de cadre.");
  lines.push("");

  lines.push("## 5) Tes 3 erreurs les plus probables (et comment les corriger)");
  lines.push("");
  if (primaryContent) {
    primaryContent.topMistakes.forEach((m, idx) => {
      lines.push(`### ${idx + 1}. ${m.title}`);
      lines.push("");
      lines.push(`**Correctif**: ${m.fix}`);
      lines.push("");
    });
  } else {
    lines.push("- Clarifier objectif/horizon.\n- Simplifier.\n- Automatiser.");
    lines.push("");
  }

  lines.push("## 6) Plan simple sur 7 jours");
  lines.push("");
  if (primaryContent) {
    for (const step of primaryContent.next7Days) lines.push(`- [ ] ${step}`);
  } else {
    lines.push("- [ ] Écris ton objectif et ton horizon.\n- [ ] Choisis une allocation simple.\n- [ ] Automatise tes apports.");
  }
  lines.push("");

  lines.push("## 7) Une règle d’or (à imprimer)");
  lines.push("");
  lines.push(
    "Ton rendement dépend moins de “la meilleure idée” que de ta capacité à répéter une stratégie simple, sur un horizon long, sans te saboter quand le marché bouge."
  );
  lines.push("");

  lines.push("---");
  lines.push(`Version du rapport: ${input.reportVersion}`);
  lines.push("");

  return {
    renderedMd: lines.join("\n"),
    reportTitle,
    version: input.reportVersion,
  };
}


