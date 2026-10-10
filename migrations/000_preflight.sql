-- Read only. Investigate returned rows before migration / constraint validation.
SELECT i.id,i.produit,i.user_id,i.cellar_id,i.qte,f.user_id AS equipment_owner
FROM public.items i LEFT JOIN public.cellars f ON f.id=i.cellar_id
WHERE i.user_id IS NULL OR i.cellar_id IS NULL OR f.id IS NULL OR i.user_id IS DISTINCT FROM f.user_id OR i.qte IS NULL OR NOT(i.qte>=0 AND i.qte<'Infinity'::numeric);
SELECT r.id,r.cellar_id,r.user_id,f.user_id AS equipment_owner
FROM public.storage_routing_rules r LEFT JOIN public.cellars f ON f.id=r.cellar_id
WHERE r.cellar_id IS NOT NULL AND (f.id IS NULL OR r.user_id IS DISTINCT FROM f.user_id);
SELECT * FROM public.alert_rules WHERE fridge_days<=0 OR freezer_days<=0;
