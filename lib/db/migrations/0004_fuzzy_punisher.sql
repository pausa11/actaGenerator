DROP INDEX "actas_user_id_created_at_idx";--> statement-breakpoint
CREATE INDEX "actas_user_id_created_at_idx" ON "actas" USING btree ("user_id","created_at");