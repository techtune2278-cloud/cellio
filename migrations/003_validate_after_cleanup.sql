-- Optional validation only after 000_preflight returns no inconsistent rows.
-- Stops on an inconsistency and changes no existing data.
BEGIN;
ALTER TABLE public.items VALIDATE CONSTRAINT cellio_items_quantity_check;
ALTER TABLE public.items VALIDATE CONSTRAINT cellio_items_owner_check;
ALTER TABLE public.items VALIDATE CONSTRAINT cellio_items_location_owner;
ALTER TABLE public.storage_routing_rules VALIDATE CONSTRAINT cellio_routing_location_owner;
ALTER TABLE public.alert_rules VALIDATE CONSTRAINT cellio_alert_positive_days;
COMMIT;
