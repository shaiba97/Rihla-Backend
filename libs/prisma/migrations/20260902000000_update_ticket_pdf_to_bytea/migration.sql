-- Idempotent: convert TicketPDF.pdfData from TEXT (base64) to BYTEA only
-- when the column is still TEXT. If it is already BYTEA (an earlier run of
-- this migration converted it), do nothing. Fixes deploy abort where
-- decode(bytea, 'base64') fails with "function decode(bytea, unknown) does
-- not exist" (P3018) and the failed migration blocks all others (P3009).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'TicketPDF'
      AND column_name = 'pdfData'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE "TicketPDF"
    ALTER COLUMN "pdfData" TYPE BYTEA
    USING (CASE WHEN "pdfData" IS NOT NULL THEN decode("pdfData", 'base64') ELSE NULL END);
  END IF;
END $$;