import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ตัวอย่าง: protect เฉพาะ route ที่ต้อง login
  const protectedRoutes = ["/admin", "/progress", "/tests"];

  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // ⚠️ Edge-safe: เช็ค cookie เบา ๆ (ห้ามเรียก NextAuth)
  const hasSession =
    req.cookies.get("next-auth.session-token") ||
    req.cookies.get("__Secure-next-auth.session-token");

  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

// matcher เหมือนเดิม (โอเคแล้ว)
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|[^?]*\\.(?:html?|css|js|png|jpg|jpeg|gif|svg|ico|webp)).*)',
  ],
};