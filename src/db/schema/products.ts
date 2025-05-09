import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { stores } from "./stores";
import { categories } from "./categories";
import { relations } from "drizzle-orm";
import { productCategories } from "./productCategories";
import { brands } from "./brands";
import { productTags } from "./product-tags";
import { productImages } from "./product-Images";
import { orderItems } from "./order-items";

export const products = pgTable("products", {
  product_id: text("product_id")
    .$defaultFn(() => createId())
    .primaryKey(),
  product_name: text("product_name").notNull(),
  description: text("description").notNull(),
  characteristics: text("characteristics").notNull(),
  priceInCents: integer("price_in_cents").notNull(),
  stock: integer("stock").default(0).notNull(), // Controle de estoque
  isFeatured: boolean("is_featured").default(false).notNull(), // Destaque
  isArchived: boolean("is_archived").default(false).notNull(), // Arquivar produto
  status: text("status", {
    enum: ["available", "unavailable", "archived"],
  })
    .default("available")
    .notNull(),
  categoryId: text("category_id").references(() => categories.category_id),
  brandId: text("brand_id").references(() => brands.brand_id, {
    onDelete: "set null",
  }),
  storeId: text("store_id")
    .notNull()
    .references(() => stores.id, {
      onDelete: "cascade",
    }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
});

export const productRelations = relations(products, ({ one, many }) => ({
  store: one(stores, {
    fields: [products.storeId],
    references: [stores.id],
    relationName: "product_store",
  }),
  categories: many(productCategories),
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.brand_id],
  }),
  images: many(productImages),
  tags: many(productTags),
  ordersItems: many(orderItems),
}));
