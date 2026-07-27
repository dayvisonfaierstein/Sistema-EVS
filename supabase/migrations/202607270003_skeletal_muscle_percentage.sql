alter table public.assessments
  add column if not exists skeletal_muscle_percentage numeric
  check (skeletal_muscle_percentage between 0 and 100);
