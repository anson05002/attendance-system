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
        const dateStr = r.dateTime.split(" ")[0];
        const recordDate = dateStr.replace(/\//g, "-");
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

  // ─── Address geocoding (Google Maps) ───
  async function handleSearchAddress() {
    if (!locForm.address.trim()) return;
    setSearchingAddr(true);
    setLocGeo(null);
    setSearchResults([]);
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(locForm.address.trim())}`);
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        if (data.results.length === 1) {
          setLocGeo(data.results[0]);
        } else {
          setSearchResults(data.results);
        }
      } else {
        showMsg("error", "找不到此地址，請確認地址是否正確");
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
    { key: "employees", label: "員工管理" },
    { key: "locations", label: "地點管理" },
    { key: "attendance", label: "打卡紀錄" },
  ];

  const inputCls =
    "w-full px-3 py-2.5 border border-sky-200 rounded-xl bg-sky-50/40 focus:ring-2 focus:ring-sky-300 focus:border-sky-400 outline-none transition text-slate-700 placeholder-slate-400 text-sm";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header
        className="bg-white border-b border-sky-100"
        style={{ boxShadow: "0 2px 12px rgba(14,165,233,0.08)" }}
      >
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div>
              <div className="text-xs text-sky-500 font-semibold tracking-widest uppercase leading-none">
                惟伊整合行銷
              </div>
              <div className="text-base font-bold text-slate-800 leading-tight">管理後台</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm px-4 py-2 rounded-xl border border-sky-200 text-sky-600 hover:bg-sky-50 transition font-medium"
            >
              前往打卡
            </button>
            <button
              onClick={handleLogout}
              className="text-sm px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition font-medium"
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
            className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium border ${
              msg.type === "success"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-2xl p-1.5 border border-sky-100" style={{ boxShadow: "0 2px 12px rgba(14,165,233,0.08)" }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                if (t.key === "attendance") fetchAttendance();
              }}
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200"
              style={
                tab === t.key
                  ? {
                      background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
                      color: "white",
                      boxShadow: "0 4px 12px rgba(59,130,246,0.35)",
                    }
                  : { color: "#64748b" }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ─── Employees Tab ─── */}
        {tab === "employees" && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-sky-100 p-6" style={{ boxShadow: "0 2px 12px rgba(14,165,233,0.07)" }}>
              <h2 className="text-base font-bold text-slate-800 mb-4">
                {editingEmp ? "編輯員工" : "新增員工"}
              </h2>
              <form onSubmit={handleSaveEmployee} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="姓名"
                  value={empForm.name}
                  onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                  className={inputCls}
                  required
                />
                <input
                  type="text"
                  placeholder="帳號"
                  value={empForm.account}
                  onChange={(e) => setEmpForm({ ...empForm, account: e.target.value })}
                  className={inputCls}
                  required
                />
                <input
                  type="text"
                  placeholder="密碼"
                  value={empForm.password}
                  onChange={(e) => setEmpForm({ ...empForm, password: e.target.value })}
                  className={inputCls}
                  required
                />
                <select
                  value={empForm.role}
                  onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}
                  className={inputCls}
                >
                  <option value="employee">員工</option>
                  <option value="admin">管理員</option>
                </select>
                <div className="sm:col-span-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition"
                    style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
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
                      className="px-6 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition text-sm font-medium"
                    >
                      取消
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="bg-white rounded-2xl border border-sky-100 overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(14,165,233,0.07)" }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "linear-gradient(135deg, #f0f9ff, #e0f2fe)" }}>
                      <th className="text-left px-4 py-3 font-semibold text-sky-700">姓名</th>
                      <th className="text-left px-4 py-3 font-semibold text-sky-700">帳號</th>
                      <th className="text-left px-4 py-3 font-semibold text-sky-700">密碼</th>
                      <th className="text-left px-4 py-3 font-semibold text-sky-700">角色</th>
                      <th className="text-left px-4 py-3 font-semibold text-sky-700">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-50">
                    {employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-sky-50/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{emp.name}</td>
                        <td className="px-4 py-3 font-mono text-slate-600 text-xs">{emp.account}</td>
                        <td className="px-4 py-3 font-mono text-slate-600 text-xs">{emp.password}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              emp.role === "admin"
                                ? "bg-violet-100 text-violet-700"
                                : "bg-sky-100 text-sky-700"
                            }`}
                          >
                            {emp.role === "admin" ? "管理員" : "員工"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => startEditEmployee(emp)}
                            className="text-sky-500 hover:text-sky-700 text-sm font-medium transition"
                          >
                            編輯
                          </button>
                        </td>
                      </tr>
                    ))}
                    {employees.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
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
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-sky-100 p-6" style={{ boxShadow: "0 2px 12px rgba(14,165,233,0.07)" }}>
              <h2 className="text-base font-bold text-slate-800 mb-4">
                {editingLoc ? "編輯地點" : "新增打卡地點"}
              </h2>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="地點名稱（例：總公司）"
                  value={locForm.name}
                  onChange={(e) => setLocForm({ ...locForm, name: e.target.value })}
                  className={inputCls}
                  required
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="輸入地址搜尋（例：高雄市仁武區京吉一路86號）"
                    value={locForm.address}
                    onChange={(e) => {
                      setLocForm({ ...locForm, address: e.target.value });
                      setLocGeo(null);
                      setSearchResults([]);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSearchAddress();
                      }
                    }}
                    className={`flex-1 ${inputCls}`}
                    style={{ width: "auto" }}
                  />
                  <button
                    type="button"
                    onClick={handleSearchAddress}
                    disabled={searchingAddr || !locForm.address.trim()}
                    className="px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 whitespace-nowrap transition"
                    style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
                  >
                    {searchingAddr ? "搜尋中..." : "搜尋地址"}
                  </button>
                </div>

                {/* Search results - multiple matches */}
                {searchResults.length > 0 && !locGeo && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="text-sm text-amber-800 font-semibold mb-2">找到多個結果，請選擇：</div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {searchResults.map((r, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setLocGeo({
                              lat: r.lat,
                              lng: r.lng,
                              displayName: r.displayName,
                            });
                            setSearchResults([]);
                          }}
                          className="w-full text-left px-3 py-2 bg-white rounded-lg border border-amber-200 hover:bg-amber-50 transition text-sm text-slate-700"
                        >
                          {r.displayName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Geocode result */}
                {locGeo && (
                  <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
                    <div className="text-xs font-semibold text-sky-600 uppercase tracking-wider mb-1">搜尋結果</div>
                    <div className="text-sm text-slate-700">{locGeo.displayName}</div>
                    <div className="text-xs text-sky-500 mt-1 font-mono">
                      座標：{locGeo.lat.toFixed(6)}, {locGeo.lng.toFixed(6)}
                    </div>
                    <div className="mt-3 rounded-xl overflow-hidden border border-sky-200">
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
                    className="px-6 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition"
                    style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
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
                      className="px-6 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition text-sm font-medium"
                    >
                      取消
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-sky-100 overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(14,165,233,0.07)" }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "linear-gradient(135deg, #f0f9ff, #e0f2fe)" }}>
                      <th className="text-left px-4 py-3 font-semibold text-sky-700">地點名稱</th>
                      <th className="text-left px-4 py-3 font-semibold text-sky-700">地址</th>
                      <th className="text-left px-4 py-3 font-semibold text-sky-700">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-50">
                    {locations.map((loc) => (
                      <tr key={loc.id} className="hover:bg-sky-50/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{loc.name}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{loc.address || `${loc.latitude}, ${loc.longitude}`}</td>
                        <td className="px-4 py-3 flex gap-3">
                          <button
                            onClick={() => startEditLocation(loc)}
                            className="text-sky-500 hover:text-sky-700 text-sm font-medium transition"
                          >
                            編輯
                          </button>
                          <button
                            onClick={() => handleDeleteLocation(loc.id)}
                            className="text-red-400 hover:text-red-600 text-sm font-medium transition"
                          >
                            刪除
                          </button>
                        </td>
                      </tr>
                    ))}
                    {locations.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-10 text-center text-slate-400">
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
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-sky-100 p-4" style={{ boxShadow: "0 2px 12px rgba(14,165,233,0.07)" }}>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className={`flex-1 ${inputCls}`}
                  style={{ width: "auto" }}
                >
                  <option value="">全部員工</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.name}>{emp.name}</option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400 whitespace-nowrap">從</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      applyDateFilter(attendance, e.target.value, dateTo);
                    }}
                    className={inputCls}
                    style={{ width: "auto" }}
                  />
                  <span className="text-sm text-slate-400 whitespace-nowrap">到</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      applyDateFilter(attendance, dateFrom, e.target.value);
                    }}
                    className={inputCls}
                    style={{ width: "auto" }}
                  />
                </div>
                <button
                  onClick={fetchAttendance}
                  className="px-6 py-2 rounded-xl text-white text-sm font-semibold whitespace-nowrap transition"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
                >
                  查詢
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-sky-100 overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(14,165,233,0.07)" }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "linear-gradient(135deg, #f0f9ff, #e0f2fe)" }}>
                      <th className="text-left px-4 py-3 font-semibold text-sky-700">員工姓名</th>
                      <th className="text-left px-4 py-3 font-semibold text-sky-700">打卡地點</th>
                      <th className="text-left px-4 py-3 font-semibold text-sky-700">日期時間</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-50">
                    {filteredAttendance.map((record) => (
                      <tr key={record.id} className="hover:bg-sky-50/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{record.employee}</td>
                        <td className="px-4 py-3 text-slate-600">{record.location}</td>
                        <td className="px-4 py-3 font-mono text-slate-500 text-xs">{record.dateTime}</td>
                      </tr>
                    ))}
                    {filteredAttendance.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-10 text-center text-slate-400">
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
