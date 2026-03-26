import { NextResponse } from "next/server";
import { getAllLocations, createLocation, updateLocation, deleteLocation } from "@/lib/notion";

export async function GET() {
  try {
    const locations = await getAllLocations();
    return NextResponse.json(locations);
  } catch (err) {
    console.error("Get locations error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const role = request.headers.get("x-user-role");
    if (role !== "admin") {
      return NextResponse.json({ error: "權限不足" }, { status: 403 });
    }

    const { name, address, latitude, longitude } = await request.json();
    if (!name || latitude == null || longitude == null) {
      return NextResponse.json({ error: "請填寫所有欄位" }, { status: 400 });
    }

    await createLocation({ name, address: address || "", latitude, longitude });
    return NextResponse.json({ success: true, message: "地點已新增" });
  } catch (err) {
    console.error("Create location error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const role = request.headers.get("x-user-role");
    if (role !== "admin") {
      return NextResponse.json({ error: "權限不足" }, { status: 403 });
    }

    const { id, name, address, latitude, longitude } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "缺少地點 ID" }, { status: 400 });
    }

    await updateLocation(id, { name, address, latitude, longitude });
    return NextResponse.json({ success: true, message: "地點已更新" });
  } catch (err) {
    console.error("Update location error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const role = request.headers.get("x-user-role");
    if (role !== "admin") {
      return NextResponse.json({ error: "權限不足" }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "缺少地點 ID" }, { status: 400 });
    }

    await deleteLocation(id);
    return NextResponse.json({ success: true, message: "地點已刪除" });
  } catch (err) {
    console.error("Delete location error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
