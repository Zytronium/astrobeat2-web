import { NextRequest } from "next/server";

const COOKIE_NAME = "ab2_auth";

export function isAuthorized(req: NextRequest): boolean {
  // Android app - Bearer token in Authorization header
  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${process.env.API_SECRET}`) return true;

  // Browser upload page - secure cookie set by /api/auth/login
  const cookie = req.cookies.get(COOKIE_NAME)?.value ?? "";
  if (cookie === process.env.AUTH_SECRET) return true;

  return false;
}
