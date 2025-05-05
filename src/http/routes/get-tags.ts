import Elysia, { t } from "elysia";
import { auth } from "../auth";
import { db } from "../../db/connection";
import { tags } from "../../db/schema";
import { and, count, eq, ilike } from "drizzle-orm";

export const getTags = new Elysia().use(auth).get(
  "/tags",
  async ({ getCurrentUser, query }) => {
    const { storeId } = await getCurrentUser();
    if (!storeId) throw new Error("Unauthorized");

    const {
      pageIndex = 0,
      tagId,
      tagName,
    } = query as {
      pageIndex?: number;
      tagId?: string;
      tagName?: string;
    };

    const perPage = 10;
    const offset = pageIndex * perPage;

    const whereConditions = [
      eq(tags.storeId, storeId),
      tagId ? eq(tags.tag_id, tagId) : undefined,
      tagName ? ilike(tags.tag_name, `%${tagName}%`) : undefined,
    ].filter(Boolean) as any[];

    const data = await db
      .select()
      .from(tags)
      .where(and(...whereConditions))
      .limit(perPage)
      .offset(offset)
      .execute();

    // busca total count (corrigido para evitar erro de possível undefined)
    const countRows = await db
      .select({ count: count() })
      .from(tags)
      .where(and(...whereConditions))
      .execute();

    const totalCount = countRows[0]?.count ?? 0;

    // serializa datas
    const tagsSerialized = data.map((tag) => ({
      ...tag,
      createdAt: tag.createdAt.toISOString(),
    }));

    return {
      tags: tagsSerialized,
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
      tagId: t.Optional(t.String()),
      tagName: t.Optional(t.String()),
    }),
    response: t.Object({
      tags: t.Array(
        t.Object({
          tag_id: t.String(),
          tag_name: t.String(),
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
