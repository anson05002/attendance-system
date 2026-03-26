import { NextResponse } from "next/server";
import { getAllLocations, createAttendance, getAttendanceRecords } from "@/lib/notion";
import { isWithinRange, getDistance } from "@/lib/geo";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employee = searchParams.get("employee") || "";
    const records = await getAttendanceRecords(employee || undefined);
    return NextResponse.json(records);
  } catch (err) {
    console.error("Get attendance error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const userName = decodeURIComponent(request.headers.get("x-user-name") || "");
    const { latitude, longitude } = await request.json();

    if (latitude == null || longitude == null) {
      return NextResponse.json({ error: "無法取得定位資訊，請開啟定位權限" }, { status: 400 });
    }

    const locations = await getAllLocations();
    if (locations.length === 0) {
      return NextResponse.json({ error: "尚未設定打卡地點，請聯繫管理員" }, { status: 400 });
    }

    // Check if user is within range of any location
    let closestLocation = null;
    let closestDistance = Infinity;

    for (const loc of locations) {
      const dist = getDistance(latitude, longitude, loc.latitude, loc.longitude);
      if (dist < closestDistance) {
        closestDistance = dist;
        closestLocation = loc;
      }
    }

    if (!isWithinRange(latitude, longitude, closestLocation.latitude, closestLocation.longitude)) {
      return NextResponse.json(
        {
          error: `超出打卡範圍！距離最近地點「${closestLocation.name}」還有 ${Math.round(closestDistance)} 公尺`,
          distance: Math.round(closestDistance),
        },
        { status: 403 }
      );
    }

    // Format date: YYYY/MM/DD hh:mm:ss AM/PM
    const now = new Date();
    const dateTime = formatDateTime(now);
    const coordinates = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

    await createAttendance({
      employee: userName,
      location: closestLocation.name,
      dateTime,
      coordinates,
    });

    return NextResponse.json({
      success: true,
      message: "打卡成功！",
      location: closestLocation.name,
      dateTime,
    });
  } catch (err) {
    console.error("Clock-in error:", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

function formatDateTime(date) {
  // Convert to Taiwan time (UTC+8)
  const twTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const y = twTime.getUTCFullYear();
  const m = String(twTime.getUTCMonth() + 1).padStart(2, "0");
  const d = String(twTime.getUTCDate()).padStart(2, "0");
  let h = twTime.getUTCHours();
  const min = String(twTime.getUTCMinutes()).padStart(2, "0");
  const s = String(twTime.getUTCSeconds()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${y}/${m}/${d} ${String(h).padStart(2, "0")}:${min}:${s} ${ampm}`;
}
