import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "./s3";
import { env } from "../env";

export async function uploadImageToS3(
  buffer: Buffer,
  key: string,
  contentType: "image/webp"
): Promise<string> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.AWS_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return `https://${env.AWS_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
}
