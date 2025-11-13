-- Criar tabela para armazenar previsões diárias específicas
CREATE TABLE IF NOT EXISTS "daily_forecasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"forecast_date" date NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "daily_forecasts_product_date_unique" UNIQUE("product_id", "forecast_date")
);

-- Adicionar foreign key
DO $$ BEGIN
 ALTER TABLE "daily_forecasts" ADD CONSTRAINT "daily_forecasts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Criar índice para consultas rápidas por data
CREATE INDEX IF NOT EXISTS "daily_forecasts_date_idx" ON "daily_forecasts" ("forecast_date");
CREATE INDEX IF NOT EXISTS "daily_forecasts_product_date_idx" ON "daily_forecasts" ("product_id", "forecast_date");

