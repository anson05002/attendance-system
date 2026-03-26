"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState("employees");
  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [filteredAttendance, setFilteredAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // Employee form
  const [empForm, setEmpForm] = useState({ name: "", account: "", password: "", role: "employee" });
  const [editingEmp, setEditingEmp] = useState(null);

  // Location form
  const [locForm, setLocForm] = useState({ name: "", address: "" });
  const [locGeo, setLocGeo] = useState(null); // { lat, lng, displayName }
  const [searchingAddr, setSearchingAddr] = useState(false);
  const [editingLoc, setEditingLoc] = useState(null);
  const [searchResults, setSearchResults] = useState([]);

  // Attendance filter
  const [filterName, setFilterName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchEmployees = useCallback(async () => {
    const res = await fetch("/api/employees");
    if (res.ok) setEmployees(await res.json());
  }, []);

  const fetchLocations = useCallback(async () => {
    const res = await fetch("/api/locations");
    if (res.ok) setLocations(await res.json());
  }, []);

  const fetchAttendance = useCallback(async () => {
    const res = await fetch(`/api/clock-in?employee=${encodeURIComponent(filterName)}`);
    if (res.ok) {
      const data = await res.json();
      setAttendance(data);
      applyDateFilter(data, dateFrom, dateTo);
    }
  }, [filterName, dateFrom, dateTo]);

  function applyDateFilter(records, from, to) {
    let filtered = records;
    if (from || to) {
      filtered = records.filter((r) => {
        // DateTime format: "YYYY/MM/DD hh:mm:ss AM/PM"
        const dateStr = r.dateTime.split(" ")[0]; // "YYYY/MM/DD"
        const recordDate = dateStr.replace(/\//g, "-"); // "YYYY-MM-DD"
        if (from && recordDate < from) return false;
        if (to && recordDate > to) return false;
        return true;
      });
    }
    setFilteredAttendance(filtered);
  }

  useEffect(() => {
    fetchEmployees();
    fetchLocations();
  }, [fetchEmployees, fetchLocations]);

  function showMsg(type, text) {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 3000);
  }

  // ─── Address geocoding ───
  function parseTWAddress(addr) {
    // Try to split Taiwan address like "高雄市仁武區京吉一路86號" into structured parts
    const match = addr.match(/^(.+?[市縣])(.+?[區鄉鎮市])(.+?[路街道巷弄]+.*)$/);
    if (match) {
      // Return "road district city" format for better Nominatim results
      return `${match[3]} ${match[2]} ${match[1]}`;
    }
    return addr;
  }

  async function searchNominatim(query, countrycodes = "") {
    const params = new URLSearchParams({
      format: "json",
      q: query,
      limit: "5",
      "accept-language": "zh-TW",
    });
    if (countrycodes) params.set("countrycodes", countrycodes);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { headers: { "User-Agent": "AttendanceSystem/1.0" } }
    );
    return res.json();
  }

  async function handleSearchAddress() {
    if (!locForm.address.trim()) return;
    setSearchingAddr(true);
    setLocGeo(null);
    setSearchResults([]);
    try {
      const addr = locForm.address.trim();
      const parsed = parseTWAddress(addr);

      // Try full address first
      let data = await searchNominatim(parsed, "tw");
      if (data.length === 0 && parsed !== addr) data = await searchNominatim(addr, "tw");
      if (data.length === 0) data = await searchNominatim(addr);

      // Fallback: strip building number (e.g. "86號" → "") and retry
      if (data.length === 0) {
        const stripped = addr.replace(/\d+號.*$/, "").trim();
        if (stripped && stripped !== addr) {
          const strippedParsed = parseTWAddress(stripped);
          data = await searchNominatim(strippedParsed, "tw");
          if (data.length === 0) data = await searchNominatim(stripped, "tw");
          if (data.length > 0) {
            // Mark as approximate
            data = data.map((r) => ({ ...r, approximate: true }));
          }
        }
      }

      if (data.length > 0) {
        if (data.length === 1) {
          setLocGeo({
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            displayName: data[0].display_name,
            approximate: data[0].approximate || false,
          });
        } else {
          setSearchResults(data);
        }
      } else {
        showMsg("error", "找不到此地址，請嘗試只輸入路名（例：京吉一路）");
      }
    } catch {
      showMsg("error", "地址搜尋失敗");
    }
    setSearchingAddr(false);
  }

  // ─── Employee handlers ───
  async function handleSaveEmployee(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const method = editingEmp ? "PUT" : "POST";
      const body = editingEmp
        ? { id: editingEmp, name: empForm.name, account: empForm.account, password: empForm.password, employeeRole: empForm.role }
        : { name: empForm.name, account: empForm.account, password: empForm.password, employeeRole: empForm.role };

      const res = await fetch("/api/employees", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok) {
        showMsg("success", data.message);
        setEmpForm({ name: "", account: "", password: "", role: "employee" });
        setEditingEmp(null);
        fetchEmployees();
      } else {
        showMsg("error", data.error);
      }
    } catch {
      showMsg("error", "網路錯誤");
    }
    setLoading(false);
  }

  function startEditEmployee(emp) {
    setEditingEmp(emp.id);
    setEmpForm({ name: emp.name, account: emp.account, password: emp.password, role: emp.role });
  }

  // ─── Location handlers ───
  async function handleSaveLocation(e) {
    e.preventDefault();
    if (!locGeo) {
      showMsg("error", "請先搜尋地址並確認座標");
      return;
    }
    setLoading(true);
    try {
      const method = editingLoc ? "PUT" : "POST";
      const body = {
        ...(editingLoc && { id: editingLoc }),
        name: locForm.name,
        address: locGeo.displayName,
        latitude: locGeo.lat,
        longitude: locGeo.lng,
      };

      const res = await fetch("/api/locations", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok) {
        showMsg("success", data.message);
        setLocForm({ name: "", address: "" });
        setLocGeo(null);
        setSearchResults([]);
        setEditingLoc(null);
        fetchLocations();
      } else {
        showMsg("error", data.error);
      }
    } catch {
      showMsg("error", "網路錯誤");
    }
    setLoading(false);
  }

  async function handleDeleteLocation(id) {
    if (!confirm("確定要刪除此地點？")) return;
    try {
      const res = await fetch("/api/locations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok) {
        showMsg("success", data.message);
        fetchLocations();
      } else {
        showMsg("error", data.error);
      }
    } catch {
      showMsg("error", "網路錯誤");
    }
  }

  function startEditLocation(loc) {
    setEditingLoc(loc.id);
    setLocForm({ name: loc.name, address: loc.address || "" });
    setLocGeo({ lat: loc.latitude, lng: loc.longitude, displayName: loc.address || `${loc.latitude}, ${loc.longitude}` });
  }

  function handleLogout() {
    document.cookie = "token=; path=/; max-age=0";
    router.push("/");
  }

  const tabs = [
    { key: "employees", label: "👤 員工管理" },
    { key: "locations", label: "📍 地點管理" },
    { key: "attendance", label: "📋 打卡紀錄" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">🏢 惟伊整合行銷 - 管理後台</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
            >
              前往打卡
            </button>
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition text-gray-600"
            >
              登出
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Message */}
        {msg.text && (
          <div
            className={`mb-4 px-4 py-3 rounded-lg text-sm ${
              msg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-lg p-1 shadow-sm border">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                if (t.key === "attendance") fetchAttendance();
              }}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition ${
                tab === t.key ? "bg-blue-600 text-white shadow" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ─── Employees Tab ─── */}
        {tab === "employees" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                {editingEmp ? "編輯員工" : "新增員工"}
              </h2>
              <form onSubmit={handleSaveEmployee} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="姓名"
                  value={empForm.name}
                  onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
                <input
                  type="text"
                  placeholder="帳號"
                  value={empForm.account}
                  onChange={(e) => setEmpForm({ ...empForm, account: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
                <input
                  type="text"
                  placeholder="密碼"
                  value={empForm.password}
                  onChange={(e) => setEmpForm({ ...empForm, password: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
                <select
                  value={empForm.role}
                  onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="employee">員工</option>
                  <option value="admin">管理員</option>
                </select>
                <div className="sm:col-span-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {editingEmp ? "更新" : "新增"}
                  </button>
                  {editingEmp && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEmp(null);
                        setEmpForm({ name: "", account: "", password: "", role: "employee" });
                      }}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition"
                    >
                      取消
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">姓名</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">帳號</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">密碼</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">角色</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{emp.name}</td>
                        <td className="px-4 py-3 font-mono text-gray-600">{emp.account}</td>
                        <td className="px-4 py-3 font-mono text-gray-600">{emp.password}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              emp.role === "admin"
                                ? "bg-red-100 text-red-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {emp.role === "admin" ? "管理員" : "員工"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => startEditEmployee(emp)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            編輯
                          </button>
                        </td>
                      </tr>
                    ))}
                    {employees.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                          尚無員工資料
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── Locations Tab ─── */}
        {tab === "locations" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                {editingLoc ? "編輯地點" : "新增打卡地點"}
              </h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="地點名稱（例：總公司）"
                  value={locForm.name}
                  onChange={(e) => setLocForm({ ...locForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="輸入地址搜尋（例：台北市信義區信義路五段7號）"
                    value={locForm.address}
                    onChange={(e) => {
                      setLocForm({ ...locForm, address: e.target.value });
                      setLocGeo(null);
                      setSearchResults([]);
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearchAddress(); }}}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSearchAddress}
                    disabled={searchingAddr || !locForm.address.trim()}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 whitespace-nowrap"
                  >
                    {searchingAddr ? "搜尋中..." : "🔍 搜尋地址"}
                  </button>
                </div>

                {/* Search results - multiple matches */}
                {searchResults.length > 0 && !locGeo && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="text-sm text-yellow-800 font-medium mb-2">
                      找到多個結果，請選擇：{searchResults[0]?.approximate && <span className="ml-1 font-normal text-yellow-600">（門牌號碼未找到，以路段位置代替）</span>}
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {searchResults.map((r, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setLocGeo({
                              lat: parseFloat(r.lat),
                              lng: parseFloat(r.lon),
                              displayName: r.display_name,
                            });
                            setSearchResults([]);
                          }}
                          className="w-full text-left px-3 py-2 bg-white rounded-lg border border-yellow-200 hover:bg-yellow-100 transition text-sm text-gray-700"
                        >
                          {r.display_name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Geocode result */}
                {locGeo && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-sm text-blue-800 font-medium mb-1">
                      📍 搜尋結果{locGeo.approximate && <span className="ml-2 text-yellow-600 font-normal">（門牌號碼未找到，以路段位置代替）</span>}
                    </div>
                    <div className="text-sm text-blue-700">{locGeo.displayName}</div>
                    <div className="text-xs text-blue-500 mt-1 font-mono">
                      座標：{locGeo.lat.toFixed(6)}, {locGeo.lng.toFixed(6)}
                    </div>
                    {/* Map preview */}
                    <div className="mt-3 rounded-lg overflow-hidden border border-blue-200">
                      <iframe
                        width="100%"
                        height="200"
                        style={{ border: 0 }}
                        loading="lazy"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${locGeo.lng - 0.003},${locGeo.lat - 0.002},${locGeo.lng + 0.003},${locGeo.lat + 0.002}&layer=mapnik&marker=${locGeo.lat},${locGeo.lng}`}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveLocation}
                    disabled={loading || !locForm.name || !locGeo}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {editingLoc ? "更新地點" : "新增地點"}
                  </button>
                  {editingLoc && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingLoc(null);
                        setLocForm({ name: "", address: "" });
                        setLocGeo(null);
                        setSearchResults([]);
                      }}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition"
                    >
                      取消
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">地點名稱</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">地址</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {locations.map((loc) => (
                      <tr key={loc.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{loc.name}</td>
                        <td className="px-4 py-3 text-gray-600 text-sm">{loc.address || `${loc.latitude}, ${loc.longitude}`}</td>
                        <td className="px-4 py-3 flex gap-3">
                          <button
                            onClick={() => startEditLocation(loc)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            編輯
                          </button>
                          <button
                            onClick={() => handleDeleteLocation(loc.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            刪除
                          </button>
                        </td>
                      </tr>
                    ))}
                    {locations.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                          尚未設定打卡地點
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── Attendance Tab ─── */}
        {tab === "attendance" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="依員工姓名篩選..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 whitespace-nowrap">從</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      applyDateFilter(attendance, e.target.value, dateTo);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                  <span className="text-sm text-gray-500 whitespace-nowrap">到</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      applyDateFilter(attendance, dateFrom, e.target.value);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
                <button
                  onClick={fetchAttendance}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition whitespace-nowrap"
                >
                  查詢
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">員工姓名</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">打卡地點</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">日期時間</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredAttendance.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{record.employee}</td>
                        <td className="px-4 py-3">{record.location}</td>
                        <td className="px-4 py-3 font-mono text-gray-600 text-xs">{record.dateTime}</td>
                      </tr>
                    ))}
                    {filteredAttendance.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                          尚無打卡紀錄
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
