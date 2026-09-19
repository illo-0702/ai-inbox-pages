"use client";

import { ChangeEvent, FormEvent, useCallback, useState, useEffect } from "react";
import type { TaskKind, RelationshipSummary, TaskView } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

const TASK_KINDS: { value: TaskKind; label: string }[] = [
  { value: "remittance", label: "송금" },
  { value: "document", label: "자료 전달" },
  { value: "schedule", label: "일정 조율" },
  { value: "other", label: "기타" },
];

const CURRENCIES = ["KRW", "USD", "JPY", "CNY"];

export interface TaskFormData {
  relationshipId: string;
  relationshipName: string;
  title: string;
  kind: TaskKind;
  amount: number | null;
  currency: string;
  dueDate: string;
}

interface TaskFormProps {
  relationships: RelationshipSummary[];
  initialData?: TaskFormData;
  loading?: boolean;
  onSubmit: (data: TaskFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function TaskForm({
  relationships,
  initialData,
  loading = false,
  onSubmit,
  onCancel,
  submitLabel = "저장",
}: TaskFormProps) {
  const [formData, setFormData] = useState<TaskFormData>(
    initialData || {
      relationshipId: "",
      relationshipName: "",
      title: "",
      kind: "other",
      amount: null,
      currency: "KRW",
      dueDate: "",
    }
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [newRelationshipName, setNewRelationshipName] = useState("");

  // 기존 관계명 또는 새 관계명 입력 처리
  const handleRelationshipChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "new") {
      setFormData((prev) => ({ ...prev, relationshipId: "", relationshipName: "" }));
      setNewRelationshipName("");
    } else {
      const selected = relationships.find((r) => r.id === value);
      if (selected) {
        setFormData((prev) => ({
          ...prev,
          relationshipId: selected.id,
          relationshipName: selected.name,
        }));
        setNewRelationshipName("");
      }
    }
  }, [relationships]);

  const handleNewRelationshipNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setNewRelationshipName(e.target.value);
    setFormData((prev) => ({
      ...prev,
      relationshipName: e.target.value,
    }));
  }, []);

  const handleTitleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, title: e.target.value }));
  }, []);

  const handleKindChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, kind: e.target.value as TaskKind }));
  }, []);

  const handleAmountChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      amount: value === "" ? null : Math.floor(Number(value)),
    }));
  }, []);

  const handleCurrencyChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, currency: e.target.value }));
  }, []);

  const handleDueDateChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, dueDate: e.target.value }));
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.relationshipName.trim()) {
      newErrors.relationship = "관계명을 입력하거나 선택해주세요.";
    }
    if (!formData.title.trim()) {
      newErrors.title = "업무명을 입력해주세요.";
    }
    if (formData.amount !== null && formData.amount <= 0) {
      newErrors.amount = "금액은 0보다 커야 합니다.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!validateForm()) return;

      setSubmitting(true);
      try {
        await onSubmit(formData);
      } finally {
        setSubmitting(false);
      }
    },
    [formData, validateForm, onSubmit]
  );

  const isLoading = loading || submitting;
  const isNewRelationship = formData.relationshipId === "";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* 관계 선택 */}
      <div className="flex flex-col gap-2">
        <label htmlFor="relationship" className="text-sm font-semibold text-[var(--color-text)]">
          관계 <span className="text-[var(--color-error)]">*</span>
        </label>
        <select
          id="relationship"
          value={isNewRelationship ? "new" : formData.relationshipId}
          onChange={handleRelationshipChange}
          disabled={isLoading}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
        >
          <option value="">관계 선택…</option>
          {relationships.map((rel) => (
            <option key={rel.id} value={rel.id}>
              {rel.name}
            </option>
          ))}
          <option value="new">새 관계 추가</option>
        </select>

        {isNewRelationship && (
          <input
            type="text"
            value={newRelationshipName}
            onChange={handleNewRelationshipNameChange}
            placeholder="새 관계명 입력…"
            disabled={isLoading}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        )}

        {errors.relationship && <p className="text-sm text-[var(--color-error)]">{errors.relationship}</p>}
      </div>

      {/* 업무명 */}
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm font-semibold text-[var(--color-text)]">
          업무명 <span className="text-[var(--color-error)]">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={formData.title}
          onChange={handleTitleChange}
          placeholder="예: 300만원 송금"
          disabled={isLoading}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
        />
        {errors.title && <p className="text-sm text-[var(--color-error)]">{errors.title}</p>}
      </div>

      {/* 업무 유형 */}
      <div className="flex flex-col gap-2">
        <label htmlFor="kind" className="text-sm font-semibold text-[var(--color-text)]">
          업무 유형
        </label>
        <select
          id="kind"
          value={formData.kind}
          onChange={handleKindChange}
          disabled={isLoading}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
        >
          {TASK_KINDS.map((kind) => (
            <option key={kind.value} value={kind.value}>
              {kind.label}
            </option>
          ))}
        </select>
      </div>

      {/* 금액 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 flex flex-col gap-2">
          <label htmlFor="amount" className="text-sm font-semibold text-[var(--color-text)]">
            금액
          </label>
          <input
            id="amount"
            type="number"
            value={formData.amount ?? ""}
            onChange={handleAmountChange}
            placeholder="0"
            disabled={isLoading}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
          {errors.amount && <p className="text-sm text-[var(--color-error)]">{errors.amount}</p>}
        </div>

        {/* 통화 */}
        <div className="flex flex-col gap-2">
          <label htmlFor="currency" className="text-sm font-semibold text-[var(--color-text)]">
            통화
          </label>
          <select
            id="currency"
            value={formData.currency}
            onChange={handleCurrencyChange}
            disabled={isLoading}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          >
            {CURRENCIES.map((curr) => (
              <option key={curr} value={curr}>
                {curr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 마감일 */}
      <div className="flex flex-col gap-2">
        <label htmlFor="dueDate" className="text-sm font-semibold text-[var(--color-text)]">
          마감일
        </label>
        <input
          id="dueDate"
          type="date"
          value={formData.dueDate}
          onChange={handleDueDateChange}
          disabled={isLoading}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
        />
      </div>

      {/* 버튼 */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          variant="secondary"
          className="flex-1"
        >
          취소
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? <Spinner size={16} /> : submitLabel}
        </Button>
      </div>
    </form>
  );
}
