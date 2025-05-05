import Elysia, { t } from "elysia";
import { auth } from "../auth";
import { db } from "../../db/connection";
import { categories } from "../../db/schema";
import { and, count, eq, ilike } from "drizzle-orm";

export const getCategories = new Elysia().use(auth).get(
  "/categories",
  async ({ getCurrentUser, query }) => {
    const { storeId } = await getCurrentUser();
    if (!storeId) throw new Error("Unauthorized");

    const {
      pageIndex = 0,
      categoryId,
      categoryName,
    } = query as {
      pageIndex?: number;
      categoryId?: string;
      categoryName?: string;
    };

    const perPage = 10;
    const offset = pageIndex * perPage;

    const whereConditions = [
      eq(categories.storeId, storeId),
      categoryId ? eq(categories.category_id, categoryId) : undefined,
      categoryName
        ? ilike(categories.category_name, `%${categoryName}%`)
        : undefined,
    ].filter(Boolean) as any[];

    const data = await db
      .select()
      .from(categories)
      .where(and(...whereConditions))
      .limit(perPage)
      .offset(offset)
      .execute();

    const countRows = await db
      .select({ count: count() })
      .from(categories)
      .where(and(...whereConditions))
      .execute();

    const totalCount = countRows[0]?.count ?? 0;

    const categoriesSerialized = data.map((category) => ({
      ...category,
      slug: category.category_name.toLowerCase().replace(/\s+/g, "-"),
      createdAt: category.createdAt.toISOString(),
    }));

    return {
      categories: categoriesSerialized,
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
      categoryId: t.Optional(t.String()),
      categoryName: t.Optional(t.String()),
    }),
    response: t.Object({
      categories: t.Array(
        t.Object({
          category_id: t.String(),
          category_name: t.String(),
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
