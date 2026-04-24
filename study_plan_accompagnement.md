# Algorithme de planification hebdomadaire — Accompagnement ERCI

## 1. Objectif

Géner un plan d’étude hebdomadaire jusqu’à la date d’examen, au niveau **chapitre**, qui :
- assure d’abord la **couverture complète** du cours,
- tient compte de l’autoévaluation initiale par chapitre,
- s’ajuste selon les résultats réels,
- reste simple et compréhensible pour l’étudiant,
- et signale clairement si l’échéancier est irréaliste.

Le plan doit produire :
- un plan complet jusqu’à l’examen,
- avec un accent visuel sur **la semaine en cours**.

---

## 2. Modalités

Le plan travaille avec 4 modalités :

- **Apprendre**
- **Réviser**
- **Pratiquer**
- **Renforcer**

Chaque chapitre reçoit :
- **une modalité principale**
- **une modalité secondaire**

---

## 3. Données d’entrée requises

## 3.1 Données étudiant
- `student_id`
- `course_id`
- `exam_date`
- `study_hours_per_week`
- `current_date`
- `chapter_self_assessment[]`

## 3.2 Autoévaluation par chapitre
Pour chaque chapitre :
- `chapter_id`
- `self_assessment_status`

Valeurs possibles :
- `not_started`
- `read_low_confidence`
- `read_somewhat_confident`
- `read_confident`

## 3.3 Performance observée par chapitre
Pour chaque chapitre :
- `questions_answered_count`
- `combined_score`
- `repeated_wrong_answers_count`
- `successful_signals_count`
- `last_activity_date`

## 3.4 Ordre du cours
Pour chaque chapitre :
- `chapter_id`
- `chapter_order`

L’algorithme doit favoriser les chapitres non couverts les plus tôt dans l’ordre du cours.

---

## 4. États de chapitre

Chaque chapitre doit être classé dans un état logique dérivé.

Valeurs :

- `not_started`
- `covered_once`
- `needs_reinforcement`
- `stable`

### Règle de couverture initiale
Un chapitre devient `covered_once` si **l’une** des conditions suivantes est vraie :
1. l’étudiant le marque comme complété, ou
2. l’étudiant a répondu à **au moins 10 questions** du chapitre **et** a un `combined_score >= 70%`

### Règle de renforcement
Un chapitre devient `needs_reinforcement` si :
- `repeated_wrong_answers_count > 0`
**ou**
- l’autoévaluation le place dans un niveau de faible confiance pertinent

### Règle de sortie du renforcement
Un chapitre sort de `needs_reinforcement` après **5 successful signals**.

Un successful signal peut être défini dans l’implémentation comme un signal positif sur le chapitre, par exemple :
- bonne réponse sur question ciblée,
- mini-série réussie,
- score satisfaisant sur questions récentes du chapitre.

---

## 5. Détermination de la phase

Le produit fonctionne selon des phases basées sur la progression réelle de couverture.

## 5.1 Phases possibles
- `apprendre`
- `réviser`
- `pratiquer`

## 5.2 Logique

### Phase 1 — apprendre
Si au moins un chapitre n’est pas encore `covered_once`, la phase du plan est :
- `apprendre`

### Phase 2 — réviser
Si tous les chapitres sont `covered_once`, mais qu’il reste des chapitres `needs_reinforcement` ou fragiles :
- `réviser`

### Phase 3 — pratiquer
Si tous les chapitres sont couverts et que les chapitres fragiles diminuent suffisamment :
- `pratiquer`

Remarque :
La phase globale du plan peut être déterminée au moment de chaque recalcul hebdomadaire.

---

## 6. Détermination de la capacité hebdomadaire

L’unité principale reste **le temps**, pas le nombre de chapitres.

Cependant, le plan visible ne peut afficher que **3 priorités max par semaine**.

## 6.1 Nombre maximal de chapitres visibles
- maximum `3` chapitres par semaine

## 6.2 Règle de simplification visuelle
Même si le moteur interne estime une charge plus grande, le plan affiché ne montre jamais plus de 3 chapitres prioritaires.

---

## 7. Calcul de faisabilité

Le système doit vérifier si la date d’examen est réaliste.

## 7.1 Calculs de base
- `weeks_remaining = ceil((exam_date - current_date) / 7)`
- `uncovered_count = number of chapters not covered_once`
- `weak_count = number of chapters in needs_reinforcement`
- `hours_per_week = study_hours_per_week`

