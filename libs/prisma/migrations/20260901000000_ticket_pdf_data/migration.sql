-- Persist ticket PDF bytes (base64) in the DB so downloads survive
-- Render's ephemeral filesystem (upload/ is wiped on every restart).
ALTER TABLE "TicketPDF" ADD COLUMN "pdfData" TEXT;