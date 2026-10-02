-- ==============================================================================
-- SUKULU — MIGRATION 00005 : CORRECTIF RLS ONBOARDING (CRÉATION D'ÉCOLE)
-- ==============================================================================

-- 1. Mise à jour de la politique SELECT sur 'schools'
-- Autorise la lecture si l'utilisateur est rattaché à l'école OU s'il est en cours d'onboarding (pas encore de school_id)
DROP POLICY IF EXISTS "schools_select_policy" ON public.schools;
CREATE POLICY "schools_select_policy" ON public.schools
  FOR SELECT
  TO authenticated
  USING (
    id = public.current_school_id()
    OR public.current_school_id() IS NULL
    OR id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
  );

-- 2. Vérification / Recréation de la politique INSERT sur 'schools'
DROP POLICY IF EXISTS "schools_insert_policy" ON public.schools;
CREATE POLICY "schools_insert_policy" ON public.schools
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. Mise à jour de la politique UPDATE sur 'schools'
DROP POLICY IF EXISTS "schools_update_policy" ON public.schools;
CREATE POLICY "schools_update_policy" ON public.schools
  FOR UPDATE
  TO authenticated
  USING (
    id = public.current_school_id()
    OR id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    id = public.current_school_id()
    OR id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid())
  );

-- 4. Mise à jour de la politique 'profiles' pour garantir la mise à jour du profil lors de l'onboarding
DROP POLICY IF EXISTS "profiles_isolation_policy" ON public.profiles;
CREATE POLICY "profiles_isolation_policy" ON public.profiles
  FOR ALL
  TO authenticated
  USING (
    id = auth.uid()
    OR school_id = public.current_school_id()
  )
  WITH CHECK (
    id = auth.uid()
    OR school_id = public.current_school_id()
  );
