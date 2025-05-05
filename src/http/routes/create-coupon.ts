import Elysia, { t } from "elysia";
import { auth } from "../auth";
import { db } from "../../db/connection";
import { discountCoupon } from "../../db/schema/discount-coupon";

export const createCoupon = new Elysia().use(auth).post(
  "/discount-coupons",
  async ({ body, getCurrentUser }) => {
    const { storeId } = await getCurrentUser();
    if (!storeId) throw new Error("Unauthorized");

    // → multiplica por 100 para transformar reais em centavos
    const valueCents = Math.round(body.discountValue * 100);
    const minOrderCents = body.minimumOrder
      ? Math.round(parseFloat(body.minimumOrder) * 100)
      : 0;

    const [newCoupon] = await db
      .insert(discountCoupon)
      .values({
        storeId,
        code: body.code,
        discountType: body.discountType,
        discountValue: valueCents,
        minimumOrder: minOrderCents,
        maxUses: body.maxUses ?? 0,
        validFrom: body.validFrom ? new Date(body.validFrom) : new Date(),
        validUntil: new Date(body.validUntil),
        active: body.active ?? true,
      })
      .returning();

    return newCoupon;
  },
  {
    body: t.Object({
      code: t.String(),
      discountType: t.Union([t.Literal("percentage"), t.Literal("fixed")]),
      discountValue: t.Number(), // em reais
      minimumOrder: t.Optional(t.String()), // string em reais
      maxUses: t.Optional(t.Number()),
      validFrom: t.Optional(t.String({ format: "date-time" })),
      validUntil: t.String({ format: "date-time" }),
      active: t.Optional(t.Boolean()),
    }),
  }
);
