-- AlterTable
-- The "voided" no-pick outcome was replaced: submitting a no-pick slip now
-- softens the existing no-pick fine (£10/-1 -> £5/0) via the standard
-- breach rules instead of a separate fully-exempt outcome, so this column
-- is no longer needed.
ALTER TABLE "Result" DROP COLUMN "voided";
