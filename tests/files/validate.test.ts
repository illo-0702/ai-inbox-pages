import { describe, expect, it } from "vitest";
import { MAX_FILE_BYTES, resolveFileType, validateUpload } from "@/lib/files/validate";
import { FileExtractError } from "@/lib/files/types";

function captureError(fn: () => unknown): FileExtractError {
  try {
    fn();
  } catch (e) {
    if (e instanceof FileExtractError) return e;
    throw e;
  }
  throw new Error("expected FileExtractError to be thrown");
}

describe("resolveFileType", () => {
  it("MIME으로 PDF를 판별한다", () => {
    expect(resolveFileType("sample.pdf", "application/pdf")).toEqual({
      kind: "pdf",
      mime: "application/pdf",
    });
  });

  it("MIME으로 이미지를 판별한다(png/jpeg/webp)", () => {
    expect(resolveFileType("a.png", "image/png")).toEqual({ kind: "image", mime: "image/png" });
    expect(resolveFileType("a.jpg", "image/jpeg")).toEqual({ kind: "image", mime: "image/jpeg" });
    expect(resolveFileType("a.webp", "image/webp")).toEqual({ kind: "image", mime: "image/webp" });
  });

  it("MIME이 비어 있거나 모호하면 확장자로 보완 판단한다", () => {
    expect(resolveFileType("sample-request.pdf", "")).toEqual({ kind: "pdf", mime: "application/pdf" });
    expect(resolveFileType("photo.JPG", "application/octet-stream")).toEqual({
      kind: "image",
      mime: "image/jpeg",
    });
  });

  it("지원하지 않는 형식은 null", () => {
    expect(resolveFileType("a.txt", "text/plain")).toBeNull();
    expect(resolveFileType("a.gif", "image/gif")).toBeNull();
    expect(resolveFileType("noext", "")).toBeNull();
  });
});

describe("validateUpload", () => {
  it("지원하지 않는 형식 → unsupported_file(415)", () => {
    const err = captureError(() => validateUpload({ name: "message.txt", type: "text/plain", size: 100 }));
    expect(err.code).toBe("unsupported_file");
    expect(err.status).toBe(415);
    expect(err.message).toContain("PDF, PNG, JPG, WEBP");
  });

  it("4MB 초과 → file_too_large", () => {
    const err = captureError(() =>
      validateUpload({ name: "big.pdf", type: "application/pdf", size: MAX_FILE_BYTES + 1 }),
    );
    expect(err.code).toBe("file_too_large");
    expect(err.status).toBe(413);
  });

  it("빈 파일(0바이트) → unreadable_file", () => {
    const err = captureError(() => validateUpload({ name: "empty.pdf", type: "application/pdf", size: 0 }));
    expect(err.code).toBe("unreadable_file");
  });

  it("4MB 이하의 PDF는 통과한다", () => {
    const result = validateUpload({ name: "ok.pdf", type: "application/pdf", size: MAX_FILE_BYTES });
    expect(result).toEqual({ kind: "pdf", mime: "application/pdf" });
  });

  it("4MB 이하의 이미지는 통과한다", () => {
    const result = validateUpload({ name: "ok.png", type: "image/png", size: 1024 });
    expect(result).toEqual({ kind: "image", mime: "image/png" });
  });
});
