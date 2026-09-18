// 추출된 텍스트의 길이 제한과 안내 문구 계산. 순수 함수 — PDF/이미지 경로가 공유한다.

export interface FinalizedText {
  text: string;
  truncated: boolean;
  notice: string | null;
}

/** 비전 모델이 읽지 못한 글자에 붙이는 표시(vision.ts 프롬프트와 계약). */
export const UNREADABLE_MARK = "[판독불가]";
const UNREADABLE_NOTICE = "일부 글자를 읽지 못했어요. 날짜·금액을 꼭 확인해주세요.";

export function truncationNotice(maxChars: number): string {
  return `앞부분 ${maxChars}자만 가져왔어요. 필요한 부분만 남겨주세요.`;
}

/**
 * 길이 제한을 적용하고 안내 문구를 계산한다.
 * 길이 초과·판독불가 표시가 둘 다 해당하면 문구를 이어붙인다.
 */
export function finalizeExtractedText(rawText: string, maxChars: number): FinalizedText {
  const truncated = rawText.length > maxChars;
  const text = truncated ? rawText.slice(0, maxChars) : rawText;

  const notices: string[] = [];
  if (truncated) notices.push(truncationNotice(maxChars));
  if (text.includes(UNREADABLE_MARK)) notices.push(UNREADABLE_NOTICE);

  return { text, truncated, notice: notices.length > 0 ? notices.join(" ") : null };
}
