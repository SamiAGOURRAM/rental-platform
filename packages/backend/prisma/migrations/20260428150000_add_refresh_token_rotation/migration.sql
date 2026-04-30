-- AlterTable
ALTER TABLE "refresh_tokens"
ADD COLUMN "rotated_to_id" TEXT;

-- AddForeignKey
ALTER TABLE "refresh_tokens"
ADD CONSTRAINT "refresh_tokens_rotated_to_id_fkey"
FOREIGN KEY ("rotated_to_id") REFERENCES "refresh_tokens"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "refresh_tokens_rotated_to_id_idx" ON "refresh_tokens"("rotated_to_id");
