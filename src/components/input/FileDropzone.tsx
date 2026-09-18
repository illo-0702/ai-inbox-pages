"use client";

import { useRef, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";

// PDF·이미지 탭 공용 파일 선택 영역. 드래그앤드롭 지원, 업로드 중 스피너·중복 선택 방지.
export function FileDropzone({
  accept,
  helpText,
  uploading,
  onFile,
}: {
  accept: string;
  helpText: string;
  uploading: boolean;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function pick() {
    if (uploading) return; // 업로드 중 중복 선택 방지
    inputRef.current?.click();
  }

  function handleFiles(files: FileList | null) {
    if (uploading) return;
    const file = files?.[0];
    if (file) onFile(file);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={uploading}
      onClick={pick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          pick();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!uploading) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
        dragOver ? "border-[var(--color-brand)] bg-[var(--color-brand-muted)]" : "border-[var(--color-border)] bg-[var(--color-surface)]"
      } ${uploading ? "cursor-wait opacity-70" : "cursor-pointer hover:border-[var(--color-brand)]"}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = ""; // 같은 파일을 다시 선택할 수 있도록 초기화
        }}
      />
      {uploading ? (
        <Spinner size={22} label="파일에서 텍스트를 가져오는 중…" />
      ) : (
        <p className="text-sm font-medium text-[var(--color-text)]">
          파일을 여기로 끌어오거나 클릭해서 선택하세요
        </p>
      )}
      <p className="text-xs text-[var(--color-text-faint)]">{helpText}</p>
    </div>
  );
}
