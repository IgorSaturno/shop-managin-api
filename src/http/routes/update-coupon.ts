import Elysia, { t } from "elysia";
import { auth } from "../auth";
import { db } from "../../db/connection";
import { discountCoupon } from "../../db/schema/discount-coupon";
import { and, eq, ne } from "drizzle-orm";

export const updateCoupon = new Elysia().use(auth).patch(
  "/discount-coupons/:id",
  async ({ params, body, getCurrentUser }) => {
    const { storeId } = await getCurrentUser();
    if (!storeId) throw new Error("Unauthorized");

    // Verifica se o cupom pertence à loja do usuário
    const [existingCoupon] = await db
      .select()
      .from(discountCoupon)
      .where(
        and(
          eq(discountCoupon.discount_coupon_id, params.id),
          eq(discountCoupon.storeId, storeId)
        )
      );

    if (!existingCoupon) {
      throw new Error("Cupom não encontrado ou não autorizado");
    }

    if (body.code && body.code !== existingCoupon.code) {
      const [existingCode] = await db
        .select()
        .from(discountCoupon)
        .where(
          and(
            eq(discountCoupon.code, body.code),
            eq(discountCoupon.storeId, storeId),
            ne(discountCoupon.discount_coupon_id, params.id)
          )
        );

      if (existingCode) {
        throw new Error("Código já está em uso por outro cupom");
      }
    }

    const newValueCents =
      body.discountValue != null
        ? Math.round(body.discountValue * 100)
        : existingCoupon.discountValue;

    const newMinOrderCents =
      body.minimumOrder != null
        ? Math.round(parseFloat(body.minimumOrder!) * 100)
        : existingCoupon.minimumOrder;

    // Atualiza apenas os campos fornecidos
    const [updatedCoupon] = await db
      .update(discountCoupon)
      .set({
        code: body.code ?? existingCoupon.code,
        discountType: body.discountType ?? existingCoupon.discountType,
        discountValue: newValueCents,
        minimumOrder: newMinOrderCents,
        maxUses: body.maxUses ?? existingCoupon.maxUses,
        validFrom: body.validFrom
          ? new Date(body.validFrom)
          : existingCoupon.validFrom,
        validUntil: body.validUntil
          ? new Date(body.validUntil)
          : existingCoupon.validUntil,
        active: body.active ?? existingCoupon.active,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(discountCoupon.discount_coupon_id, params.id),
          eq(discountCoupon.storeId, storeId)
        )
      )
      .returning();

    return updatedCoupon;
  },
  {
    params: t.Object({
      id: t.String(),
    }),
    body: t.Partial(
      t.Object({
        code: t.String(),
        discountType: t.Union([t.Literal("percentage"), t.Literal("fixed")]),
        discountValue: t.Number(),
        minimumOrder: t.Optional(t.String()),
        maxUses: t.Optional(t.Number()),
        validFrom: t.Optional(t.String({ format: "date-time" })),
        validUntil: t.String({ format: "date-time" }),
        active: t.Optional(t.Boolean()),
      })
    ),
  }
);
