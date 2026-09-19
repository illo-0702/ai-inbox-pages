import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "이용약관 — AI Inbox",
  description: "AI Inbox 서비스 이용약관",
  openGraph: {
    title: "이용약관 — AI Inbox",
    description: "AI Inbox 서비스 이용약관",
    type: "website",
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* 헤더 */}
        <header className="mb-12">
          <h1 className="text-3xl font-bold mb-4">이용약관</h1>
          <p className="text-gray-600">최종 수정일: 2026년 9월 19일</p>
        </header>

        {/* 주요 내용 */}
        <main className="space-y-8">
          {/* 1. 서비스 이용 약관 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">1. 서비스 개요</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              AI Inbox는 사용자가 여러 곳에서 받은 요청을 정리하고, 관계별로 연결하며, 변경사항을 추적해
              현재 해야 할 일을 관리하는 서비스입니다(이하 "서비스").
            </p>
          </section>

          {/* 2. 서비스 이용 자격 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">2. 서비스 이용 자격</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>서비스 이용을 동의하는 모든 사용자</li>
              <li>개인 목적으로 서비스를 사용하는 경우</li>
            </ul>
          </section>

          {/* 3. 서비스 제공 및 제약 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">3. 서비스 제공 범위</h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="text-lg font-semibold mb-2">제공 기능</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>요청 텍스트 입력 및 AI 분석</li>
                  <li>요청의 구조화 (발신자, 관계, 업무, 마감, 금액)</li>
                  <li>관계별 업무 그룹화 및 추적</li>
                  <li>변경사항 이력 기록</li>
                  <li>현재 해야 할 일 목록 조회</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">제공되지 않는 기능</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>송금, 메일 발송 등 실제 업무 실행</li>
                  <li>자동 메시지 수집 (향후 확장 예정)</li>
                  <li>팀 협업 및 공유 기능</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 4. 사용자 책임 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">4. 사용자의 의무</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>정확한 정보 입력</li>
              <li>서비스 이용 중 본인의 행동에 대한 책임</li>
              <li>타인의 개인정보 무단 입력 금지</li>
              <li>불법 목적의 서비스 이용 금지</li>
            </ul>
          </section>

          {/* 5. 서비스 가용성 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">5. 서비스 가용성 및 제약</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>세션 만료:</strong> 사용자의 세션 데이터는 24시간 보관되며 자동으로 삭제됩니다.
              </p>
              <p>
                <strong>서비스 중단:</strong> 유지보수 및 기술적 사유로 서비스가 일시적으로 중단될 수
                있습니다.
              </p>
              <p>
                <strong>AI 분석의 한계:</strong> AI 분석 결과는 참고용이며, 사용자가 최종 확인 및 판단을
                해야 합니다.
              </p>
            </div>
          </section>

          {/* 6. 제한된 책임 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">6. 제한된 책임</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              본 서비스는 "있는 그대로" 제공되며, 상품성, 특정 목적에 대한 적합성, 비침해성에 대해 명시
              또는 묵시적 보증을 제공하지 않습니다.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              AI 분석 결과의 정확성, 타이밍, 완성도에 대해 책임지지 않습니다. 사용자는 서비스 이용으로
              인한 손해에 대해 본인이 책임집니다.
            </p>
          </section>

          {/* 7. 약관 변경 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">7. 약관 변경</h2>
            <p className="text-gray-700 leading-relaxed">
              본 이용약관은 필요에 따라 변경될 수 있습니다. 주요 변경 사항은 서비스 내에 공지하며, 계속
              사용하면 변경된 약관에 동의한 것으로 간주합니다.
            </p>
          </section>

          {/* 8. 약관 위반 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">8. 약관 위반 시 조치</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              본 약관을 위반하는 경우, 운영진은 사전 통지 없이 해당 사용자의 서비스 이용을 제한할 수
              있습니다.
            </p>
          </section>
        </main>

        {/* 푸터 링크 */}
        <footer className="mt-16 pt-8 border-t border-gray-200">
          <nav className="flex gap-6 text-sm">
            <Link href="/privacy" className="text-blue-600 hover:underline">
              개인정보처리방침
            </Link>
            <Link href="/security" className="text-blue-600 hover:underline">
              보안 안내
            </Link>
            <Link href="/" className="text-blue-600 hover:underline">
              홈으로
            </Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
