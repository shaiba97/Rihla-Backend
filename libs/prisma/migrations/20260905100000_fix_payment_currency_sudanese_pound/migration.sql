-- Backfill: the stored currency must be the Arabic store label, never the ISO
-- code 'SDG'. New writes already store the label (DB default + service code).
UPDATE "Payment" SET "currency" = 'جنيه سوداني' WHERE "currency" = 'SDG';

-- Best-effort recovery of lossily stored paymentMethod values: a value that is
-- entirely '?' (one lost character per Arabic letter) is restorable when
-- exactly one active gateway name has the same length. Deterministic via the
-- earliest-created matching gateway.
UPDATE "Payment" p
SET "paymentMethod" = g."gatewayName"
FROM "PaymentAccount" g
WHERE p."paymentMethod" ~ '^[?]{1,}$'
  AND g."isActive" = TRUE
  AND g."id" = (
    SELECT g2."id"
    FROM "PaymentAccount" g2
    WHERE g2."isActive" = TRUE
      AND length(g2."gatewayName") = length(p."paymentMethod")
    ORDER BY g2."createdAt" ASC
    LIMIT 1
  );