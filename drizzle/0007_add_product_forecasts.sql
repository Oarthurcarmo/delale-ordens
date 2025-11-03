-- Create product_forecasts table to store average daily forecast for each product
CREATE TABLE "product_forecasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"average_daily_forecast" integer NOT NULL,
	CONSTRAINT "product_forecasts_product_id_unique" UNIQUE("product_id")
);
--> statement-breakpoint
ALTER TABLE "product_forecasts" ADD CONSTRAINT "product_forecasts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;

