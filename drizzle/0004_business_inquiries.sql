CREATE TYPE "public"."office_meal" AS ENUM('lunch', 'snacks', 'both');--> statement-breakpoint
CREATE TABLE "business_inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_name" text NOT NULL,
	"location" text NOT NULL,
	"phone" text NOT NULL,
	"days" smallint[] NOT NULL,
	"meal" "office_meal" NOT NULL,
	"headcount_range" text NOT NULL,
	"lunch_time" text,
	"snacks_time" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "business_inquiries_created_idx" ON "business_inquiries" USING btree ("created_at");