import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

const PUBLIC_PATHS = ["/", "/api/auth/login"];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret);

    if (pathname.startsWith("/admin") && payload.role !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    const res = NextResponse.next();
    res.headers.set("x-user-id", payload.id);
    res.headers.set("x-user-name", encodeURIComponent(payload.name));
    res.headers.set("x-user-role", payload.role);
    res.headers.set("x-user-account", payload.account);
    return res;
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const res = NextResponse.redirect(new URL("/", request.url));
    res.cookies.delete("token");
    return res;
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/clock-in/:path*", "/api/locations/:path*", "/api/employees/:path*", "/api/auth/change-password/:path*"],
};
