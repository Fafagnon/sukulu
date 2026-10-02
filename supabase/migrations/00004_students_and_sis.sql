-- ==============================================================================
-- SUKULU — MIGRATION 00004 : COMMUNAUTÉ SCOLAIRE & SIS (ÉLÈVES, INSCRIPTIONS, PARENTS, ENSEIGNANTS)
-- ==============================================================================

-- 1. TABLE DES ÉLÈVES (students)
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

-- 2. TABLE DES PROFILS PARENTS / RESPONSABLES LÉGAUX (parent_profiles)
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

-- 3. TABLE DE LIAISON ÉLÈVES - PARENTS (student_parents)
CREATE TABLE IF NOT EXISTS public.student_parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.parent_profiles(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL, -- Père, Mère, Tuteur légal, Oncle, Tante, Grand-parent, Autre
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  can_pickup BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uk_student_parent UNIQUE (student_id, parent_id)
);

CREATE INDEX IF NOT EXISTS idx_student_parents_student ON public.student_parents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_parents_parent ON public.student_parents(parent_id);

-- 4. TABLE DES PROFILS ENSEIGNANTS (teacher_profiles)
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

-- 5. TABLE DES INSCRIPTIONS ANNUELLES (enrollments)
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

-- 6. POLITIQUES DE SÉCURITÉ ROW LEVEL SECURITY (RLS)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_isolation_policy" ON public.students
  FOR ALL TO authenticated
  USING (school_id = public.current_school_id())
  WITH CHECK (school_id = public.current_school_id());

CREATE POLICY "parent_profiles_isolation_policy" ON public.parent_profiles
  FOR ALL TO authenticated
  USING (school_id = public.current_school_id())
  WITH CHECK (school_id = public.current_school_id());

CREATE POLICY "student_parents_isolation_policy" ON public.student_parents
  FOR ALL TO authenticated
  USING (school_id = public.current_school_id())
  WITH CHECK (school_id = public.current_school_id());

CREATE POLICY "teacher_profiles_isolation_policy" ON public.teacher_profiles
  FOR ALL TO authenticated
  USING (school_id = public.current_school_id())
  WITH CHECK (school_id = public.current_school_id());

CREATE POLICY "enrollments_isolation_policy" ON public.enrollments
  FOR ALL TO authenticated
  USING (school_id = public.current_school_id())
  WITH CHECK (school_id = public.current_school_id());
