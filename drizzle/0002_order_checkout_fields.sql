ALTER TABLE "orders" ADD COLUMN "map_url" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "call_requested" boolean DEFAULT true NOT NULL;