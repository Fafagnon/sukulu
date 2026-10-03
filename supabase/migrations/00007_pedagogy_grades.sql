-- =============================================================================
-- SUKULU — MIGRATION 00007 : PÉDAGOGIE (ÉVALUATIONS & NOTES)
--
-- Phase 4 : créations d'évaluations, grille de saisie des notes,
-- moteur de moyennes / rangs calculé côté serveur.
--
-- Règles métier (cf. cahier des charges) :
--   MID (contrôle continu) = moyenne des notes CC
--   Moyenne matière        = (MID + Composition) / 2, ou MID si pas de composition
--   Points matière         = Moyenne × Coefficient
--   Moyenne générale       = Σ Points / Σ Coefficients
--   Rangs                  = RANK() (1er, 2e, 2e, 4e en cas d'ex æquo)
-- =============================================================================

-- 1. ÉVALUATIONS ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'cc' CHECK (type IN ('cc', 'composition')),
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  max_score NUMERIC(5, 2) NOT NULL DEFAULT 20 CHECK (max_score > 0),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessments_school ON public.assessments(school_id);
CREATE INDEX IF NOT EXISTS idx_assessments_class_subject
  ON public.assessments(class_id, subject_id, period_id);
CREATE INDEX IF NOT EXISTS idx_assessments_teacher ON public.assessments(teacher_id);

-- 2. NOTES ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  score NUMERIC(5, 2) NOT NULL CHECK (score >= 0),
  comment TEXT,
  entered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_grade_assessment_student UNIQUE (assessment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_grades_assessment ON public.grades(assessment_id);
CREATE INDEX IF NOT EXISTS idx_grades_student ON public.grades(student_id, school_id);

-- 3. RLS -----------------------------------------------------------------------
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- Lecture : tout membre de l'école (portail parent = lecture seule via filtres)
CREATE POLICY "assessments_select_policy" ON public.assessments
  FOR SELECT
  TO authenticated
  USING (school_id = public.current_school_id());

-- Écriture : Direction/Superadmin + enseignant assigné
CREATE POLICY "assessments_write_policy" ON public.assessments
  FOR ALL
  TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (
      public.has_any_role('direction', 'superadmin')
      OR (
        public.has_any_role('enseignant')
        AND teacher_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    school_id = public.current_school_id()
    AND (
      public.has_any_role('direction', 'superadmin')
      OR (
        public.has_any_role('enseignant')
        AND teacher_id = auth.uid()
      )
    )
  );

CREATE POLICY "grades_select_policy" ON public.grades
  FOR SELECT
  TO authenticated
  USING (school_id = public.current_school_id());

-- Écriture : Direction/Superadmin, ou enseignant assigné à l'évaluation parente
CREATE POLICY "grades_write_policy" ON public.grades
  FOR ALL
  TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (
      public.has_any_role('direction', 'superadmin')
      OR (
        public.has_any_role('enseignant')
        AND EXISTS (
          SELECT 1 FROM public.assessments a
          WHERE a.id = assessment_id AND a.teacher_id = auth.uid()
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
        AND EXISTS (
          SELECT 1 FROM public.assessments a
          WHERE a.id = assessment_id AND a.teacher_id = auth.uid()
        )
      )
    )
  );

-- 4. Vues agrégées utiles au moteur (lecture seule, pas de RLS propre :
--    les vues s'exécutent avec les droits de l'appelant et repassent par
--    les tables sous-jacentes qui appliquent bien la RLS).
