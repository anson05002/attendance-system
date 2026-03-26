import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

export async function GET() {
  const apiKey = process.env.NOTION_API_KEY;
  const dbId = process.env.EMPLOYEES_DB_ID;

  if (!apiKey) return NextResponse.json({ error: "NOTION_API_KEY missing" });
  if (!dbId) return NextResponse.json({ error: "EMPLOYEES_DB_ID missing" });

  try {
    const notion = new Client({ auth: apiKey });
    const res = await notion.databases.query({ database_id: dbId, page_size: 1 });
    return NextResponse.json({ ok: true, count: res.results.length });
  } catch (err) {
    return NextResponse.json({ error: err?.message ?? String(err) });
  }
}
