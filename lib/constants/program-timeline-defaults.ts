import type { ProgramTimelineStep } from "@/lib/types/program-timeline";

/** Site-wide default timeline when `Course.programTimelineSteps` is null */
export const DEFAULT_PROGRAM_TIMELINE_STEPS: ProgramTimelineStep[] = [
  {
    label: "Jour 1",
    title: "Évaluez votre point de départ",
    description:
      "Évaluation de votre niveau, de vos contraintes et de votre date d'examen pour bâtir un plan de révision réaliste.",
  },
  {
    label: "Semaines 1-6",
    title: "Apprentissage structuré",
    description:
      "Suivez les modules et les notes structurées pour comprendre les concepts clés sans vous perdre dans la matière.",
  },
  {
    label: "Continu",
    title: "Renforcez votre mémoire",
    description:
      "Utilisez les flashcards et les quiz pour retenir les notions importantes et corriger vos faiblesses.",
  },
  {
    label: "2 semaines avant l'examen",
    title: "Passez en mode examen",
    description:
      "Simulations chronométrées pour vous habituer au format, au rythme et à la gestion du stress.",
  },
  {
    label: "Jour de l'examen",
    title: "Arrivez prêt le jour J",
    description:
      "Suivez nos conseils basés sur des données scientifiques et 15 ans d'expérience pour optimiser votre performance et maximiser vos chances de réussite.",
  },
];
