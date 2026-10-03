-- ==============================================================================
-- SUKULU — SCHÉMA POSTGRESQL CONSOLIDÉ (PRODUCTION & DÉVELOPPEMENT)
-- Version : 1.0 (Consolidation des migrations 00001 à 00007)
-- ==============================================================================
-- Architecture multi-tenant étanche avec Row Level Security (RLS).
-- Moteur anti-conflit d'emploi du temps, gestion scolaire SIS, évaluations et notes.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS POSTGRESQL OBLIGATOIRES
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- Requis pour les contraintes d'exclusion temporelles

-- ------------------------------------------------------------------------------
-- 2. ÉNUMÉRATIONS (TYPES PERSONNALISÉS)
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('superadmin', 'direction', 'enseignant', 'parent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE period_type AS ENUM ('trimestre', 'semestre');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE period_status AS ENUM ('open', 'review', 'locked');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 3. TABLES DU MODÈLE RELATIONNEL
-- ------------------------------------------------------------------------------

-- 3.1. Établissements (Tenant Racine)
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_name TEXT,
  code TEXT NOT NULL,
  logo_url TEXT,
  address TEXT,
  city TEXT,
  country TEXT NOT NULL DEFAULT 'Togo',
  phone TEXT,
  email TEXT,
  currency TEXT NOT NULL DEFAULT 'XOF',
  academic_settings JSONB DEFAULT '{"grading_scale": 20, "period_type": "trimestre"}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Unicité du code d'établissement par pays (permet le même code court dans deux pays distincts)
CREATE UNIQUE INDEX IF NOT EXISTS uq_schools_country_code
  ON public.schools (upper(country), upper(code));

-- Anti-spam : un compte utilisateur ne peut créer qu'un seul établissement racine
CREATE UNIQUE INDEX IF NOT EXISTS uq_schools_created_by
  ON public.schools (created_by)
  WHERE created_by IS NOT NULL;

-- 3.2. Profils Utilisateurs (Liés à auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'direction',
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_profiles_school ON public.profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 3.3. Années Scolaires
CREATE TABLE IF NOT EXISTS public.academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g. "2026-2027"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_academic_years_school ON public.academic_years(school_id);

-- Contrainte critique : Une seule année scolaire active par établissement
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_year_per_school
  ON public.academic_years (school_id)
  WHERE is_active = true;

-- 3.4. Périodes Scolaires (Trimestres / Semestres)
CREATE TABLE IF NOT EXISTS public.periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type period_type NOT NULL DEFAULT 'trimestre',
  order_index INTEGER NOT NULL,
  status period_status NOT NULL DEFAULT 'open',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_periods_school_year ON public.periods(school_id, academic_year_id);

-- 3.5. Classes
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cycle TEXT NOT NULL,
  level TEXT NOT NULL,
  series TEXT,
  capacity INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classes_school_year ON public.classes(school_id, academic_year_id);

-- 3.6. Matières (Catalogue de l'établissement)
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_subject_code_per_school UNIQUE (school_id, code)
);

CREATE INDEX IF NOT EXISTS idx_subjects_school ON public.subjects(school_id);

-- 3.7. Affectation Matière x Classe x Enseignant x Coefficient (class_subjects)
CREATE TABLE IF NOT EXISTS public.class_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  coefficient NUMERIC(4, 2) NOT NULL DEFAULT 1.0 CHECK (coefficient > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_class_subject UNIQUE (class_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_class_subjects_class ON public.class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_school ON public.class_subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_teacher ON public.class_subjects(teacher_id);

-- 3.8. Emplois du Temps (timetable_slots avec contraintes anti-conflits btree_gist)
CREATE TABLE IF NOT EXISTS public.timetable_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 6), -- 1: Lundi ... 6: Samedi
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

-- Contraintes d'exclusion au niveau moteur : zéro chevauchement de créneau pour une même classe ou un même prof
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'excl_timetable_no_class_overlap') THEN
    ALTER TABLE public.timetable_slots
      ADD CONSTRAINT excl_timetable_no_class_overlap
      EXCLUDE USING gist (
        school_id WITH =,
        class_id WITH =,
        day_of_week WITH =,
        numrange(extract(epoch FROM start_time), extract(epoch FROM end_time), '[)') WITH &&
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'excl_timetable_no_teacher_overlap') THEN
    ALTER TABLE public.timetable_slots
      ADD CONSTRAINT excl_timetable_no_teacher_overlap
      EXCLUDE USING gist (
        school_id WITH =,
        teacher_id WITH =,
        day_of_week WITH =,
        numrange(extract(epoch FROM start_time), extract(epoch FROM end_time), '[)') WITH &&
      )
      WHERE (teacher_id IS NOT NULL);
  END IF;
END $$;

-- 3.9. Élèves (students)
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  matricule TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('M', 'F')),
  birth_date DATE NOT NULL,
  birth_place TEXT,
  nationality TEXT DEFAULT 'Togolaise',
  address TEXT,
  city TEXT,
  photo_url TEXT,
  blood_group TEXT CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  medical_notes TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'graduated', 'transferred')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT uk_students_school_matricule UNIQUE (school_id, matricule)
);

