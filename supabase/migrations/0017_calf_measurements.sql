-- Add calf circumference fields to body measurements.

alter table body_measurements
  add column if not exists calf_left_cm numeric(5, 1),
  add column if not exists calf_right_cm numeric(5, 1);
