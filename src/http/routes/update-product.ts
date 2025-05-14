import Elysia, { t } from "elysia";
import { auth } from "../auth";
import { db } from "../../db/connection";
import { and, eq } from "drizzle-orm";
import {
  products,
  productImages,
  productTags,
  discountCouponToProducts,
  productCategories,
} from "../../db/schema";

export const updateProduct = new Elysia().use(auth).patch(
  "/products/:productId",
  async ({ getCurrentUser, params, body, set }) => {
    const { productId } = params;
    const { storeId } = await getCurrentUser();

    if (!storeId) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    // 1) Verifica se o produto existe e pertence à loja
    const [existing] = await db
      .select()
      .from(products)
      .where(
        and(eq(products.product_id, productId), eq(products.storeId, storeId))
      );

    if (!existing) {
      set.status = 404;
      return { message: "Product not found" };
    }

    // 2) Atualiza campos principais
    await db
      .update(products)
      .set({
        ...(body.product_name && { product_name: body.product_name }),
        ...(body.description != null && { description: body.description }),
        ...(body.characteristics != null && {
          characteristics: body.characteristics,
        }),
        ...(body.priceInCents != null && {
          priceInCents: Math.round(body.priceInCents),
        }),
        ...(body.stock != null && { stock: body.stock }),
        ...(body.status && { status: body.status }),
        ...(body.isFeatured != null && { isFeatured: body.isFeatured }),
        ...(body.isArchived != null && { isArchived: body.isArchived }),
        ...(body.categoryId && { categoryId: body.categoryId }),
        ...(body.brandId && { brandId: body.brandId }),
      })
      .where(eq(products.product_id, productId));

    // 3) Dentro de uma transação, refaz todos os relacionamentos
    await db.transaction(async (tx) => {
      // Tags
      await tx.delete(productTags).where(eq(productTags.productId, productId));
      if (body.tags?.length) {
        await tx.insert(productTags).values(
          body.tags.map((tagId: string) => ({
            productId,
            tagId,
          }))
        );
      }

      // Imagens
      await tx
        .delete(productImages)
        .where(eq(productImages.productId, productId));
      if (body.images?.length) {
        await tx.insert(productImages).values(
          body.images.map(
            (
              img: {
                original: string;
                optimized: string;
                thumbnail: string;
              },
              idx: number
            ) => ({
              productId,
              originalUrl: img.original,
              optimizedUrl: img.optimized,
              thumbnailUrl: img.thumbnail,
              order: idx,
              createdAt: new Date(),
            })
          )
        );
      }

      // Cupons
      await tx
        .delete(discountCouponToProducts)
        .where(eq(discountCouponToProducts.productId, productId));
      if (body.couponIds?.length) {
        await tx.insert(discountCouponToProducts).values(
          body.couponIds.map((couponId: string) => ({
            couponId,
            productId,
          }))
        );
      }

      // Categorias
      await tx
        .delete(productCategories)
        .where(eq(productCategories.productId, productId));
      if (body.categoryId) {
        await tx.insert(productCategories).values({
          productId,
          categoryId: body.categoryId,
        });
      }
    });

    return { success: true };
  },
  {
    params: t.Object({
      productId: t.String(),
    }),
    body: t.Object({
      product_name: t.Optional(t.String()),
      description: t.Optional(t.String()),
      characteristics: t.Optional(t.String()),
      priceInCents: t.Optional(t.Number()),
      stock: t.Optional(t.Integer()),
      status: t.Optional(
        t.Union([
          t.Literal("available"),
          t.Literal("unavailable"),
          t.Literal("archived"),
        ])
      ),
      isFeatured: t.Optional(t.Boolean()),
      isArchived: t.Optional(t.Boolean()),
      categoryId: t.Optional(t.String()),
      brandId: t.Optional(t.String()),
      tags: t.Optional(t.Array(t.String())),
      images: t.Optional(
        t.Array(
          t.Object({
            original: t.String(),
            optimized: t.String(),
            thumbnail: t.String(),
          })
        )
      ),
      couponIds: t.Optional(t.Array(t.String())),
    }),
    response: {
      200: t.Object({ success: t.Boolean() }),
      401: t.Object({ message: t.String() }),
      404: t.Object({ message: t.String() }),
    },
  }
);
