-- =============================================================================
-- SUKULU — MIGRATION 00006 : DURCISSEMENT RLS (P0)
--
-- 1. profiles  : interdit l'auto-promotion de rôle et le vol de tenant
--    (politiques INSERT/UPDATE/DELETE distinctes + trigger de protection).
--    Les politiques ne référencent QUE des fonctions SECURITY DEFINER
--    (current_school_id, has_any_role, school_created_by) pour éviter la
--    récursion infinie des policies Postgres.
-- 2. schools   : lecture limitée à son propre établissement, création
--    restreinte + anti-spam de tenants, code unique par pays.
-- 3. tables métier : lecture réservée aux membres de l'école, écriture
--    réservée à la Direction / Superadmin (+ enseignant sur ses créneaux).
-- 4. timetable : contraintes d'exclusion empêchant les doubles réservations.
-- =============================================================================-

-- ---------------------------------------------------------------------------
-- 0. Helpers (SECURITY DEFINER : appelables depuis des politiques sans récursion)
-- ---------------------------------------------------------------------------
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

-- Vrai si l'utilisateur connecté occupe un des rôles demandés
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

-- Vrai si l'école a été créée par l'utilisateur connecté (anti-spam tenants)
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

-- ---------------------------------------------------------------------------
-- 1. profiles : interdire l'auto-promotion et le changement de tenant
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role (onboarding, import, création d'enseignant) : tout est permis
  IF public.is_service_role() THEN
    RETURN NEW;
  END IF;

  -- INSERT : un utilisateur ne crée que SON propre profil, rôle non-privileged
  IF TG_OP = 'INSERT' THEN
    IF NEW.id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Création de profil refusée : vous ne pouvez créer que votre propre profil.';
    END IF;
    IF NEW.role = 'superadmin' THEN
      RAISE EXCEPTION 'Attribution du rôle superadmin refusée.';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE : ni changement de rôle, ni changement d'établissement
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Changement de rôle non autorisé.';
  END IF;

  IF NEW.school_id IS DISTINCT FROM OLD.school_id THEN
    -- Changement d'un école déjà rattachée : jamais
    IF OLD.school_id IS NOT NULL THEN
      RAISE EXCEPTION 'Changement d''établissement non autorisé.';
    END IF;
    -- Premier rattachement (onboarding) : uniquement vers une école créée par soi-même
    IF NOT public.school_created_by_me(NEW.school_id) THEN
      RAISE EXCEPTION 'Rattachement refusé : cette école n''est pas la vôtre.';
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

-- Recréation des politiques profiles en 4 actions distinctes
DROP POLICY IF EXISTS "profiles_isolation_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR school_id = public.current_school_id()
  );

-- Un utilisateur ne crée que son propre profil (rôle non-privileged)
CREATE POLICY "profiles_insert_policy" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND role IN ('direction', 'enseignant', 'parent')
    AND (
      school_id IS NULL
      OR public.school_created_by_me(school_id)
    )
  );

-- Chacun modifie son propre profil ; la direction/superadmin gère les
-- profils de son école. Le trigger bloque toute modification de
-- role / school_id non autorisée.
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE
  TO authenticated
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

CREATE POLICY "profiles_delete_policy" ON public.profiles
  FOR DELETE
  TO authenticated
  USING (
    school_id = public.current_school_id()
    AND public.has_any_role('direction', 'superadmin')
  );

-- ---------------------------------------------------------------------------
-- 2. schools
-- ---------------------------------------------------------------------------

-- 2a. Code unique par pays (et non plus global) : deux écoles de pays
--     différents peuvent partager un sigle.
ALTER TABLE public.schools DROP CONSTRAINT IF EXISTS schools_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_schools_country_code
  ON public.schools (upper(country), upper(code));

-- 2b. Traçage du créateur (anti-spam tenants) — doit exister avant les
--     politiques et avant le trigger d'onboarding.
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_schools_created_by
  ON public.schools (created_by)
  WHERE created_by IS NOT NULL;

-- Lecture : uniquement son propre établissement
-- (le "IS NULL → toutes les écoles" est supprimé : plus aucune fuite cross-tenant)
DROP POLICY IF EXISTS "schools_select_policy" ON public.schools;
CREATE POLICY "schools_select_policy" ON public.schools
  FOR SELECT
  TO authenticated
  USING (
    id = public.current_school_id()
    OR id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid() AND school_id IS NOT NULL)
  );

