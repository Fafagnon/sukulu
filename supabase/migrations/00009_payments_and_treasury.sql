-- =============================================================================
-- SUKULU — MIGRATION 00009 : TRÉSORERIE SCOLAIRE, FRAIS & PAIEMENTS
--
-- Phase 6 : Grille tarifaire (fee_structures), paiements (payments),
-- compteur séquentiel de reçus et RLS multi-tenant étanche.
-- =============================================================================

-- 1. TABLE DE LA GRILLE TARIFAIRE (fee_structures)
CREATE TABLE IF NOT EXISTS public.fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE, -- NULL = s'applique à tout l'établissement
  name TEXT NOT NULL, -- e.g. "Scolarité annuelle", "Tranche 1", "Frais d'inscription"
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  due_date DATE,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_structures_school ON public.fee_structures(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_year ON public.fee_structures(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_class ON public.fee_structures(class_id);

-- 2. TABLE DU COMPTEUR DE REÇUS PAR ÉCOLE ET ANNÉE (Garantit une numérotation séquentielle sans collision)
CREATE TABLE IF NOT EXISTS public.payment_receipt_counters (
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  year_prefix TEXT NOT NULL, -- e.g. "2026"
  last_number INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (school_id, year_prefix)
);

-- Fonction atomique de génération du numéro de reçu officiel (REC-YYYY-XXXXX)
CREATE OR REPLACE FUNCTION public.generate_receipt_number(
  p_school_id UUID,
  p_year_prefix TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_val INTEGER;
  v_receipt_number TEXT;
BEGIN
  INSERT INTO public.payment_receipt_counters (school_id, year_prefix, last_number, updated_at)
  VALUES (p_school_id, p_year_prefix, 1, NOW())
  ON CONFLICT (school_id, year_prefix)
  DO UPDATE SET
    last_number = public.payment_receipt_counters.last_number + 1,
    updated_at = NOW()
  RETURNING last_number INTO v_next_val;

  v_receipt_number := 'REC-' || p_year_prefix || '-' || LPAD(v_next_val::TEXT, 5, '0');
  RETURN v_receipt_number;
END;
$$;

-- 3. TABLE DES ENCAISSEMENTS / PAIEMENTS (payments)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE SET NULL,
  fee_structure_id UUID REFERENCES public.fee_structures(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'mobile_money', 'bank_transfer', 'cheque', 'other')),
  reference TEXT, -- Numéro de chèque, transaction T-Money, Moov Money ou virement
  receipt_number TEXT NOT NULL,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uk_payments_school_receipt UNIQUE (school_id, receipt_number)
);

CREATE INDEX IF NOT EXISTS idx_payments_school ON public.payments(school_id);
CREATE INDEX IF NOT EXISTS idx_payments_student ON public.payments(student_id, school_id);
CREATE INDEX IF NOT EXISTS idx_payments_year ON public.payments(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(school_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_receipt ON public.payments(school_id, receipt_number);

-- 4. ACTIVATION DU ROW LEVEL SECURITY (RLS)
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_receipt_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Politiques RLS fee_structures
DROP POLICY IF EXISTS "fee_structures_select_policy" ON public.fee_structures;
CREATE POLICY "fee_structures_select_policy" ON public.fee_structures
  FOR SELECT TO authenticated
  USING (school_id = public.current_school_id());

DROP POLICY IF EXISTS "fee_structures_write_policy" ON public.fee_structures;
CREATE POLICY "fee_structures_write_policy" ON public.fee_structures
  FOR ALL TO authenticated
  USING (
    school_id = public.current_school_id()
    AND public.has_any_role('direction', 'superadmin')
  )
  WITH CHECK (
    school_id = public.current_school_id()
    AND public.has_any_role('direction', 'superadmin')
  );

-- Politiques RLS payment_receipt_counters (service_role ou Direction via fonction generate_receipt_number)
DROP POLICY IF EXISTS "receipt_counters_policy" ON public.payment_receipt_counters;
CREATE POLICY "receipt_counters_policy" ON public.payment_receipt_counters
  FOR ALL TO authenticated
  USING (
    school_id = public.current_school_id()
    AND public.has_any_role('direction', 'superadmin')
  )
  WITH CHECK (
    school_id = public.current_school_id()
    AND public.has_any_role('direction', 'superadmin')
  );

-- Politiques RLS payments
DROP POLICY IF EXISTS "payments_select_policy" ON public.payments;
CREATE POLICY "payments_select_policy" ON public.payments
  FOR SELECT TO authenticated
  USING (
    school_id = public.current_school_id()
    AND (
      public.has_any_role('direction', 'superadmin')
      OR (
        public.has_any_role('parent')
        AND EXISTS (
          SELECT 1 FROM public.student_parents sp
          JOIN public.parent_profiles pp ON pp.id = sp.parent_id
          WHERE sp.student_id = payments.student_id
            AND pp.user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "payments_write_policy" ON public.payments;
CREATE POLICY "payments_write_policy" ON public.payments
  FOR ALL TO authenticated
  USING (
    school_id = public.current_school_id()
    AND public.has_any_role('direction', 'superadmin')
  )
  WITH CHECK (
    school_id = public.current_school_id()
    AND public.has_any_role('direction', 'superadmin')
  );

-- 5. ATTRIBUTION DES PRIVILÈGES POSTGRESQL
GRANT ALL ON public.fee_structures TO authenticated;
GRANT ALL ON public.fee_structures TO service_role;
GRANT SELECT ON public.fee_structures TO anon;

GRANT ALL ON public.payment_receipt_counters TO authenticated;
GRANT ALL ON public.payment_receipt_counters TO service_role;
GRANT SELECT ON public.payment_receipt_counters TO anon;

GRANT ALL ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
GRANT SELECT ON public.payments TO anon;

GRANT EXECUTE ON FUNCTION public.generate_receipt_number(UUID, TEXT) TO authenticated, service_role;
