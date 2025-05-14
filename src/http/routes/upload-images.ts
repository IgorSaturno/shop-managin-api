import Elysia, { t } from "elysia";
import { auth } from "../auth";
import { UnauthorizedError } from "../errors/unauthorized-error";
import { randomUUID } from "crypto";
import { db } from "../../db/connection";
import { productImages } from "../../db/schema";
import { createId } from "@paralleldrive/cuid2";
import sharp from "sharp";
import { uploadImageToS3 } from "../../lib/upload-image-to-s3";

// Tipagem de retorno: sucesso ou falha, com campos obrigatórios
type SuccessResponse = {
  success: true;
  data: {
    id: string;
    urls: { original: string; optimized: string; thumbnail: string };
  };
};

type ErrorResponse = {
  success: false;
  error: string;
};

type UploadResponse = SuccessResponse | ErrorResponse;

export const uploadImages = new Elysia().use(auth).post(
  "/products/:productId/images",
  async ({ getCurrentUser, body, params, set }): Promise<UploadResponse> => {
    try {
      const { storeId } = await getCurrentUser();
      if (!storeId) throw new UnauthorizedError();

      const { file } = body;
      const { productId } = params;
      if (!file || !productId) {
        set.status = 400;
        return {
          success: false,
          error: "Campos 'file' e 'productId' são obrigatórios",
        };
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const imageId = randomUUID();

      const [origBuf, optBuf, thumbBuf] = await Promise.all([
        sharp(buffer).webp({ quality: 90 }).toBuffer(),
        sharp(buffer)
          .resize(800, 800, { fit: "inside" })
          .webp({ quality: 80 })
          .toBuffer(),
        sharp(buffer)
          .resize(200, 200, { fit: "cover" })
          .webp({ quality: 70 })
          .toBuffer(),
      ]);

      const [originalUrl, optimizedUrl, thumbnailUrl] = await Promise.all([
        uploadImageToS3(
          origBuf,
          `products/${productId}/${imageId}-original.webp`,
          "image/webp"
        ),
        uploadImageToS3(
          optBuf,
          `products/${productId}/${imageId}-optimized.webp`,
          "image/webp"
        ),
        uploadImageToS3(
          thumbBuf,
          `products/${productId}/${imageId}-thumbnail.webp`,
          "image/webp"
        ),
      ]);

      const imageRecordId = createId();
      await db.insert(productImages).values({
        id: imageRecordId,
        originalUrl,
        optimizedUrl,
        thumbnailUrl,
        productId,
      });

      return {
        success: true,
        data: {
          id: imageRecordId,
          urls: {
            original: originalUrl,
            optimized: optimizedUrl,
            thumbnail: thumbnailUrl,
          },
        },
      };
    } catch (error: any) {
      console.error("Erro no upload:", error);
      set.status = 500;
      return {
        success: false,
        error: error.message || "Falha ao processar imagem",
      };
    }
  },
  {
    body: t.Object({
      file: t.File({
        format: ["image/jpeg", "image/png", "image/webp"],
        maxSize: "10m",
      }),
    }),
    params: t.Object({ productId: t.String() }),
    response: {
      200: t.Object({
        success: t.Boolean(),
        data: t.Object({
          id: t.String(),
          urls: t.Object({
            original: t.String(),
            optimized: t.String(),
            thumbnail: t.String(),
          }),
        }),
      }),
      400: t.Object({ success: t.Boolean(), error: t.String() }),
      500: t.Object({ success: t.Boolean(), error: t.String() }),
    },
  }
);
