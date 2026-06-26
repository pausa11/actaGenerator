CREATE INDEX "groups_user_id_idx" ON "groups" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "actas_user_id_idx" ON "actas" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "actas_group_id_idx" ON "actas" USING btree ("group_id");