import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db } from "@/db";
import { tracks } from "@/db/schema";
import { r2, R2_BUCKET } from "@/lib/r2";
import { isAuthorized } from "@/lib/api-auth";

// -------- GET /api/tracks/[id]/stream --------
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Look up the track to get its R2 key
  let track: { r2Key: string } | undefined;
  try {
    const rows = await db
      .select({ r2Key: tracks.r2Key })
      .from(tracks)
      .where(eq(tracks.id, id))
      .limit(1);
    track = rows[0];
  } catch (err) {
    console.error("GET /api/tracks/[id]/stream DB error:", err);
    return Response.json({ error: "Failed to fetch track" }, { status: 500 });
  }

  if (!track) {
    return Response.json({ error: "Track not found" }, { status: 404 });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: track.r2Key,
    });
    const url = await getSignedUrl(r2, command, { expiresIn: 3600 });
    return Response.json({ url });
  } catch (err) {
    console.error("GET /api/tracks/[id]/stream presign error:", err);
    return Response.json({ error: "Failed to generate stream URL" }, { status: 500 });
  }
}
