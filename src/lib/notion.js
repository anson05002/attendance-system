import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const EMPLOYEES_DB = process.env.EMPLOYEES_DB_ID;
const LOCATIONS_DB = process.env.LOCATIONS_DB_ID;
const ATTENDANCE_DB = process.env.ATTENDANCE_DB_ID;

// ─── Employees ───

export async function getEmployeeByAccount(account) {
  const res = await notion.databases.query({
    database_id: EMPLOYEES_DB,
    filter: {
      property: "Account",
      rich_text: { equals: account },
    },
  });
  if (res.results.length === 0) return null;
  const page = res.results[0];
  return extractEmployee(page);
}

export async function getAllEmployees() {
  const res = await notion.databases.query({ database_id: EMPLOYEES_DB });
  return res.results.map(extractEmployee);
}

function extractEmployee(page) {
  const p = page.properties;
  return {
    id: page.id,
    name: p.Name?.title?.[0]?.plain_text ?? "",
    account: p.Account?.rich_text?.[0]?.plain_text ?? "",
    password: p.Password?.rich_text?.[0]?.plain_text ?? "",
    role: p.Role?.select?.name ?? "employee",
  };
}

export async function createEmployee({ name, account, password, role }) {
  return notion.pages.create({
    parent: { database_id: EMPLOYEES_DB },
    properties: {
      Name: { title: [{ text: { content: name } }] },
      Account: { rich_text: [{ text: { content: account } }] },
      Password: { rich_text: [{ text: { content: password } }] },
      Role: { select: { name: role } },
    },
  });
}

export async function updateEmployeePassword(pageId, newPassword) {
  return notion.pages.update({
    page_id: pageId,
    properties: {
      Password: { rich_text: [{ text: { content: newPassword } }] },
    },
  });
}

export async function updateEmployee(pageId, { name, account, password, role }) {
  const properties = {};
  if (name !== undefined)
    properties.Name = { title: [{ text: { content: name } }] };
  if (account !== undefined)
    properties.Account = { rich_text: [{ text: { content: account } }] };
  if (password !== undefined)
    properties.Password = { rich_text: [{ text: { content: password } }] };
  if (role !== undefined)
    properties.Role = { select: { name: role } };
  return notion.pages.update({ page_id: pageId, properties });
}

// ─── Locations ───

export async function getAllLocations() {
  const res = await notion.databases.query({ database_id: LOCATIONS_DB });
  return res.results.map((page) => {
    const p = page.properties;
    return {
      id: page.id,
      name: p.Name?.title?.[0]?.plain_text ?? "",
      address: p.Address?.rich_text?.[0]?.plain_text ?? "",
      latitude: p.Latitude?.number ?? 0,
      longitude: p.Longitude?.number ?? 0,
    };
  });
}

export async function createLocation({ name, address, latitude, longitude }) {
  return notion.pages.create({
    parent: { database_id: LOCATIONS_DB },
    properties: {
      Name: { title: [{ text: { content: name } }] },
      Address: { rich_text: [{ text: { content: address } }] },
      Latitude: { number: latitude },
      Longitude: { number: longitude },
    },
  });
}

export async function updateLocation(pageId, { name, address, latitude, longitude }) {
  const properties = {};
  if (name !== undefined)
    properties.Name = { title: [{ text: { content: name } }] };
  if (address !== undefined)
    properties.Address = { rich_text: [{ text: { content: address } }] };
  if (latitude !== undefined)
    properties.Latitude = { number: latitude };
  if (longitude !== undefined)
    properties.Longitude = { number: longitude };
  return notion.pages.update({ page_id: pageId, properties });
}

export async function deleteLocation(pageId) {
  return notion.pages.update({ page_id: pageId, archived: true });
}

// ─── Attendance ───

export async function createAttendance({ employee, location, dateTime, coordinates, network, device }) {
  const properties = {
    Employee: { title: [{ text: { content: employee } }] },
    Location: { rich_text: [{ text: { content: location } }] },
    DateTime: { rich_text: [{ text: { content: dateTime } }] },
    Coordinates: { rich_text: [{ text: { content: coordinates } }] },
  };
  if (network) properties.Network = { rich_text: [{ text: { content: network } }] };
  if (device) properties.Device = { rich_text: [{ text: { content: device } }] };

  try {
    return await notion.pages.create({ parent: { database_id: ATTENDANCE_DB }, properties });
  } catch {
    // Properties may not exist yet — auto-create them and retry
    await notion.databases.update({
      database_id: ATTENDANCE_DB,
      properties: { Network: { rich_text: {} }, Device: { rich_text: {} } },
    });
    return await notion.pages.create({ parent: { database_id: ATTENDANCE_DB }, properties });
  }
}

export async function getAttendanceRecords(employeeName) {
  const filter = employeeName
    ? { property: "Employee", title: { equals: employeeName } }
    : undefined;
  const res = await notion.databases.query({
    database_id: ATTENDANCE_DB,
    ...(filter && { filter }),
    sorts: [{ property: "DateTime", direction: "descending" }],
    page_size: 100,
  });
  return res.results.map((page) => {
    const p = page.properties;
    return {
      id: page.id,
      employee: p.Employee?.title?.[0]?.plain_text ?? "",
      location: p.Location?.rich_text?.[0]?.plain_text ?? "",
      dateTime: p.DateTime?.rich_text?.[0]?.plain_text ?? "",
      coordinates: p.Coordinates?.rich_text?.[0]?.plain_text ?? "",
      network: p.Network?.rich_text?.[0]?.plain_text ?? "",
      device: p.Device?.rich_text?.[0]?.plain_text ?? "",
    };
  });
}
