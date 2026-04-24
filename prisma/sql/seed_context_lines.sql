-- Seed default context line templates used in daily/mid-week/weekly suivis.
-- Run once on fresh environments (idempotent via unique body guard not enforced;
-- re-runs will insert duplicates — delete + reseed if you iterate).

INSERT INTO "context_line_templates" (id, category, body, weekday_applicability, locale, active, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'NORMAL', 'Un petit effort aujourd''hui vaut mieux qu''un grand effort remis à demain.', '[1,2,3,4,5]'::jsonb, 'fr', true, NOW(), NOW()),
  (gen_random_uuid(), 'NORMAL', 'Rappelle-toi pourquoi tu as commencé. Une question à la fois.', '[0,1,2,3,4,5,6]'::jsonb, 'fr', true, NOW(), NOW()),
  (gen_random_uuid(), 'NORMAL', 'La régularité bat l''intensité. Prends deux minutes pour ce suivi quotidien.', '[1,2,3,4,5]'::jsonb, 'fr', true, NOW(), NOW()),

  (gen_random_uuid(), 'WEAK_AREA', 'On revient sur un point qui t''a posé problème récemment — c''est comme ça qu''on progresse.', '[0,1,2,3,4,5,6]'::jsonb, 'fr', true, NOW(), NOW()),
  (gen_random_uuid(), 'WEAK_AREA', 'Aujourd''hui, focus sur ce que tu ne maîtrises pas encore. C''est là que se joue la différence.', '[1,2,3,4,5]'::jsonb, 'fr', true, NOW(), NOW()),

  (gen_random_uuid(), 'MISSED_ACK', 'Pas grave pour hier. On repart du bon pied — une seule question aujourd''hui.', '[0,1,2,3,4,5,6]'::jsonb, 'fr', true, NOW(), NOW()),
  (gen_random_uuid(), 'MISSED_ACK', 'Une journée ratée n''efface pas les précédentes. On remet doucement la machine en route.', '[0,1,2,3,4,5,6]'::jsonb, 'fr', true, NOW(), NOW()),

  (gen_random_uuid(), 'PLAN_REMINDER', 'Rappel du plan de la semaine : avance doucement mais sûrement sur les chapitres ciblés.', '[1,3]'::jsonb, 'fr', true, NOW(), NOW()),
  (gen_random_uuid(), 'PLAN_REMINDER', 'Mi-semaine : vérifions où tu en es sur les chapitres prévus.', '[3]'::jsonb, 'fr', true, NOW(), NOW()),

  (gen_random_uuid(), 'EXAM_URGENCY', 'L''examen approche. Chaque question répondue aujourd''hui renforce demain.', '[0,1,2,3,4,5,6]'::jsonb, 'fr', true, NOW(), NOW()),
  (gen_random_uuid(), 'EXAM_URGENCY', 'On est dans la dernière ligne droite. Reste concentré, une question à la fois.', '[0,1,2,3,4,5,6]'::jsonb, 'fr', true, NOW(), NOW());
