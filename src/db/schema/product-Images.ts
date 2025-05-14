import { createId } from "@paralleldrive/cuid2";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { products } from "./products";
import { relations } from "drizzle-orm";

export const productImages = pgTable("product_images", {
  id: text("id")
    .$defaultFn(() => createId())
    .primaryKey(),
  originalUrl: text("original_url").notNull(),
  optimizedUrl: text("optimized_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  productId: text("product_id")
    .notNull()
    .references(() => products.product_id, {
      onDelete: "cascade",
    }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productImageRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.product_id],
  }),
}));
