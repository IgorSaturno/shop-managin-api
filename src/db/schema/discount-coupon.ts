import { createId } from "@paralleldrive/cuid2";
import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  boolean,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";
import { products } from "./products";
import { relations } from "drizzle-orm";
import { stores } from "./stores";
import { discountCouponToProducts } from "./discount-coupons-to-products";

export const discountCoupon = pgTable(
  "discount_coupons",
  {
    discount_coupon_id: text("discount_coupon_id")
      .$defaultFn(() => createId())
      .primaryKey(),
    code: varchar("code", { length: 20 }).notNull(),
    discountType: varchar("discount_type", {
      enum: ["percentage", "fixed"],
    }).notNull(),
    discountValue: integer("discount_value").notNull(),
    minimumOrder: integer("minimum_order").default(0),
    maxUses: integer("max_uses").notNull(),
    usedCount: integer("used_count").default(0),
    validFrom: timestamp("valid_from", { mode: "date" }).defaultNow(),
    validUntil: timestamp("valid_until", { mode: "date" }).notNull(),
    active: boolean("active").default(true),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, {
        onDelete: "cascade",
      }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    uniqueCodePerStore: unique("unique_code_per_store").on(
      table.code,
      table.storeId
    ),
  })
);

export const discountCouponToProductsRelations = relations(
  discountCouponToProducts,
  ({ one }) => ({
    coupon: one(discountCoupon, {
      fields: [discountCouponToProducts.couponId],
      references: [discountCoupon.discount_coupon_id],
    }),
    product: one(products, {
      fields: [discountCouponToProducts.productId],
      references: [products.product_id],
    }),
  })
);

export const discountCouponRelations = relations(
  discountCoupon,
  ({ one, many }) => ({
    store: one(stores, {
      fields: [discountCoupon.storeId],
      references: [stores.id],
    }),
    products: many(discountCouponToProducts),
  })
);
