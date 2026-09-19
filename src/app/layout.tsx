import type { Metadata } from "next";
import "./globals.css";
import { LayoutWrapper } from "./layout-wrapper";

export const metadata: Metadata = {
  metadataBase: new URL("https://ai-inbox.example.com"),
  title: "AI Inbox — 흩어진 연락을 지금 해야 할 일로",
  description:
    "여러 곳에서 받은 요청을 관계별로 연결하고 변경사항을 추적해 지금 해야 할 일을 보여주는 개인 AI Inbox.",
  keywords: ["AI Inbox", "업무 관리", "요청 정리", "할일 관리", "AI"],
  authors: [{ name: "AI Inbox" }],
  creator: "AI Inbox",
  publisher: "AI Inbox",
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://ai-inbox.example.com",
    siteName: "AI Inbox",
    title: "AI Inbox — 흩어진 연락을 지금 해야 할 일로",
    description:
      "여러 곳에서 받은 요청을 관계별로 연결하고 변경사항을 추적해 지금 해야 할 일을 보여주는 개인 AI Inbox.",
    images: [
      {
        url: "https://ai-inbox.example.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "AI Inbox",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Inbox — 흩어진 연락을 지금 해야 할 일로",
    description:
      "여러 곳에서 받은 요청을 관계별로 연결하고 변경사항을 추적해 지금 해야 할 일을 보여주는 개인 AI Inbox.",
    images: ["https://ai-inbox.example.com/og-image.png"],
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    minimumScale: 1,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AI Inbox" />
        <link rel="canonical" href="https://ai-inbox.example.com/" />
        <link rel="manifest" href="/manifest.json" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
