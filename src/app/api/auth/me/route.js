import { NextResponse } from "next/server";

export async function GET(request) {
  const name = decodeURIComponent(request.headers.get("x-user-name") || "");
  const role = request.headers.get("x-user-role") || "";
  const account = request.headers.get("x-user-account") || "";
  return NextResponse.json({ name, role, account });
}
