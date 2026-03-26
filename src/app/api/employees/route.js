import { NextResponse } from "next/server";
import { getAllEmployees, createEmployee, updateEmployee } from "@/lib/notion";

export async function GET(request) {
  try {
    const role = request.headers.get("x-user-role");
    if (role !== "admin") {
      return NextResponse.json({ error: "權限不足" }, { status: 403 });
    }

    const employees = await getAllEmployees();
    return NextResponse.json(employees);
  } catch (err) {
    console.error("Get employees error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const role = request.headers.get("x-user-role");
    if (role !== "admin") {
      return NextResponse.json({ error: "權限不足" }, { status: 403 });
    }

    const { name, account, password, employeeRole } = await request.json();
    if (!name || !account || !password) {
      return NextResponse.json({ error: "請填寫所有欄位" }, { status: 400 });
    }

    await createEmployee({ name, account, password, role: employeeRole || "employee" });
    return NextResponse.json({ success: true, message: "員工已新增" });
  } catch (err) {
    console.error("Create employee error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const role = request.headers.get("x-user-role");
    if (role !== "admin") {
      return NextResponse.json({ error: "權限不足" }, { status: 403 });
    }

    const { id, name, account, password, employeeRole } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "缺少員工 ID" }, { status: 400 });
    }

    await updateEmployee(id, { name, account, password, role: employeeRole });
    return NextResponse.json({ success: true, message: "員工已更新" });
  } catch (err) {
    console.error("Update employee error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
