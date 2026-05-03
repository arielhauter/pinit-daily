import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/constants";

export const dynamic = "force-dynamic";

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  const { pin } = await request.json();

  if (!pin || typeof pin !== "string") {
    return Response.json({ error: "Missing PIN" }, { status: 400 });
  }

  const pinHash = await hashPin(pin);
  const expectedHash = process.env.PIN_HASH;

  if (pinHash !== expectedHash) {
    return Response.json(
      { error: "รหัสผิด (Wrong PIN)" },
      { status: 401 }
    );
  }

  const sessionToken = crypto.randomUUID();

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return Response.json({ success: true });
}
