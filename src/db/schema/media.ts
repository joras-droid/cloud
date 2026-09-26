import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { mediaKind } from "./enums";
import { adminUsers } from "./admin";

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: mediaKind("kind").notNull(),
    r2Key: text("r2_key").notNull().unique(),
    mime: text("mime").notNull(),
    bytes: integer("bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    /** Tiny inline placeholder so images never cause layout shift. */
    blurhash: text("blurhash"),
    durationS: integer("duration_s"),
    altEn: text("alt_en"),
    altNe: text("alt_ne"),
    captionEn: text("caption_en"),
    captionNe: text("caption_ne"),
    /**
     * SHA-256 of the uploaded bytes. Lets us warn an admin when the same
     * payment screenshot is submitted against two different orders.
     */
    fileHash: text("file_hash").notNull(),
    uploadedBy: uuid("uploaded_by").references(() => adminUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("media_file_hash_idx").on(t.fileHash)],
);
