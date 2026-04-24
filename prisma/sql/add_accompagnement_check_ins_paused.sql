-- Student-controlled pause for daily accompagnement check-ins (no new sends while true).
ALTER TABLE accompagnement_enrollments
  ADD COLUMN IF NOT EXISTS check_ins_paused boolean NOT NULL DEFAULT false;