## 7.2 Pression de couverture
- `coverage_pressure = uncovered_count / max(weeks_remaining, 1)`

## 7.3 Charge totale estimée
La faisabilité doit tenir compte de :
- chapitres non couverts,
- chapitres faibles,
- heures disponibles,
- semaines restantes.

## 7.4 Statut de plan requis
Le système doit produire un `plan_status` parmi :
- `on_track`
- `tight`
- `at_risk`
- `unrealistic`

## 7.5 Règle de décision recommandée
L’implémentation peut utiliser un score composite, mais le minimum attendu :

### `on_track`
- couverture réaliste au rythme actuel
- assez d’heures pour première couverture + révision minimale

### `tight`
- couverture possible, mais peu de marge pour consolider

### `at_risk`
- couverture ou consolidation compromises sans hausse d’effort

### `unrealistic`
- impossible ou très improbable de couvrir correctement toute la matière selon :
  - chapitres restants
  - chapitres faibles
  - semaines restantes
  - heures disponibles

---

## 8. Comportement si échéancier irréaliste

Si `plan_status = unrealistic` :
1. afficher un avertissement
2. recommander de reporter l’examen
3. si l’étudiant maintient la date, activer `compressed_mode = true`

## 8.1 Effet du compressed mode
En mode compressé :
- priorité absolue à la **couverture large**
- réduction relative de la profondeur de révision
- moins de place au renforcement fin
- plan plus agressif sur les chapitres non couverts

---

## 9. Priorisation des chapitres

Chaque semaine, l’algorithme doit classer les chapitres selon une priorité.

## 9.1 Principes globaux
Priorité générale :
1. chapitres non couverts
2. parmi eux, les plus tôt dans l’ordre du cours
3. puis chapitres faibles / à renforcer
4. puis chapitres à réviser / pratiquer

## 9.2 Score de priorité conceptuel
Il n’est pas nécessaire d’exposer les sous-scores dans le produit, mais le moteur peut utiliser un score interne composé de :

- `coverage_priority`
- `reinforcement_priority`
- `self_assessment_priority`
- `recency_priority`

## 9.3 Règles concrètes

### Couverture
Les chapitres non couverts doivent être priorisés avant les chapitres déjà couverts.

### Ordre
Parmi les chapitres non couverts, choisir en priorité ceux avec le plus petit `chapter_order`.

### Faiblesse
Les chapitres avec erreurs répétées ou faible confiance remontent dans la priorité, mais **sans bloquer la couverture globale**, car la priorité produit demandée est :
- **broad coverage first**

---

## 10. Attribution des modalités

Chaque chapitre sélectionné reçoit :
- une modalité principale
- une modalité secondaire

## 10.1 Logique de la modalité principale

### Si chapitre non couvert
- principale = `apprendre`

### Si chapitre couvert mais faible confiance
- principale = `réviser`

### Si chapitre couvert et relativement stable mais encore actif dans le plan
- principale = `pratiquer`

### Si chapitre marqué faible par erreurs répétées
- principale = `renforcer`

## 10.2 Logique de la modalité secondaire

### Cas 1
Principale = `apprendre`
- secondaire = `réviser`

### Cas 2
Principale = `réviser`
- secondaire = `pratiquer`

### Cas 3
Principale = `pratiquer`
- secondaire = `renforcer` si fragilité présente
- sinon `réviser`

### Cas 4
Principale = `renforcer`
- secondaire = `pratiquer`

---

## 11. Génération du plan hebdomadaire

Le plan est recalculé **après la soumission du quiz hebdomadaire**.

## 11.1 Étapes

### Étape 1
Calculer les états réels de tous les chapitres.

### Étape 2
Calculer :
- `weeks_remaining`
- `uncovered_count`
- `weak_count`
- `plan_status`
- `compressed_mode`

### Étape 3
Déterminer la phase globale :
- `apprendre`
- `réviser`
- `pratiquer`

### Étape 4
Construire la liste triée des chapitres prioritaires.

### Étape 5
Sélectionner jusqu’à **3 chapitres max** pour la semaine.

### Étape 6
Attribuer pour chaque chapitre :
- modalité principale
- modalité secondaire
- raison courte

### Étape 7
Générer le résumé de l’objectif hebdomadaire.

---

## 12. Règles de sélection hebdomadaire

## 12.1 Règle générale
Sélectionner jusqu’à 3 chapitres.

