ALTER TABLE "report_cards"
  RENAME COLUMN "zoho_upload_status" TO "pdf_status";

ALTER TYPE "ZohoUploadStatus" RENAME TO "ReportCardPdfStatus";

ALTER TYPE "ReportCardPdfStatus" RENAME VALUE 'UPLOADED' TO 'GENERATED';

ALTER TABLE "users" DROP COLUMN IF EXISTS "zoho_id";
ALTER TABLE "students" DROP COLUMN IF EXISTS "zoho_id";
ALTER TABLE "teachers" DROP COLUMN IF EXISTS "zoho_id";

DROP TABLE IF EXISTS "zoho_sync_logs";
DROP TYPE IF EXISTS "ZohoSyncStatus";

ALTER INDEX IF EXISTS "report_cards_zoho_upload_status_idx" RENAME TO "report_cards_pdf_status_idx";
