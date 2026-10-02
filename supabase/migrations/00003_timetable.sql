-- ==============================================================================
-- SUKULU — MIGRATION 00003 : EMPLOIS DU TEMPS & CRÉNEAUX HORAIRES
-- ==============================================================================

-- 1. TABLE DES CRÉNEAUX D'EMPLOI DU TEMPS (timetable_slots)
CREATE TABLE IF NOT EXISTS public.timetable_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 6), -- 1: Lundi, 2: Mardi, 3: Mercredi, 4: Jeudi, 5: Vendredi, 6: Samedi
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_time_order CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_timetable_school ON public.timetable_slots(school_id);
CREATE INDEX IF NOT EXISTS idx_timetable_class ON public.timetable_slots(class_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_timetable_teacher ON public.timetable_slots(teacher_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_timetable_year ON public.timetable_slots(academic_year_id);

-- 2. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timetable_slots_isolation_policy" ON public.timetable_slots
  FOR ALL
  TO authenticated
  USING (school_id = public.current_school_id())
  WITH CHECK (school_id = public.current_school_id());
