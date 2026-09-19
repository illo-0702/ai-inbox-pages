import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Inbox — 흩어진 연락을 지금 해야 할 일로",
  description:
    "여러 곳에서 받은 요청을 관계별로 연결하고 변경사항을 추적해 지금 해야 할 일을 보여주는 개인 AI Inbox.",
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return children;
}
