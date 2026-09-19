import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "보안 안내 — AI Inbox",
  description: "AI Inbox의 보안 정책 및 데이터 보호 안내",
  openGraph: {
    title: "보안 안내 — AI Inbox",
    description: "AI Inbox의 보안 정책 및 데이터 보호 안내",
    type: "website",
  },
};

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* 헤더 */}
        <header className="mb-12">
          <h1 className="text-3xl font-bold mb-4">보안 안내</h1>
          <p className="text-gray-600">최종 수정일: 2026년 9월 19일</p>
        </header>

        {/* 주요 내용 */}
        <main className="space-y-8">
          {/* 1. 보안 원칙 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">1. 보안 원칙</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              AI Inbox는 사용자 데이터 보호를 최우선으로 삼으며, 다음과 같은 보안 원칙을 준수합니다:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>최소 수집 원칙: 필요한 데이터만 수집</li>
              <li>단기 보관 정책: 입력 원문은 분석 후 즉시 삭제</li>
              <li>구조화 데이터만 저장: 업체명, 마감, 금액 등 필수 정보만 보관</li>
              <li>세션 격리: 사용자 간 데이터 접근 불가</li>
            </ul>
          </section>

          {/* 2. 전송 보안 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">2. 전송 보안</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>HTTPS 암호화:</strong> 모든 통신은 TLS(HTTPS)를 통해 암호화됩니다. 평문으로 전송되는
                데이터는 없습니다.
              </p>
              <p>
                <strong>세션 관리:</strong> 추측하기 어려운 세션 식별자를 사용하며, 서버에서 접근을
                검증합니다.
              </p>
            </div>
          </section>

          {/* 3. 저장소 보안 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">3. 저장소 보안</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>저장소 암호화:</strong> 사용자 데이터는 암호화되어 저장됩니다.
              </p>
              <p>
                <strong>API 키 관리:</strong> 외부 서비스 호출에 사용되는 API 키는 서버에서만 관리되며,
                클라이언트에 노출되지 않습니다.
              </p>
              <p>
                <strong>데이터 격리:</strong> 각 세션의 데이터는 분리되어 저장되며, 다른 사용자가 접근할
                수 없습니다.
              </p>
            </div>
          </section>

          {/* 4. 로깅 및 모니터링 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">4. 로깅 및 모니터링</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>접근 로그:</strong> 요청 ID, 시각, 지연, 오류 코드 등 기술적 정보만 기록됩니다.
              </p>
              <p>
                <strong>민감 정보 제외:</strong> 로그에는 원문, 파일, 금액, API 키 등 민감 정보가 포함되지
                않습니다.
              </p>
              <p>
                <strong>모니터링:</strong> 비정상적인 접근 시도를 감지하고 방어합니다.
              </p>
            </div>
          </section>

          {/* 5. 데이터 삭제 정책 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">5. 데이터 삭제 정책</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>자동 삭제:</strong> 세션 데이터는 24시간 후 자동 삭제됩니다.
              </p>
              <p>
                <strong>사용자 요청 삭제:</strong> 사용자는 언제든 [데모 데이터 삭제] 버튼으로 즉시 데이터를
                삭제할 수 있습니다.
              </p>
              <p>
                <strong>완전 삭제:</strong> 삭제 요청 시 관계, 담당자, 업무, 제안, 이력이 모두 제거됩니다.
              </p>
              <p className="text-sm text-gray-600 mt-4">
                주의: 백업을 사용하는 경우, 삭제 반영에 시간이 걸릴 수 있습니다. 즉시 완전 삭제를
                보장하지 않습니다.
              </p>
            </div>
          </section>

          {/* 6. 외부 AI 서비스 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">6. 외부 AI 서비스 보안</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              텍스트 구조화를 위해 사용하는 외부 AI 서비스는 자체 보안 정책을 따릅니다. 입력 원문은
              분석 목적으로만 전달되며, 각 공급자의 개인정보처리방침이 적용됩니다.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              본 서비스는 외부 공급자의 데이터 보존 정책을 완전히 제어할 수 없습니다. 자세한 내용은 해당
              공급자의 보안 정책을 참고하시기 바랍니다.
            </p>
          </section>

          {/* 7. 보안 취약점 신고 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">7. 보안 취약점 신고</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              보안 취약점을 발견하신 경우, 공개하지 말고 운영진에게 직접 신고해 주시기 바랍니다. 신고하신
              사항을 검토한 뒤 적절한 조치를 취하겠습니다.
            </p>
          </section>

          {/* 8. 컴플라이언스 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">8. 컴플라이언스</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>법규 준수:</strong> 대한민국의 개인정보 보호법, 정보통신망 이용촉진 및 정보보호
                등에 관한 법률을 준수합니다.
              </p>
              <p>
                <strong>국제 표준:</strong> OWASP, NIST 등 보안 표준을 참고하여 보안을 강화합니다.
              </p>
            </div>
          </section>

          {/* 9. 정책 변경 */}
          <section>
            <h2 className="text-2xl font-bold mb-4">9. 정책 변경</h2>
            <p className="text-gray-700 leading-relaxed">
              본 보안 정책은 서비스 개선 및 보안 사건에 대응하기 위해 변경될 수 있습니다. 주요 변경 사항은
              서비스 내에 공지합니다.
            </p>
          </section>
        </main>

        {/* 푸터 링크 */}
        <footer className="mt-16 pt-8 border-t border-gray-200">
          <nav className="flex gap-6 text-sm">
            <Link href="/privacy" className="text-blue-600 hover:underline">
              개인정보처리방침
            </Link>
            <Link href="/terms" className="text-blue-600 hover:underline">
              이용약관
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
