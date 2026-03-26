"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

// ─── Device helper ───
function getDeviceInfo() {
  const ua = navigator.userAgent;
  let os = "";
  let browser = "";

  if (/iPhone/.test(ua)) {
    const v = ua.match(/iPhone OS ([0-9_]+)/);
    os = v ? `iPhone (iOS ${v[1].replace(/_/g, ".")})` : "iPhone";
  } else if (/iPad/.test(ua)) {
    os = "iPad";
  } else if (/Android/.test(ua)) {
    const v = ua.match(/Android ([0-9.]+)/);
    const model = ua.match(/Android [0-9.]+; ([^)]+)\)/);
    os = v ? `Android ${v[1]}${model ? " / " + model[1].trim() : ""}` : "Android";
  } else if (/Windows/.test(ua)) {
    os = "Windows";
  } else if (/Mac OS X/.test(ua)) {
    os = "Mac";
  } else {
    os = "未知裝置";
  }

  if (/CriOS/.test(ua)) browser = "Chrome";
  else if (/FxiOS/.test(ua)) browser = "Firefox";
  else if (/EdgiOS/.test(ua)) browser = "Edge";
  else if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua)) browser = "Safari";
  else browser = "瀏覽器";

  return `${os} / ${browser}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState("clockin");
  const [userName, setUserName] = useState("");
  const [status, setStatus] = useState(null); // null | 'success' | 'error' | 'loading'
  const [message, setMessage] = useState("");
  const [detail, setDetail] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwMsg, setPwMsg] = useState({ type: "", text: "" });
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // Fetch current user info
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserName(d.name || ""))
      .catch(() => {});
  }, []);

  const fetchRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const res = await fetch("/api/clock-in");
      if (res.ok) setRecords(await res.json());
    } catch {
      // ignore
    }
    setRecordsLoading(false);
  }, []);

  const handleClockIn = useCallback(async () => {
    setStatus("loading");
    setMessage("正在取得定位...");
    setDetail("");

    if (!navigator.geolocation) {
      setStatus("error");
      setMessage("您的瀏覽器不支援定位功能");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setMessage("正在打卡...");

        const device = getDeviceInfo();

        try {
          const res = await fetch("/api/clock-in", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude, longitude, device }),
          });
          const data = await res.json();

          if (res.ok) {
            setStatus("success");
            setMessage("打卡成功！");
            setDetail(`地點：${data.location}\n時間：${data.dateTime}`);
          } else {
            setStatus("error");
            setMessage(data.error);
          }
        } catch {
          setStatus("error");
          setMessage("網路錯誤，請稍後再試");
        }
      },
      (err) => {
        setStatus("error");
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setMessage("請開啟定位權限");
            setDetail("請在瀏覽器設定中允許此網站存取您的位置");
            break;
          case err.POSITION_UNAVAILABLE:
            setMessage("無法取得定位資訊");
            break;
          case err.TIMEOUT:
            setMessage("定位逾時，請重試");
            break;
          default:
            setMessage("定位發生未知錯誤");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwMsg({ type: "", text: "" });
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwMsg({ type: "success", text: "密碼已更新！" });
        setCurrentPassword("");
        setNewPassword("");
        setTimeout(() => setShowPasswordModal(false), 1500);
      } else {
        setPwMsg({ type: "error", text: data.error });
      }
    } catch {
      setPwMsg({ type: "error", text: "網路錯誤" });
    }
  }

  const bgStyle = { background: "linear-gradient(135deg, #dbeafe 0%, #bae6fd 40%, #cffafe 100%)" };
  const gridStyle = {
    backgroundImage:
      "linear-gradient(rgba(14,165,233,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.07) 1px, transparent 1px)",
    backgroundSize: "48px 48px",
  };
  const cardStyle = { boxShadow: "0 8px 48px rgba(14,165,233,0.15), 0 2px 12px rgba(14,165,233,0.08)" };
  const btnGradient = { background: "linear-gradient(135deg, #3b82f6, #06b6d4)" };

  return (
    <div className="min-h-screen relative overflow-hidden" style={bgStyle}>
      {/* Grid pattern */}
      <div className="absolute inset-0 pointer-events-none" style={gridStyle} />
      <div
        className="absolute top-0 right-0 w-80 h-80 pointer-events-none"
        style={{ background: "radial-gradient(circle at top right, rgba(56,189,248,0.2) 0%, transparent 65%)" }}
      />
      <div
        className="absolute bottom-0 left-0 w-80 h-80 pointer-events-none"
        style={{ background: "radial-gradient(circle at bottom left, rgba(34,211,238,0.15) 0%, transparent 65%)" }}
      />

      <div className="relative max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="text-xs font-semibold text-sky-500 tracking-widest uppercase mb-0.5">惟伊整合行銷</div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-bold text-slate-800">
                {userName ? `${userName}，您好` : "員工打卡系統"}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="text-sm px-4 py-2 bg-white/80 backdrop-blur-sm border border-sky-200 rounded-xl hover:bg-white transition text-slate-600 shadow-sm"
          >
            修改密碼
          </button>
        </div>

        {/* Tab navigation */}
        <div
          className="flex gap-1 mb-6 bg-white/80 backdrop-blur-sm rounded-2xl p-1.5 border border-sky-100"
          style={{ boxShadow: "0 2px 12px rgba(14,165,233,0.08)" }}
        >
          <button
            onClick={() => setTab("clockin")}
            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200"
            style={tab === "clockin" ? { ...btnGradient, color: "white", boxShadow: "0 4px 12px rgba(59,130,246,0.35)" } : { color: "#64748b" }}
          >
            打卡
          </button>
          <button
            onClick={() => {
              setTab("records");
              fetchRecords();
            }}
            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200"
            style={tab === "records" ? { ...btnGradient, color: "white", boxShadow: "0 4px 12px rgba(59,130,246,0.35)" } : { color: "#64748b" }}
          >
            打卡紀錄
          </button>
        </div>

        {/* ─── Clock In Tab ─── */}
        {tab === "clockin" && (
          <div
            className="bg-white/85 backdrop-blur-md rounded-3xl border border-sky-200/60 p-10 text-center"
            style={cardStyle}
          >
            <p className="text-xs font-semibold text-sky-400 tracking-widest uppercase mb-1">CLOCK IN</p>
            <h2 className="text-2xl font-bold text-slate-800 mb-10">上班打卡</h2>

            {/* Glowing button */}
            <div className="relative inline-flex items-center justify-center mb-10">
              <div
                className="absolute rounded-full"
                style={{
                  width: "200px",
                  height: "200px",
                  background: "radial-gradient(circle, rgba(56,189,248,0.25) 0%, transparent 70%)",
                }}
              />
              <button
                onClick={handleClockIn}
                disabled={status === "loading"}
                className="relative w-44 h-44 rounded-full text-white font-bold transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 flex flex-col items-center justify-center"
                style={{
                  background:
                    status === "loading"
                      ? "linear-gradient(135deg, #60a5fa, #22d3ee)"
                      : "linear-gradient(135deg, #3b82f6, #06b6d4)",
                  boxShadow:
                    status === "loading"
                      ? "0 0 24px rgba(14,165,233,0.3)"
                      : "0 0 48px rgba(14,165,233,0.5), 0 8px 24px rgba(59,130,246,0.4)",
                }}
              >
                {status === "loading" ? (
                  <span className="text-sm animate-pulse">定位中...</span>
                ) : (
                  <span className="text-4xl font-bold tracking-wider">打卡</span>
                )}
              </button>
            </div>

            <p className="text-slate-400 text-sm">點擊按鈕完成打卡，請確認已開啟定位權限</p>

            {/* Result Message */}
            {status && status !== "loading" && (
              <div
                className={`mt-6 p-4 rounded-2xl border ${
                  status === "success" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                }`}
              >
                <div className={`text-base font-bold ${status === "success" ? "text-emerald-700" : "text-red-700"}`}>
                  {status === "success" ? "✅ " : "❌ "}
                  {message}
                </div>
                {detail && (
                  <div
                    className={`mt-2 text-sm whitespace-pre-line ${
                      status === "success" ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {detail}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Records Tab ─── */}
        {tab === "records" && (
          <div
            className="bg-white/85 backdrop-blur-md rounded-3xl border border-sky-200/60 overflow-hidden"
            style={cardStyle}
          >
            <div className="px-6 py-5 border-b border-sky-100">
              <p className="text-xs font-semibold text-sky-400 tracking-widest uppercase mb-0.5">MY RECORDS</p>
              <h2 className="text-lg font-bold text-slate-800">我的打卡紀錄</h2>
            </div>

            {recordsLoading ? (
              <div className="py-16 text-center text-slate-400 text-sm">載入中...</div>
            ) : records.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">尚無打卡紀錄</div>
            ) : (
              <div className="divide-y divide-sky-50 max-h-[60vh] overflow-y-auto">
                {records.map((r) => (
                  <div key={r.id} className="px-6 py-4 hover:bg-sky-50/40 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm font-semibold text-slate-700 mb-1">{r.dateTime}</div>
                        <div className="flex items-center gap-1.5 text-sky-600 text-sm font-medium mb-2">
                          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="truncate">{r.location}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {r.device && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              {r.device}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4 z-50">
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm border border-sky-100"
            style={{ boxShadow: "0 8px 40px rgba(14,165,233,0.2)" }}
          >
            <h3 className="text-lg font-bold text-slate-800 mb-4">修改密碼</h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  目前密碼
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-sky-200 rounded-xl bg-sky-50/50 focus:ring-2 focus:ring-sky-300 outline-none text-slate-700"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  新密碼
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-sky-200 rounded-xl bg-sky-50/50 focus:ring-2 focus:ring-sky-300 outline-none text-slate-700"
                  required
                />
              </div>
              {pwMsg.text && (
                <div
                  className={`text-sm px-3 py-2 rounded-xl ${
                    pwMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {pwMsg.text}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition text-sm font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition"
                  style={btnGradient}
                >
                  確認
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
