import Elysia, { t } from "elysia";
import { auth } from "../auth";
import { db } from "../../db/connection";
import { brands } from "../../db/schema";
import { and, count, eq, ilike } from "drizzle-orm";

export const getBrands = new Elysia().use(auth).get(
  "/brands",
  async ({ getCurrentUser, query }) => {
    const { storeId } = await getCurrentUser();
    if (!storeId) throw new Error("Unauthorized");

    const {
      pageIndex = 0,
      brandId,
      brandName,
    } = query as {
      pageIndex?: number;
      brandId?: string;
      brandName?: string;
    };

    const perPage = 10;
    const offset = pageIndex * perPage;

    const whereConditions = [
      eq(brands.storeId, storeId),
      brandId ? eq(brands.brand_id, brandId) : undefined,
      brandName ? ilike(brands.brand_name, `%${brandName}%`) : undefined,
    ].filter(Boolean) as any[];

    const data = await db
      .select()
      .from(brands)
      .where(and(...whereConditions))
      .limit(perPage)
      .offset(offset)
      .execute();

    const countRows = await db
      .select({ count: count() })
      .from(brands)
      .where(and(...whereConditions))
      .execute();

    const totalCount = countRows[0]?.count ?? 0;

    const brandsSerialized = data.map((brand) => ({
      ...brand,
      slug: brand.brand_name.toLowerCase().replace(/\s+/g, "-"),
      createdAt: brand.createdAt.toISOString(),
    }));

    return {
      brands: brandsSerialized,
      meta: {
        pageIndex,
        perPage: perPage,
        totalCount,
      },
    };
  },
  {
    query: t.Object({
      pageIndex: t.Optional(t.Numeric()),
      brandId: t.Optional(t.String()),
      brandName: t.Optional(t.String()),
    }),
    response: t.Object({
      brands: t.Array(
        t.Object({
          brand_id: t.String(),
          brand_name: t.String(),
          slug: t.String(),
          storeId: t.String(),
          createdAt: t.String(),
        })
      ),
      meta: t.Object({
        pageIndex: t.Number(),
        perPage: t.Number(),
        totalCount: t.Number(),
      }),
    }),
  }
);
