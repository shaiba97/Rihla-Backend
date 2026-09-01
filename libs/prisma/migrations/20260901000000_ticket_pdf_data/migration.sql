-- Persist ticket PDF bytes (base64) in the DB so downloads survive
-- Render's ephemeral filesystem (upload/ is wiped on every restart).
-- Use IF NOT EXISTS: on Render free tier two booting instances race, and
-- fix_production_db.js already creates this column idempotently, so a plain
-- ADD COLUMN would error (P3009) and abort the whole deploy.
ALTER TABLE "TicketPDF" ADD COLUMN IF NOT EXISTS "pdfData" TEXT;