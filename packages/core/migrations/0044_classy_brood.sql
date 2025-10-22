CREATE TABLE "hashtag_snapshot" (
	"id" "ulid" PRIMARY KEY DEFAULT gen_ulid() NOT NULL,
	"normalized_tag" text NOT NULL,
	"display_tag" text,
	"platform" "platform" NOT NULL,
	"usage_count" bigint,
	"view_count" bigint,
	"last_fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE UNIQUE INDEX "hashtag_snapshot_platform_tag_idx" ON "hashtag_snapshot" USING btree ("platform","normalized_tag");--> statement-breakpoint
CREATE INDEX "hashtag_snapshot_fetched_idx" ON "hashtag_snapshot" USING btree ("last_fetched_at");