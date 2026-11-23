-- Calendar dates have no time of day: store them as DATE. Existing timestamps keep their calendar day.
ALTER TABLE "transactions" ALTER COLUMN "date" SET DATA TYPE date USING "date"::date;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "categories_user_id_idx" ON "categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_account_id_date_idx" ON "transactions" USING btree ("account-id","date");--> statement-breakpoint
CREATE INDEX "transactions_category_id_idx" ON "transactions" USING btree ("category-id");