CREATE INDEX IF NOT EXISTS idx_students_school ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_matricule ON public.students(school_id, matricule);
CREATE INDEX IF NOT EXISTS idx_students_name ON public.students(school_id, last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(school_id, status);

-- 3.10. Profils Parents / Tuteurs (parent_profiles)
CREATE TABLE IF NOT EXISTS public.parent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_secondary TEXT,
  email TEXT,
  profession TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parents_school ON public.parent_profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_parents_phone ON public.parent_profiles(school_id, phone);

-- 3.11. Liaison Élèves - Parents (student_parents)
CREATE TABLE IF NOT EXISTS public.student_parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.parent_profiles(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL, -- Père, Mère, Tuteur légal, etc.
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  can_pickup BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uk_student_parent UNIQUE (student_id, parent_id)
);

CREATE INDEX IF NOT EXISTS idx_student_parents_student ON public.student_parents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_parents_parent ON public.student_parents(parent_id);

-- 3.12. Profils Enseignants (teacher_profiles)
CREATE TABLE IF NOT EXISTS public.teacher_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  matricule TEXT,
  specialty TEXT,
  qualification TEXT,
  phone TEXT,
  address TEXT,
  hire_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uk_teacher_school_matricule UNIQUE (school_id, matricule)
);

CREATE INDEX IF NOT EXISTS idx_teachers_school ON public.teacher_profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user ON public.teacher_profiles(user_id);

