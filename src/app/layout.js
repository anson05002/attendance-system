import "./globals.css";

export const metadata = {
  title: "惟伊整合行銷打卡系統",
  description: "惟伊整合行銷公司打卡系統",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
