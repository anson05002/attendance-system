import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&language=zh-TW&region=TW`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK" || data.results.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const results = data.results.map((r) => ({
    displayName: r.formatted_address,
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
  }));

  return NextResponse.json({ results });
}
