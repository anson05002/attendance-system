import { NextResponse } from "next/server";
import { getEmployeeByAccount } from "@/lib/notion";
import { signToken } from "@/lib/auth";

export async function POST(request) {
  try {
    const { account, password } = await request.json();

    if (!account || !password) {
      return NextResponse.json({ error: "請輸入帳號和密碼" }, { status: 400 });
    }

    const employee = await getEmployeeByAccount(account);
    if (!employee || employee.password !== password) {
      return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 });
    }

    const token = await signToken({
      id: employee.id,
      name: employee.name,
      account: employee.account,
      role: employee.role,
    });

    const res = NextResponse.json({
      success: true,
      user: {
        name: employee.name,
        role: employee.role,
      },
    });

    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });

    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
