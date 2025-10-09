CREATE TABLE "order_item_edit_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_item_id" integer NOT NULL,
	"order_id" uuid NOT NULL,
	"requester_id" integer NOT NULL,
	"original_stock" integer NOT NULL,
	"original_quantity" integer NOT NULL,
	"original_type" "order_item_type" NOT NULL,
	"original_client_name" varchar(256),
	"original_delivery_date" date,
	"new_stock" integer,
	"new_quantity" integer,
	"new_type" "order_item_type",
	"new_client_name" varchar(256),
	"new_delivery_date" date,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"decided_by" integer,
	"decided_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_item_edit_requests" ADD CONSTRAINT "order_item_edit_requests_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_edit_requests" ADD CONSTRAINT "order_item_edit_requests_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_edit_requests" ADD CONSTRAINT "order_item_edit_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item_edit_requests" ADD CONSTRAINT "order_item_edit_requests_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;