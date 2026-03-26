"use client";

import { useState, useEffect, useCallback } from "react";
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-xl font-bold text-gray-800">🏢 惟伊整合行銷</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="text-sm px-3 py-2 bg-white rounded-lg shadow hover:shadow-md transition text-gray-600"
            >
              修改密碼
            </button>
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-2 bg-white rounded-lg shadow hover:shadow-md transition text-gray-600"
            >
              登出
            </button>
          </div>
        </div>

        {/* Clock In Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">⏰</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">上班打卡</h2>
          <p className="text-gray-500 mb-8">點擊下方按鈕完成打卡</p>

          <button
            onClick={handleClockIn}
            disabled={status === "loading"}
            className="w-48 h-48 mx-auto rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center active:scale-95"
          >
            {status === "loading" ? (
              <span className="animate-pulse">定位中...</span>
            ) : (
              "打卡"
            )}
          </button>

          {/* Result Message */}
          {status && status !== "loading" && (
            <div
              className={`mt-8 p-4 rounded-xl ${
                status === "success"
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div
                className={`text-lg font-bold ${
                  status === "success" ? "text-green-700" : "text-red-700"
                }`}
              >
                {status === "success" ? "✅ " : "❌ "}
                {message}
              </div>
              {detail && (
                <div
                  className={`mt-2 text-sm whitespace-pre-line ${
                    status === "success" ? "text-green-600" : "text-red-600"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4">修改密碼</h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">目前密碼</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">新密碼</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              {pwMsg.text && (
                <div
                  className={`text-sm px-3 py-2 rounded-lg ${
                    pwMsg.type === "success"
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {pwMsg.text}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
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
