import { NextRequest } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET } from "@/lib/r2";
import { isAuthorized } from "@/lib/api-auth";

// -------- POST /api/upload/presign --------
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { fileName, mimeType, fileSizeBytes } = body as Record<string, unknown>;

  if (!fileName || typeof fileName !== "string") {
    return Response.json({ error: "fileName is required" }, { status: 400 });
  }
  if (!mimeType || typeof mimeType !== "string") {
    return Response.json({ error: "mimeType is required" }, { status: 400 });
  }

  const r2Key = `tracks/${fileName}`;

  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: r2Key,
      ContentType: mimeType,
      // Include content length if provided - helps R2 validate the upload
      ...(typeof fileSizeBytes === "number" && { ContentLength: fileSizeBytes }),
    });

    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 900 });

    return Response.json({ uploadUrl, r2Key });
  } catch (err) {
    console.error("POST /api/upload/presign error:", err);
    return Response.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
}
