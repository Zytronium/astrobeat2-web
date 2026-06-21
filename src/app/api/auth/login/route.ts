import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const COOKIE_NAME = "ab2_auth";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(request: Request) {
    const { password } = await request.json();

    if (password !== process.env.AUTH_SECRET) {
        return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    }

    // Next.js 16: cookies() is async
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, process.env.AUTH_SECRET!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: MAX_AGE,
        path: "/",
    });

    return NextResponse.json({ ok: true });
}
