CREATE TABLE "daily_insight" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"insight" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "daily_insight_date_unique" UNIQUE("date")
);