## 12.2 Priorité de composition

### En phase `apprendre`
La semaine doit privilégier :
- chapitres non couverts en premier
- puis, si place restante, un chapitre faible à revoir

### En phase `réviser`
La semaine doit privilégier :
- chapitres faibles
- chapitres à faible confiance
- chapitres récemment couverts mais à consolider

### En phase `pratiquer`
La semaine doit privilégier :
- pratique transversale
- chapitres encore fragiles
- maintien des acquis

## 12.3 En mode compressé
La sélection doit augmenter le poids de la couverture des chapitres non vus.

---

## 13. Mise à jour basée sur la semaine écoulée

Le plan suivant ne doit **jamais supposer** qu’un chapitre assigné a été réellement travaillé.

## 13.1 Confirmation étudiante
À la fin de la semaine, pour chaque chapitre assigné, l’étudiant peut indiquer :
- `completed`
- `partial`
- `not_completed`

## 13.2 Usage de cette confirmation
- `completed` peut servir de preuve suffisante de couverture
- `partial` n’est pas suffisant seul pour `covered_once`
- `not_completed` maintient le chapitre dans les chapitres à replanifier si nécessaire

## 13.3 Règle finale
La planification suivante doit se baser sur :
- confirmation étudiante
- signaux d’activité
- performance observée

et **non** sur l’assignation seule.

---

## 14. Résultat à produire par semaine

L’algorithme doit produire, pour chaque semaine :

- `week_start`
- `week_end`
- `phase`
- `plan_status`
- `estimated_hours`
- `selected_chapters[]`
- `primary_modality` per chapter
- `secondary_modality` per chapter
- `reason` per chapter
- `weekly_goal_summary`

## 14.1 Structure recommandée pour selected_chapters[]
Pour chaque chapitre :
- `chapter_id`
- `chapter_order`
- `primary_modality`
- `secondary_modality`
- `reason`

## 14.2 Exemples de reasons
- chapitre non commencé
- faible confiance déclarée
- erreurs répétées récentes
- couverture prioritaire avant l’examen
- chapitre récemment travaillé à consolider

---

## 15. Sortie complète attendue

L’algorithme doit générer :
1. le plan complet jusqu’à l’examen
2. une semaine courante mise en avant

Le dashboard peut ensuite afficher :
- **Cette semaine**
- **Semaines à venir**

---

## 16. Pseudocode de référence

```pseudo
function generateStudyPlan(student, course, chapterData, weeklyPerformanceData):

    weeks_remaining = ceil(days_between(current_date, exam_date) / 7)

    for each chapter in course.chapters:
        chapter.state = deriveChapterState(
            self_assessment_status,
            completion_confirmation,
            questions_answered_count,
            combined_score,
            repeated_wrong_answers_count,
            successful_signals_count
        )

    uncovered_chapters = chapters where state != covered_once and state != stable and not enough proof of coverage
    weak_chapters = chapters where state == needs_reinforcement

    plan_status = computePlanStatus(
        uncovered_chapters,
        weak_chapters,
        weeks_remaining,
        study_hours_per_week
    )

    compressed_mode = false
    if plan_status == unrealistic and student_keeps_exam_date == true:
        compressed_mode = true

    phase = determinePhase(chapters)
    // apprendre if any uncovered remain
    // else réviser if weak chapters remain
    // else pratiquer

    all_weeks = []

    for each week until exam_date:

        ranked_chapters = rankChapters(
            chapters,
            phase,
            compressed_mode,
            prioritize_uncovered_first = true,
            prioritize_earlier_order_first = true,
            prioritize_weak_after_coverage = true
        )

        selected = take_first_up_to_3(ranked_chapters)

        for each chapter in selected:
            primary_modality = assignPrimaryModality(chapter.state, self_assessment_status, performance)
            secondary_modality = assignSecondaryModality(primary_modality, chapter.state)
            reason = generateReason(chapter)

        weekly_goal_summary = generateWeeklyGoalSummary(
            phase,
            selected,
            plan_status,
            compressed_mode
        )

        all_weeks.append({
            week_start,
            week_end,
            phase,
            plan_status,
            estimated_hours: study_hours_per_week,
            selected_chapters: selected with modalities and reasons,
            weekly_goal_summary
        })

        // optional simulation layer:
        // advance only projected scheduling, but do not mark chapters truly covered
        // true recalculation happens after real weekly quiz submission

    return all_weeks