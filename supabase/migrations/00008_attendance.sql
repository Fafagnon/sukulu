-- =============================================================================
-- SUKULU — MIGRATION 00008 : ASSIDUITÉ SCOLAIRE (APPEL EN CLASSE & PRÉSENCES)
--
-- Phase 5 : Table attendance_records, contraintes de statut, indexes de performance,
-- RLS étanche pour Direction et Enseignants avec support synchronisation offline.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  timetable_slot_id UUID REFERENCES public.timetable_slots(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  arrival_time TIME,
  reason TEXT,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_attendance_student_session UNIQUE NULLS NOT DISTINCT (school_id, student_id, date, timetable_slot_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_school_date ON public.attendance_records(school_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON public.attendance_records(class_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance_records(student_id, school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance_records(school_id, status, date);
CREATE INDEX IF NOT EXISTS idx_attendance_academic_year ON public.attendance_records(academic_year_id);

-- RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Lecture : tous les utilisateurs authentifiés de l'école (direction, enseignant, parent)
DROP POLICY IF EXISTS "attendance_select_policy" ON public.attendance_records;
CREATE POLICY "attendance_select_policy" ON public.attendance_records
  FOR SELECT
  TO authenticated
  USING (school_id = public.current_school_id());

-- Écriture (INSERT/UPDATE) : Direction/Superadmin OU Enseignant
DROP POLICY IF EXISTS "attendance_write_policy" ON public.attendance_records;
CREATE POLICY "attendance_write_policy" ON public.attendance_records
  FOR ALL
  TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (
      public.has_any_role('direction', 'superadmin')
      OR (
        public.has_any_role('enseignant')
        AND (
          recorded_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.timetable_slots ts
            WHERE ts.id = attendance_records.timetable_slot_id
              AND ts.teacher_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.class_subjects cs
            WHERE cs.class_id = attendance_records.class_id
              AND cs.teacher_id = auth.uid()
          )
        )
      )
    )
  )
  WITH CHECK (
    school_id = public.current_school_id()
    AND (
      public.has_any_role('direction', 'superadmin')
      OR (
        public.has_any_role('enseignant')
        AND (
          recorded_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.timetable_slots ts
            WHERE ts.id = attendance_records.timetable_slot_id
              AND ts.teacher_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.class_subjects cs
            WHERE cs.class_id = attendance_records.class_id
              AND cs.teacher_id = auth.uid()
          )
        )
      )
    )
  );

-- Attribution explicite des privilèges
GRANT ALL ON public.attendance_records TO authenticated;
GRANT ALL ON public.attendance_records TO service_role;
GRANT SELECT ON public.attendance_records TO anon;
