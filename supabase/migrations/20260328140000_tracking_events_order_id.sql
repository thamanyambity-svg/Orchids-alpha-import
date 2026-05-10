-- Lier les événements de suivi à la commande (RLS existante sur order_id) + requêtes unifiées demande/commande.

ALTER TABLE public.tracking_events
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tracking_events_order_id ON public.tracking_events (order_id);

-- Réappliquer la politique : inclure order_id une fois la colonne présente (migration RLS initiale peut être partie request_id seul).
DROP POLICY IF EXISTS "tracking_events_via_order" ON public.tracking_events;
CREATE POLICY "tracking_events_via_order" ON public.tracking_events FOR ALL USING (
  request_id IN (
    SELECT id FROM public.import_requests
    WHERE buyer_id = auth.uid()
      OR assigned_partner_id IN (SELECT id FROM public.partner_profiles WHERE user_id = auth.uid())
  )
  OR order_id IN (
    SELECT o.id FROM public.orders o
    JOIN public.import_requests ir ON o.request_id = ir.id
    WHERE ir.buyer_id = auth.uid()
      OR ir.assigned_partner_id IN (SELECT id FROM public.partner_profiles WHERE user_id = auth.uid())
  )
);
