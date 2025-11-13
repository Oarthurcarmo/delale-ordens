-- Add production_quantity field to order_items
ALTER TABLE "order_items" ADD COLUMN "production_quantity" integer DEFAULT 0 NOT NULL;



