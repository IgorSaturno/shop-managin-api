import { and, count, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { db } from "../../db/connection";
import { discountCoupon, discountCouponToProducts } from "../../db/schema";
import { auth } from "../auth";
import Elysia, { t } from "elysia";

export const getCoupons = new Elysia().use(auth).get(
  "/discount-coupons",
  async ({ getCurrentUser, query }) => {
    const { storeId } = await getCurrentUser();
    if (!storeId) throw new Error("Unauthorized");

    const {
      pageIndex = 0,
      status,
      couponId,
      code,
      discountType,
    } = query as {
      pageIndex?: number;
      status?: string;
      couponId?: string;
      code?: string;
      discountType?: "percentage" | "fixed";
    };

    const perPage = 10;
    const offset = pageIndex * perPage;

    // monta condição de status
    const statusFilter =
      status === "active"
        ? and(
            eq(discountCoupon.active, true),
            sql`CURRENT_TIMESTAMP BETWEEN ${discountCoupon.validFrom} AND ${discountCoupon.validUntil}`
          )
        : status === "scheduled"
          ? sql`CURRENT_TIMESTAMP < ${discountCoupon.validFrom}`
          : status === "expired"
            ? sql`CURRENT_TIMESTAMP > ${discountCoupon.validUntil}`
            : undefined;

    // monta também filtros opcionais de id, code e type
    const idFilter = couponId
      ? eq(discountCoupon.discount_coupon_id, couponId)
      : undefined;
    const codeFilter = code
      ? ilike(discountCoupon.code, `%${code}%`)
      : undefined;
    const typeFilter = discountType
      ? eq(discountCoupon.discountType, discountType)
      : undefined;

    // concatena todos
    const whereConditions = [
      eq(discountCoupon.storeId, storeId),
      statusFilter,
      idFilter,
      codeFilter,
      typeFilter,
    ].filter(Boolean) as any[];

    // Query principal dos cupons
    const couponsQuery = db
      .select({
        discount_coupon_id: discountCoupon.discount_coupon_id,
        code: discountCoupon.code,
        discountType: discountCoupon.discountType,
        discountValue: discountCoupon.discountValue,
        maxUses: discountCoupon.maxUses,
        usedCount: discountCoupon.usedCount,
        validUntil: discountCoupon.validUntil,
        validFrom: discountCoupon.validFrom,
        active: discountCoupon.active,
        createdAt: discountCoupon.createdAt,
        updatedAt: discountCoupon.updatedAt,
        minimumOrder: discountCoupon.minimumOrder,
      })
      .from(discountCoupon)
      .where(and(...whereConditions))
      .orderBy(desc(discountCoupon.createdAt))
      .limit(perPage)
      .offset(offset);

    const coupons = await couponsQuery.execute();

    // Query para produtos associados (após buscar os cupons)
    const couponIds = coupons.map((coupons) => coupons.discount_coupon_id);
    let productsMap = new Map<string, string[]>();

    if (couponIds.length > 0) {
      const couponProducts = await db
        .select({
          couponId: discountCouponToProducts.couponId,
          productId: discountCouponToProducts.productId,
        })
        .from(discountCouponToProducts)
        .where(inArray(discountCouponToProducts.couponId, couponIds));

      couponProducts.forEach(({ couponId, productId }) => {
        if (!productsMap.has(couponId)) productsMap.set(couponId, []);
        productsMap.get(couponId)!.push(productId);
      });
    }

    // Query de contagem total (otimizada)
    const totalCountResult = await db
      .select({ count: count() })
      .from(discountCoupon)
      .where(and(eq(discountCoupon.storeId, storeId), statusFilter))
      .execute();

    const totalCount = totalCountResult[0]?.count || 0;

    return {
      coupons: coupons.map((coupon) => ({
        ...coupon,
        discountType: coupon.discountType.toLocaleLowerCase(),
        products:
          productsMap
            .get(coupon.discount_coupon_id)
            ?.map((productId) => ({ productId })) || [],
      })),
      meta: {
        pageIndex,
        perPage,
        totalCount,
      },
    };
  },
  {
    query: t.Object({
      pageIndex: t.Numeric({ minimum: 0 }),
      status: t.Optional(
        t.String({
          enum: ["active", "expired", "scheduled", "all"],
        })
      ),
      couponId: t.Optional(t.String()),
      code: t.Optional(t.String()),
      discountType: t.Optional(t.String({ enum: ["percentage", "fixed"] })),
    }),
  }
);
