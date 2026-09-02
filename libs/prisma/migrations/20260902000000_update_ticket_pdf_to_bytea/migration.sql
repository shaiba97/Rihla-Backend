-- Update TicketPDF.pdfData from TEXT (base64) to BYTEA (raw bytes)
-- Convert existing base64 strings to binary bytes
ALTER TABLE "TicketPDF"
ALTER COLUMN "pdfData" TYPE BYTEA
USING (CASE WHEN "pdfData" IS NOT NULL THEN decode("pdfData", 'base64') ELSE NULL END);