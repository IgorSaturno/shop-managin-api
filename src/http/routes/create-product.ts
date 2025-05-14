import Elysia, { t } from "elysia";
import { auth } from "../auth";
import { db } from "../../db/connection";
import {
  products,
  discountCouponToProducts,
  productTags,
  productImages,
  productCategories,
} from "../../db/schema";
import { createId } from "@paralleldrive/cuid2";

export const createProduct = new Elysia().use(auth).post(
  "/products",
  async ({ getCurrentUser, body, set }) => {
    const { storeId } = await getCurrentUser();
    if (!storeId) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const {
      product_name,
      description,
      characteristics,
      priceInCents,
      stock,
      categoryId,
      brandId,
      status = "available",
      isFeatured = false,
      isArchived = false,
      tags = [],
      images = [],
      couponIds = [], // agora suportamos couponIds
    } = body;

    // validação mínima
    if (!product_name || !description || !characteristics || !priceInCents) {
      set.status = 400;
      return { message: "Campos obrigatórios faltando" };
    }
    const productId = createId();

    try {
      await db.transaction(async (tx) => {
        // 1) cria o produto
        await tx.insert(products).values({
          product_id: productId,
          product_name,
          description,
          characteristics,
          priceInCents,
          stock,
          categoryId,
          brandId,
          storeId,
          status,
          isFeatured,
          isArchived,
        });

        // 2) vincula tags
        if (tags.length > 0) {
          await tx.insert(productTags).values(
            tags.map((tagId: string) => ({
              productId,
              tagId,
            }))
          );
        }

        // 3) vincula imagens
        if (images.length > 0) {
          await tx.insert(productImages).values(
            images.map(
              (
                image: {
                  original: string;
                  optimized: string;
                  thumbnail: string;
                },
                idx: number
              ) => ({
                id: createId(),
                productId,
                originalUrl: image.original,
                optimizedUrl: image.optimized,
                thumbnailUrl: image.thumbnail,
                order: idx,
                createdAt: new Date(),
              })
            )
          );
        }

        // 4) vincula cupons
        if (couponIds.length > 0) {
          await tx.insert(discountCouponToProducts).values(
            couponIds.map((couponId: string) => ({
              couponId,
              productId,
            }))
          );
        }

        if (categoryId) {
          await tx.insert(productCategories).values({
            productId,
            categoryId,
          });
        }
      });

      return { productId };
    } catch (err) {
      console.error(err);
      set.status = 500;
      return { message: "Falha ao criar produto" };
    }
  },
  {
    body: t.Object({
      product_name: t.String(),
      description: t.String(),
      characteristics: t.String(),
      priceInCents: t.Integer(),
      stock: t.Integer(),
      categoryId: t.String(),
      brandId: t.String(),
      status: t.Optional(
        t.Union([
          t.Literal("available"),
          t.Literal("unavailable"),
          t.Literal("archived"),
        ])
      ),
      isFeatured: t.Optional(t.Boolean()),
      isArchived: t.Optional(t.Boolean()),
      sku: t.Optional(t.String()),
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
  }
);
