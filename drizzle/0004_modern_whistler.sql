CREATE TYPE "public"."production_status" AS ENUM('awaiting_start', 'in_preparation', 'in_oven', 'cooling', 'packaging', 'ready_for_pickup', 'completed');--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "production_status" "production_status" DEFAULT 'awaiting_start';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "production_updated_by" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "production_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_production_updated_by_users_id_fk" FOREIGN KEY ("production_updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;