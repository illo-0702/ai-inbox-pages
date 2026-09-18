"use client";

// 입력 방식 탭 [텍스트] [PDF] [이미지]. 미구현 입력 방식은 사용 가능한 기능처럼 보이지 않도록
// imageEnabled=false면 비활성 + 보조 문구를 보여준다(기획서 5.2).
export type SourceTab = "text" | "pdf" | "image";

const TAB_LABEL: Record<SourceTab, string> = { text: "텍스트", pdf: "PDF", image: "이미지" };
const TABS: SourceTab[] = ["text", "pdf", "image"];

export function SourceTabs({
  active,
  onChange,
  imageEnabled,
  locked = false,
}: {
  active: SourceTab;
  onChange: (tab: SourceTab) => void;
  imageEnabled: boolean;
  /** 업로드 진행 중처럼 탭 전환을 잠깐 막아야 할 때 */
  locked?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div role="tablist" aria-label="입력 방식" className="flex gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-1">
        {TABS.map((tab) => {
          const disabled = locked || (tab === "image" && !imageEnabled);
          const isActive = active === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={disabled}
              onClick={() => onChange(tab)}
              title={tab === "image" && !imageEnabled ? "AI 연결 시 사용 가능" : undefined}
              className={`flex-1 rounded-md px-2 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                isActive
                  ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-card)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:text-[var(--color-text-faint)] disabled:hover:text-[var(--color-text-faint)]"
              }`}
            >
              {TAB_LABEL[tab]}
            </button>
          );
        })}
      </div>
      {!imageEnabled && (
        <p className="text-xs text-[var(--color-text-faint)]">이미지 입력은 AI 연결 시 사용할 수 있어요.</p>
      )}
    </div>
  );
}
