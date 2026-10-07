-- =============================================================================
-- OUTDOO → Flow CRM: website enquiries land in crm_leads
-- Run ONCE in the FLOW Supabase project (sxwumzkdyclhjqnfnxfk) → SQL Editor.
-- Idempotent: safe to re-run.
--
-- outdoo.in has two forms: "Design & Build" (LifeWall turnkey, NCR, ₹10L+) and
-- "Bulk & Trade" (10+ units). Both call this function with the public anon key.
--   * New phone   → new lead, source = website, pipeline = default
--                   (crm_lead_routing auto-assign + notify fire as usual)
--   * Known phone → no duplicate; an "Enquired again" note is added to that lead
--                   (same rule as the duplicate-phone guard of 15-Sep)
--   * Basic abuse guard: max 40 website enquiries per hour, field length caps.
-- The anon key can ONLY call this function — it gets no read/write on crm_leads.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.outdoo_submit_enquiry(
  p_kind    text,   -- 'design_build' | 'bulk'
  p_name    text,
  p_phone   text,
  p_email   text,
  p_city    text,
  p_budget  text,
  p_details text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone  text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10);
  v_name   text := left(btrim(coalesce(p_name, '')), 80);
  v_email  text := left(btrim(coalesce(p_email, '')), 120);
  v_city   text := left(btrim(coalesce(p_city, '')), 60);
  v_budget text := left(btrim(coalesce(p_budget, '')), 60);
  v_det    text := left(btrim(coalesce(p_details, '')), 1000);
  v_label  text;
  v_lead   uuid;
  v_id     uuid;
BEGIN
  IF p_kind NOT IN ('design_build', 'bulk') THEN RAISE EXCEPTION 'Invalid enquiry type'; END IF;
  IF length(v_name) < 2 THEN RAISE EXCEPTION 'Name is required'; END IF;
  IF v_phone !~ '^[6-9][0-9]{9}$' THEN RAISE EXCEPTION 'Valid 10-digit mobile is required'; END IF;

  IF (SELECT count(*) FROM crm_leads
       WHERE source = 'website' AND source_detail LIKE 'outdoo.in%'
         AND created_at > now() - interval '1 hour') >= 40 THEN
    RAISE EXCEPTION 'Too many enquiries right now, please try again later';
  END IF;

  v_label := CASE p_kind WHEN 'design_build' THEN 'outdoo.in · Design & Build' ELSE 'outdoo.in · Bulk & Trade' END;

  SELECT id INTO v_lead FROM crm_leads
   WHERE right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10) = v_phone
   ORDER BY created_at LIMIT 1;

  IF v_lead IS NOT NULL THEN
    INSERT INTO crm_lead_activities (lead_id, activity_type, body, meta)
    VALUES (v_lead, 'note',
            'Enquired again via ' || v_label || ' — ' || v_name
              || coalesce(' · ' || nullif(v_city, ''), '') || coalesce(' · ' || nullif(v_budget, ''), '')
              || coalesce(' · ' || nullif(v_det, ''), ''),
            jsonb_build_object('via', 'outdoo_enquiry', 'kind', p_kind, 'email', v_email));
    RETURN json_build_object('ok', true, 'existing', true);
  END IF;

  INSERT INTO crm_leads (customer_name, phone, email, city, budget_range, source, source_detail, notes, pipeline)
  VALUES (v_name, v_phone, nullif(v_email, ''), nullif(v_city, ''), nullif(v_budget, ''),
          'website', v_label, nullif(v_det, ''), 'default')
  RETURNING id INTO v_id;

  RETURN json_build_object('ok', true, 'existing', false);
END;
$$;

REVOKE ALL ON FUNCTION public.outdoo_submit_enquiry(text, text, text, text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.outdoo_submit_enquiry(text, text, text, text, text, text, text) TO anon, authenticated;

COMMENT ON FUNCTION public.outdoo_submit_enquiry(text, text, text, text, text, text, text) IS
  'outdoo.in Design & Build / Bulk enquiry → crm_leads (source website). Dedupes by phone into an activity note. (7-Oct-2026)';

-- Quick test (then delete the test lead from the CRM):
-- select public.outdoo_submit_enquiry('bulk','Test OUTDOO','9999999999','t@t.in','Delhi','Under ₹5 lakh','test');