-- Création : réservée aux comptes de direction sans établissement déjà rattaché
DROP POLICY IF EXISTS "schools_insert_policy" ON public.schools;
CREATE POLICY "schools_insert_policy" ON public.schools
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_school_id() IS NULL
    AND public.has_any_role('direction', 'superadmin')
    AND (created_by IS NULL OR created_by = auth.uid())
  );

-- Mise à jour : Direction de l'école uniquement
DROP POLICY IF EXISTS "schools_update_policy" ON public.schools;
CREATE POLICY "schools_update_policy" ON public.schools
  FOR UPDATE
  TO authenticated
  USING (
    id = public.current_school_id()
    AND public.has_any_role('direction', 'superadmin')
  )
  WITH CHECK (
    id = public.current_school_id()
    AND public.has_any_role('direction', 'superadmin')
  );

-- Pas de suppression d'établissement par un utilisateur (service role uniquement)
DROP POLICY IF EXISTS "schools_delete_policy" ON public.schools;
CREATE POLICY "schools_delete_policy" ON public.schools
  FOR DELETE
  TO authenticated
  USING (false);

-- ---------------------------------------------------------------------------
-- 3. Tables métier : SELECT = membres de l'école ; écriture = Direction/Superadmin
-- ---------------------------------------------------------------------------

-- 3a. Tables gérées exclusivement par la Direction
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'academic_years', 'periods', 'classes', 'subjects', 'class_subjects',
    'students', 'parent_profiles', 'student_parents', 'teacher_profiles',
    'enrollments'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_isolation_policy', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_select_policy', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_write_policy', tbl);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
         USING (school_id = public.current_school_id())',
      tbl || '_select_policy', tbl
    );
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

-- 3b. audit_logs : lecture Direction/Superadmin, écriture service role uniquement
--     (les politiques existantes sont remplacées)
DROP POLICY IF EXISTS "audit_logs_read_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_write_policy" ON public.audit_logs;

CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    school_id = public.current_school_id()
    AND public.has_any_role('direction', 'superadmin')
  );

-- Aucun INSERT/UPDATE/DELETE côté client : écriture serveur (service role) uniquement
CREATE POLICY "audit_logs_write_policy" ON public.audit_logs
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- 3c. timetable_slots : Direction + enseignant (ses propres créneaux)
DROP POLICY IF EXISTS "timetable_slots_isolation_policy" ON public.timetable_slots;
DROP POLICY IF EXISTS "timetable_slots_select_policy" ON public.timetable_slots;
DROP POLICY IF EXISTS "timetable_slots_write_policy" ON public.timetable_slots;

CREATE POLICY "timetable_slots_select_policy" ON public.timetable_slots
  FOR SELECT
  TO authenticated
  USING (school_id = public.current_school_id());

CREATE POLICY "timetable_slots_write_policy" ON public.timetable_slots
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

-- ---------------------------------------------------------------------------
-- 4. Contraintes d'exclusion : anti double-réservation d'emploi du temps
--    (btree_gist fournit l'opérateur && sur les plages numériques)
--    Placées en fin de fichier : si des données historiques se chevauchent,
--    l'erreur n'empêche pas l'application des politiques ci-dessus.
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'excl_timetable_no_class_overlap'
  ) THEN
    ALTER TABLE public.timetable_slots
      ADD CONSTRAINT excl_timetable_no_class_overlap
      EXCLUDE USING gist (
        school_id WITH =,
        class_id WITH =,
        day_of_week WITH =,
        numrange(
          extract(epoch FROM start_time),
          extract(epoch FROM end_time),
          '[)'
        ) WITH &&
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'excl_timetable_no_teacher_overlap'
  ) THEN
    ALTER TABLE public.timetable_slots
      ADD CONSTRAINT excl_timetable_no_teacher_overlap
      EXCLUDE USING gist (
        school_id WITH =,
        teacher_id WITH =,
        day_of_week WITH =,
        numrange(
          extract(epoch FROM start_time),
          extract(epoch FROM end_time),
          '[)'
        ) WITH &&
      )
      WHERE (teacher_id IS NOT NULL);
  END IF;
END $$;