-- 3.13. Inscriptions Annuelles (enrollments)
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'completed', 'dropped', 'transferred', 'repeating')),
  is_repeater BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uk_enrollment_year_student UNIQUE (school_id, academic_year_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_school ON public.enrollments(school_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_year_class ON public.enrollments(academic_year_id, class_id);

-- 3.14. Évaluations Pédagogiques (assessments)
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

-- 3.15. Notes (grades)
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

-- 3.16. Journal d'Audit (audit_logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  reason TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_school ON public.audit_logs(school_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 4. FONCTIONS DE CONTEXTE ET DE SÉCURITÉ (SECURITY DEFINER)
-- ------------------------------------------------------------------------------

-- 4.1. Vrai si la requête provient du rôle service_role (côté serveur privilégié)
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims text := current_setting('request.jwt.claims', true);
BEGIN
  IF claims IS NULL OR claims = '' THEN
    RETURN false;
  END IF;
  RETURN COALESCE((claims::jsonb ->> 'role') = 'service_role', false);
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

-- 4.2. Identifiant de l'établissement de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.current_school_id()
RETURNS UUID AS $$
BEGIN
  -- Fast-path via JWT
  IF (auth.jwt() -> 'app_metadata' ->> 'school_id') IS NOT NULL THEN
    RETURN (auth.jwt() -> 'app_metadata' ->> 'school_id')::UUID;
  END IF;

  -- Résolution via profiles
  RETURN (
    SELECT school_id FROM public.profiles
    WHERE id = auth.uid() AND is_active = true AND deleted_at IS NULL
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 4.3. Rôle de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') IS NOT NULL THEN
    RETURN (auth.jwt() -> 'app_metadata' ->> 'role')::user_role;
  END IF;

  RETURN (
    SELECT role FROM public.profiles
    WHERE id = auth.uid() AND is_active = true AND deleted_at IS NULL
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 4.4. Vrai si l'utilisateur occupe au moins l'un des rôles demandés
CREATE OR REPLACE FUNCTION public.has_any_role(VARIADIC roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_service_role()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND is_active = true
        AND deleted_at IS NULL
        AND role::text = ANY(roles)
    );
$$;

-- 4.5. Vrai si l'école a été créée par l'utilisateur connecté (sécurisation onboarding)
CREATE OR REPLACE FUNCTION public.school_created_by_me(school uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.schools
    WHERE id = school AND created_by = auth.uid()
  );
$$;

-- 4.6. Trigger de protection contre l'auto-promotion et le vol de tenant
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role : autorisé sans restriction
  IF public.is_service_role() THEN
    RETURN NEW;
  END IF;

  -- INSERT : un utilisateur ne crée que SON profil, rôle non superadmin
  IF TG_OP = 'INSERT' THEN
    IF NEW.id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Création de profil refusée : vous ne pouvez créer que votre propre profil.';
    END IF;
    IF NEW.role = 'superadmin' THEN
      RAISE EXCEPTION 'Attribution du rôle superadmin refusée.';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE : interdiction formelle de changer son propre rôle
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Changement de rôle non autorisé.';
  END IF;

  -- UPDATE : interdiction de basculer vers un autre établissement existant
  IF NEW.school_id IS DISTINCT FROM OLD.school_id THEN
    IF OLD.school_id IS NOT NULL THEN
      RAISE EXCEPTION 'Changement d''établissement non autorisé.';
    END IF;
    -- Seul le premier rattachement pendant l'onboarding vers son école créée est permis
    IF NOT public.school_created_by_me(NEW.school_id) THEN
      RAISE EXCEPTION 'Rattachement refusé : cet établissement ne vous appartient pas.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_privileges ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileges
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileges();

-- ------------------------------------------------------------------------------
-- 5. ACTIVATION DU ROW LEVEL SECURITY (RLS) SUR TOUTES LES TABLES
-- ------------------------------------------------------------------------------
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 6. POLITIQUES RLS RIGOUREUSES (SÉCURITÉ ÉTANCHE SANS RÉCURSION)
-- ------------------------------------------------------------------------------

-- 6.1. Table 'schools'
DROP POLICY IF EXISTS "schools_select_policy" ON public.schools;
CREATE POLICY "schools_select_policy" ON public.schools
  FOR SELECT TO authenticated
  USING (
    id = public.current_school_id()
    OR id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid() AND school_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "schools_insert_policy" ON public.schools;
CREATE POLICY "schools_insert_policy" ON public.schools
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_school_id() IS NULL
    AND public.has_any_role('direction', 'superadmin')
    AND (created_by IS NULL OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS "schools_update_policy" ON public.schools;
CREATE POLICY "schools_update_policy" ON public.schools
  FOR UPDATE TO authenticated
  USING (
    id = public.current_school_id()
    AND public.has_any_role('direction', 'superadmin')
  )
  WITH CHECK (
    id = public.current_school_id()
    AND public.has_any_role('direction', 'superadmin')
  );

DROP POLICY IF EXISTS "schools_delete_policy" ON public.schools;
CREATE POLICY "schools_delete_policy" ON public.schools
  FOR DELETE TO authenticated
  USING (false); -- Suppression d'école uniquement via service_role ou console

-- 6.2. Table 'profiles'
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR school_id = public.current_school_id()
  );

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND role IN ('direction', 'enseignant', 'parent')
    AND (
      school_id IS NULL
      OR public.school_created_by_me(school_id)
    )
  );

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR (
      school_id = public.current_school_id()
      AND public.has_any_role('direction', 'superadmin')
    )
  )
  WITH CHECK (
    id = auth.uid()
    OR (
      school_id = public.current_school_id()
      AND public.has_any_role('direction', 'superadmin')
    )
  );

DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy" ON public.profiles
  FOR DELETE TO authenticated
  USING (
    school_id = public.current_school_id()
    AND public.has_any_role('direction', 'superadmin')
  );

-- 6.3. Tables Métier Administratives (Direction / Superadmin)
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'academic_years', 'periods', 'classes', 'subjects', 'class_subjects',
    'students', 'parent_profiles', 'student_parents', 'teacher_profiles',
    'enrollments'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_select_policy', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_write_policy', tbl);

    -- SELECT : Tout membre rattaché à l'établissement
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
         USING (school_id = public.current_school_id())',
      tbl || '_select_policy', tbl
    );

    -- ALL (INSERT / UPDATE / DELETE) : Direction et Superadmin uniquement
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated
         USING (school_id = public.current_school_id()
                AND public.has_any_role(''direction'', ''superadmin''))
         WITH CHECK (school_id = public.current_school_id()
                AND public.has_any_role(''direction'', ''superadmin''))',
      tbl || '_write_policy', tbl
    );
  END LOOP;
