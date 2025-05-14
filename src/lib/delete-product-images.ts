import { ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { env } from "../env";
import { s3Client } from "./s3";

export async function deleteProductImages(productId: string) {
  const bucket = env.AWS_BUCKET_NAME!;
  const prefix = `products/${productId}/`;

  const listed = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    })
  );

  if (!listed.Contents || listed.Contents.length === 0) {
    return;
  }

  const toDelete = listed.Contents.map((obj) => ({ Key: obj.Key! }));

  await s3Client.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: toDelete },
    })
  );

  if (listed.IsTruncated) {
    await deleteProductImages(productId);
  }
}
