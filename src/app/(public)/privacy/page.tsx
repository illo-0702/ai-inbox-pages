import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보처리방침 — AI Inbox",
  description: "AI Inbox의 개인정보 수집, 이용, 보관 및 삭제 정책",
  openGraph: {
    title: "개인정보처리방침 — AI Inbox",
    description: "AI Inbox의 개인정보 수집, 이용, 보관 및 삭제 정책",
    type: "website",
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* 헤더 */}
        <header className="mb-12">
          <h1 className="text-3xl font-bold mb-4">개인정보처리방침</h1>
          <p className="text-gray-600">최종 수정일: 2026년 9월 19일</p>
        </header>

        {/* 주요 내용 */}
        <main className="space-y-8">
          {/* 1. 개요 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">1. 개요</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              AI Inbox(이하 "서비스")는 사용자의 개인정보를 보호하고 관련 법규를 준수하기 위해 다음과
              같은 개인정보처리방침을 수립합니다.
            </p>
          </section>

          {/* 2. 수집하는 개인정보 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">2. 수집하는 개인정보</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">필수 정보</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>세션 식별자 (Session ID)</li>
                  <li>서비스 이용 기록</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">선택 정보</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>
                    입력하신 요청 내용 (분석 목적으로만 사용하며, 구조화 후 즉시 삭제)
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3. 정보 이용 목적 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">3. 정보 이용 목적</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>서비스 제공 및 개선</li>
              <li>사용자 요청 분석 및 처리</li>
              <li>서비스 이용 분석 및 통계</li>
              <li>보안 및 부정행위 방지</li>
            </ul>
          </section>

          {/* 4. 정보 보관 및 삭제 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">4. 정보 보관 및 삭제</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>세션 데이터:</strong> 24시간 보관 후 자동 삭제되며, 사용자가 [데모 데이터 삭제]
                버튼으로 즉시 삭제할 수 있습니다.
              </p>
              <p>
                <strong>입력 원문:</strong> 분석 목적으로만 사용하며, 구조화 완료 후 서버에 저장하지
                않습니다. 현재 분석 세션 내에서만 확인 가능합니다.
              </p>
              <p>
                <strong>구조화된 데이터:</strong> 서비스 이용에 필요한 최소 필드(업체명, 마감, 금액 등)만
                저장합니다.
              </p>
            </div>
          </section>

          {/* 5. 외부 서비스 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">5. 외부 AI 서비스 이용</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              본 서비스는 텍스트 구조화를 위해 외부 AI 서비스를 이용합니다. 입력하신 요청 내용은 분석
              목적으로만 전달되며, 각 공급자의 개인정보처리방침이 적용됩니다. 자세한 내용은 해당
              공급자의 정책을 참고하시기 바랍니다.
            </p>
          </section>

          {/* 6. 사용자 권리 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">6. 사용자 권리</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>서비스 이용 중 언제든 데이터 삭제 요청 가능</li>
              <li>세션 만료 시 자동 삭제</li>
              <li>개인정보 처리에 대한 문의는 서비스 운영진에게 연락</li>
            </ul>
          </section>

          {/* 7. 정책 변경 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">7. 정책 변경</h2>
            <p className="text-gray-700 leading-relaxed">
              본 개인정보처리방침은 서비스 개선 및 법규 변경에 따라 변경될 수 있습니다. 주요 변경 사항은
              서비스 내에 공지합니다.
            </p>
          </section>
        </main>

        {/* 푸터 링크 */}
        <footer className="mt-16 pt-8 border-t border-gray-200">
          <nav className="flex gap-6 text-sm">
            <Link href="/terms" className="text-blue-600 hover:underline">
              이용약관
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
