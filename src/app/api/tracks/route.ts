import { NextRequest } from "next/server";
import { db } from "@/db";
import { tracks } from "@/db/schema";
import { isAuthorized } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// -------- GET /api/tracks --------
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await db.select().from(tracks).orderBy(tracks.uploadedAt);
    return Response.json(rows);
  } catch (err) {
    console.error("GET /api/tracks error:", err);
    return Response.json({ error: "Failed to fetch tracks" }, { status: 500 });
  }
}

// -------- POST /api/tracks --------
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

  const {
    title,
    artist,
    album,
    genre,
    tags,
    durationSecs,
    r2Key,
    fileName,
    fileSizeBytes,
    mimeType,
  } = body as Record<string, unknown>;

  // Required fields
  if (!title || typeof title !== "string") {
    return Response.json({ error: "title is required" }, { status: 400 });
  }
  if (!r2Key || typeof r2Key !== "string") {
    return Response.json({ error: "r2Key is required" }, { status: 400 });
  }
  if (!fileName || typeof fileName !== "string") {
    return Response.json({ error: "fileName is required" }, { status: 400 });
  }

  try {
    const [inserted] = await db
      .insert(tracks)
      .values({
        title,
        artist: typeof artist === "string" ? artist : null,
        album: typeof album === "string" ? album : null,
        genre: typeof genre === "string" ? genre : null,
        tags: Array.isArray(tags) ? (tags as string[]) : null,
        durationSecs: typeof durationSecs === "number" ? durationSecs : null,
        r2Key,
        fileName,
        fileSizeBytes: typeof fileSizeBytes === "number" ? fileSizeBytes : null,
        mimeType: typeof mimeType === "string" ? mimeType : null,
      })
      .returning({ id: tracks.id });

    return Response.json({ id: inserted.id }, { status: 201 });
  } catch (err) {
    console.error("POST /api/tracks error:", err);
    return Response.json({ error: "Failed to save track" }, { status: 500 });
  }
}
