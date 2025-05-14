import Elysia, { t } from "elysia";
import { db } from "../../db/connection";
import {
  products,
  productImages,
  categories,
  productCategories,
  tags,
  productTags,
  brands,
  discountCoupon,
  discountCouponToProducts,
} from "../../db/schema";
import { eq } from "drizzle-orm";
import { auth } from "../auth";
import { UnauthorizedError } from "../errors/unauthorized-error";

export const getProductDetails = new Elysia().use(auth).get(
  "/products/:productId",
  async ({ getCurrentUser, params }) => {
    const { storeId } = await getCurrentUser();
    const { productId } = params;

    if (!storeId) {
      throw new UnauthorizedError();
    }

    // Consulta básica do produto
    const product = await db
      .select({
        productId: products.product_id,
        productName: products.product_name,
        description: products.description,
        characteristics: products.characteristics,
        priceInCents: products.priceInCents,
        stock: products.stock,
        status: products.status,
        brandId: products.brandId,
        categoryId: products.categoryId,
        isFeatured: products.isFeatured,
        createdAt: products.createdAt,
      })
      .from(products)
      .where(eq(products.product_id, productId))
      .then((res) => res[0]);

    if (!product) {
      return { error: "Produto não encontrado" };
    }

    // Busca as imagens (limitando a 4)
    const imagesData = await db
      .select({
        optimizedUrl: productImages.optimizedUrl,
        thumbnailUrl: productImages.thumbnailUrl,
      })
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .limit(4);

    // Busca as categorias (exemplo usando join com tabela associativa)
    const categoryData = await db
      .select({
        id: categories.category_id,
        categoryName: categories.category_name,
      })
      .from(categories)
      .innerJoin(
        productCategories,
        eq(productCategories.categoryId, categories.category_id)
      )
      .where(eq(productCategories.productId, productId))
      .then((res) => res);

    // Busca as tags (exemplo similar)
    const tagsData = await db
      .select({ tagId: tags.tag_id, tagName: tags.tag_name })
      .from(tags)
      .innerJoin(productTags, eq(productTags.tagId, tags.tag_id))
      .where(eq(productTags.productId, productId));

    let brandData = null;
    if (product.brandId) {
      brandData = await db
        .select({
          brandId: brands.brand_id,
          brandName: brands.brand_name,
        })
        .from(brands)
        .where(eq(brands.brand_id, product.brandId))
        .then((res) => res[0]);
    }

    const couponsData = await db
      .select({ code: discountCoupon.code })
      .from(discountCouponToProducts)
      .innerJoin(
        discountCoupon,
        eq(discountCouponToProducts.couponId, discountCoupon.discount_coupon_id)
      )
      .where(eq(discountCouponToProducts.productId, productId));

    return {
      productId: product.productId,
      productName: product.productName,
      description: product.description,
      characteristics: product.characteristics,
      priceInCents: product.priceInCents,
      stock: product.stock,
      status: product.status,
      categoryId: categoryData.map((category) => category.id),
      brandId: brandData ? brandData.brandId : "",
      coupons: couponsData.map((coupon) => coupon.code),
      tags: tagsData.map((tag) => tag.tagName),
      images: imagesData.map((img) => ({
        optimized: img.optimizedUrl, // Novo formato de retorno
        thumbnail: img.thumbnailUrl, // Novo campo
      })),
      createdAt: product.createdAt,
    };
  },
  {
    params: t.Object({
      productId: t.String(),
    }),
  }
);
