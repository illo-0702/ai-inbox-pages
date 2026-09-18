"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { RelationshipSummary } from "@/lib/types";
import { getRelationships, ApiRequestError } from "@/lib/client/api";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { RelationshipCard } from "@/components/relationships/RelationshipCard";

export default function RelationshipsPage() {
  const [items, setItems] = useState<RelationshipSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await getRelationships());
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "관계 목록을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--color-text)]">관계</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          업체별 담당자와 업무 현황을 확인하세요.
        </p>
      </div>

      {loading && !items ? (
        <div className="flex justify-center py-16">
          <Spinner size={28} label="불러오는 중…" />
        </div>
      ) : error && !items ? (
        <ErrorNotice message={error} onRetry={load} />
      ) : items && items.length === 0 ? (
        <EmptyState
          title="아직 연결된 관계가 없어요."
          description="받은 요청을 추가하면 관계가 자동으로 만들어져요."
          action={
            <Link href="/input">
              <Button type="button">정보 추가</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items?.map((r) => (
            <RelationshipCard key={r.id} relationship={r} />
          ))}
        </div>
      )}
    </div>
  );
}
