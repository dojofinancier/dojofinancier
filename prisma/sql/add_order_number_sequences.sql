-- Atomic, race-free order_number allocation via Postgres sequences.
--
-- Why: order_number was previously assigned in app code via MAX(order_number)+1,
-- which races under concurrent enrollment creation (Stripe webhook + client
-- fallback both running for the same payment intent). Two callers could read
-- the same MAX, both compute the same next number, and the second INSERT would
-- fail with a unique violation on order_number. We move allocation into the DB.
--
-- Namespaces (preserved from prior app behavior):
--   - enrollments + cohort_enrollments share one sequence starting at 5190
--     (current max is 5396 across both tables; next allocation = 5397)
--   - accompagnement_enrollments has its own sequence starting at 10000
--     (current max is 10008; next allocation = 10009)
--
-- Side effect to be aware of: order_number values may have small gaps after
-- failed inserts (race losers, validation rollbacks). This is normal for any
-- DB-issued numbering and is acceptable for our business order numbering.

CREATE SEQUENCE IF NOT EXISTS public.enrollment_order_seq
  AS bigint INCREMENT BY 1 MINVALUE 1 NO MAXVALUE START WITH 5190;

CREATE SEQUENCE IF NOT EXISTS public.accompagnement_order_seq
  AS bigint INCREMENT BY 1 MINVALUE 1 NO MAXVALUE START WITH 10000;

-- Align sequence current value with current MAX so the very next nextval()
-- returns MAX + 1. is_called=true (third arg) means nextval increments first.
DO $$
DECLARE
  max_enrollment_order INTEGER;
  max_cohort_order INTEGER;
  max_combined INTEGER;
  max_accompagnement INTEGER;
BEGIN
  SELECT COALESCE(MAX(order_number), 5189) INTO max_enrollment_order FROM public.enrollments;
  SELECT COALESCE(MAX(order_number), 5189) INTO max_cohort_order FROM public.cohort_enrollments;
  max_combined := GREATEST(max_enrollment_order, max_cohort_order);
  PERFORM setval('public.enrollment_order_seq', max_combined, true);

  SELECT COALESCE(MAX(order_number), 9999) INTO max_accompagnement FROM public.accompagnement_enrollments;
  PERFORM setval('public.accompagnement_order_seq', max_accompagnement, true);
END $$;

ALTER TABLE public.enrollments
  ALTER COLUMN order_number SET DEFAULT nextval('public.enrollment_order_seq');

ALTER TABLE public.cohort_enrollments
  ALTER COLUMN order_number SET DEFAULT nextval('public.enrollment_order_seq');

ALTER TABLE public.accompagnement_enrollments
  ALTER COLUMN order_number SET DEFAULT nextval('public.accompagnement_order_seq');

-- Tie sequence ownership to a primary owner column so DROP TABLE on the
-- owner table also drops the sequence. cohort_enrollments shares
-- enrollment_order_seq via DEFAULT but the primary owner is enrollments.
ALTER SEQUENCE public.enrollment_order_seq OWNED BY public.enrollments.order_number;
ALTER SEQUENCE public.accompagnement_order_seq OWNED BY public.accompagnement_enrollments.order_number;
