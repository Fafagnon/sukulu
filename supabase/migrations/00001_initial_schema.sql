-- ==============================================================================
-- SUKULU — Migration 00001 : Schéma initial & Isolation Multi-Tenant
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ÉNUMÉRATIONS
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

-- 3. TABLE DES ÉTABLISSEMENTS (TENANT RACINE)
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_name TEXT,
  code TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  address TEXT,
  city TEXT,
  country TEXT NOT NULL DEFAULT 'Togo',
  phone TEXT,
  email TEXT,
  currency TEXT NOT NULL DEFAULT 'XOF',
  academic_settings JSONB DEFAULT '{"grading_scale": 20, "period_type": "trimestre"}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 4. TABLE DES PROFILS UTILISATEURS (Liée à auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'enseignant',
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

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_profiles_school ON public.profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 5. ANNÉES SCOLAIRES
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

-- 6. PÉRIODES SCOLAIRES (Trimestres / Semestres)
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

-- 7. CLASSES
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

-- 8. JOURNAL D'AUDIT (Audit Trail)
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

-- ==============================================================================
-- FONCTIONS UTILITAIRES DE CONTEXTE RLS
-- ==============================================================================

-- Récupérer l'identifiant de l'école de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.current_school_id()
RETURNS UUID AS $$
BEGIN
  -- 1. Essai direct via les métadonnées de session JWT (ultra-rapide)
  IF (auth.jwt() -> 'app_metadata' ->> 'school_id') IS NOT NULL THEN
    RETURN (auth.jwt() -> 'app_metadata' ->> 'school_id')::UUID;
  END IF;

  -- 2. Secours via la table profiles
  RETURN (
    SELECT school_id FROM public.profiles
    WHERE id = auth.uid() AND is_active = true AND deleted_at IS NULL
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Récupérer le rôle de l'utilisateur connecté
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ==============================================================================
-- ACTIVATION DU ROW LEVEL SECURITY (RLS) & POLITIQUES STRICTES
-- ==============================================================================

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Politiques pour 'schools' : L'utilisateur ne voit que son propre établissement
CREATE POLICY "schools_isolation_policy" ON public.schools
  FOR ALL
  TO authenticated
  USING (id = public.current_school_id())
  WITH CHECK (id = public.current_school_id());

-- Politiques pour 'profiles' : Membres du même établissement uniquement
CREATE POLICY "profiles_isolation_policy" ON public.profiles
  FOR ALL
  TO authenticated
  USING (school_id = public.current_school_id())
  WITH CHECK (school_id = public.current_school_id());

-- Politiques pour 'academic_years'
CREATE POLICY "academic_years_isolation_policy" ON public.academic_years
  FOR ALL
  TO authenticated
  USING (school_id = public.current_school_id())
  WITH CHECK (school_id = public.current_school_id());

-- Politiques pour 'periods'
CREATE POLICY "periods_isolation_policy" ON public.periods
  FOR ALL
  TO authenticated
  USING (school_id = public.current_school_id())
  WITH CHECK (school_id = public.current_school_id());

-- Politiques pour 'classes'
CREATE POLICY "classes_isolation_policy" ON public.classes
  FOR ALL
  TO authenticated
  USING (school_id = public.current_school_id())
  WITH CHECK (school_id = public.current_school_id());

-- Politiques pour 'audit_logs' : Lecture par la Direction uniquement, pas de modification manuelle
CREATE POLICY "audit_logs_read_policy" ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.current_school_id()
    AND public.current_user_role() IN ('superadmin', 'direction')
  );

CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (school_id = public.current_school_id());
