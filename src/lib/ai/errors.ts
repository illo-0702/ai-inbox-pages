// AI 추출 계층 공용 에러.

/** extract()가 모든 제공자를 소진하고 데모 폴백도 비활성화된 경우 던지는 에러. */
export class ExtractionError extends Error {
  code: string;

  constructor(code: string) {
    super(code);
    this.name = "ExtractionError";
    this.code = code;
  }
}
