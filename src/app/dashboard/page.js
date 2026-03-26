"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [status, setStatus] = useState(null); // null | 'success' | 'error' | 'loading'
  const [message, setMessage] = useState("");
  const [detail, setDetail] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwMsg, setPwMsg] = useState({ type: "", text: "" });

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

        try {
          const res = await fetch("/api/clock-in", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude, longitude }),
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

  function handleLogout() {
    document.cookie = "token=; path=/; max-age=0";
    router.push("/");
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #dbeafe 0%, #bae6fd 40%, #cffafe 100%)" }}
    >
      {/* Tech grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(14,165,233,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.07) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Glow orbs */}
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
        <div className="flex justify-between items-center mb-10">
          <div>
            <div className="text-xs font-semibold text-sky-500 tracking-widest uppercase mb-0.5">惟伊整合行銷</div>
            <div className="text-lg font-bold text-slate-800">員工打卡系統</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="text-sm px-4 py-2 bg-white/80 backdrop-blur-sm border border-sky-200 rounded-xl hover:bg-white transition text-slate-600 shadow-sm"
            >
              修改密碼
            </button>
            <button
              onClick={handleLogout}
              className="text-sm px-4 py-2 bg-white/80 backdrop-blur-sm border border-sky-200 rounded-xl hover:bg-white transition text-slate-600 shadow-sm"
            >
              登出
            </button>
          </div>
        </div>

        {/* Clock In Card */}
        <div
          className="bg-white/85 backdrop-blur-md rounded-3xl border border-sky-200/60 p-10 text-center"
          style={{ boxShadow: "0 8px 48px rgba(14,165,233,0.15), 0 2px 12px rgba(14,165,233,0.08)" }}
        >
          <p className="text-xs font-semibold text-sky-400 tracking-widest uppercase mb-1">CLOCK IN</p>
          <h2 className="text-2xl font-bold text-slate-800 mb-10">上班打卡</h2>

          {/* Glowing button */}
          <div className="relative inline-flex items-center justify-center mb-10">
            {/* Pulse ring */}
            <div
              className="absolute rounded-full"
              style={{
                width: "200px",
                height: "200px",
                background: "radial-gradient(circle, rgba(56,189,248,0.25) 0%, transparent 70%)",
                animation: status === "loading" ? "none" : "pulse 2s infinite",
              }}
            />
            <button
              onClick={handleClockIn}
              disabled={status === "loading"}
              className="relative w-44 h-44 rounded-full text-white font-bold transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 flex flex-col items-center justify-center gap-0"
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
                status === "success"
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div
                className={`text-base font-bold ${
                  status === "success" ? "text-emerald-700" : "text-red-700"
                }`}
              >
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
                  style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
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
