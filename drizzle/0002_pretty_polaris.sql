CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"amount" integer NOT NULL,
	"payee" text NOT NULL,
	"notes" text,
	"date" timestamp NOT NULL,
	"account-id" text NOT NULL,
	"category-id" text
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account-id_accounts_id_fk" FOREIGN KEY ("account-id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category-id_categories_id_fk" FOREIGN KEY ("category-id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;