END $$;

-- 6.4. Table 'timetable_slots' (Direction + Enseignant sur ses créneaux)
DROP POLICY IF EXISTS "timetable_slots_select_policy" ON public.timetable_slots;
CREATE POLICY "timetable_slots_select_policy" ON public.timetable_slots
  FOR SELECT TO authenticated
  USING (school_id = public.current_school_id());

DROP POLICY IF EXISTS "timetable_slots_write_policy" ON public.timetable_slots;
CREATE POLICY "timetable_slots_write_policy" ON public.timetable_slots
  FOR ALL TO authenticated
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

-- 6.5. Table 'assessments' (Direction + Enseignant affecté)
DROP POLICY IF EXISTS "assessments_select_policy" ON public.assessments;
CREATE POLICY "assessments_select_policy" ON public.assessments
  FOR SELECT TO authenticated
  USING (school_id = public.current_school_id());

DROP POLICY IF EXISTS "assessments_write_policy" ON public.assessments;
CREATE POLICY "assessments_write_policy" ON public.assessments
  FOR ALL TO authenticated
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

-- 6.6. Table 'grades' (Direction + Enseignant de l'évaluation parente)
DROP POLICY IF EXISTS "grades_select_policy" ON public.grades;
CREATE POLICY "grades_select_policy" ON public.grades
  FOR SELECT TO authenticated
  USING (school_id = public.current_school_id());

DROP POLICY IF EXISTS "grades_write_policy" ON public.grades;
CREATE POLICY "grades_write_policy" ON public.grades
  FOR ALL TO authenticated
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

-- 6.7. Table 'audit_logs' (Lecture Direction, écriture service_role uniquement)
DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    school_id = public.current_school_id()
    AND public.has_any_role('direction', 'superadmin')
  );

DROP POLICY IF EXISTS "audit_logs_write_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_write_policy" ON public.audit_logs
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

-- ------------------------------------------------------------------------------
-- 7. ATTRIBUTION DES DROITS POSTGRESQL AUX RÔLES SUPABASE
-- ------------------------------------------------------------------------------
-- Indispensable : donne les droits de manipulation de base à PostgREST,
-- la sécurité et le filtrage multi-tenant étant ensuite assurés par les RLS ci-dessus.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

