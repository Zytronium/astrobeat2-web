import { NextRequest } from "next/server";

export function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${process.env.API_SECRET}`;
}
