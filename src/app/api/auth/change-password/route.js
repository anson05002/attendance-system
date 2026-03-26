import { NextResponse } from "next/server";
import { updateEmployeePassword, getEmployeeByAccount } from "@/lib/notion";

export async function POST(request) {
  try {
    const account = request.headers.get("x-user-account");
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "請填寫所有欄位" }, { status: 400 });
    }

    const employee = await getEmployeeByAccount(account);
    if (!employee || employee.password !== currentPassword) {
      return NextResponse.json({ error: "目前密碼錯誤" }, { status: 401 });
    }

    await updateEmployeePassword(employee.id, newPassword);
    return NextResponse.json({ success: true, message: "密碼已更新" });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
