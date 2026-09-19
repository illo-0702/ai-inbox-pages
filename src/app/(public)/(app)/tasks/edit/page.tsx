import { Suspense } from "react";
import { EditTaskClient } from "@/components/tasks/EditTaskClient";
import { Spinner } from "@/components/ui/Spinner";

export default function EditTaskPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <section className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">업무 수정</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          업무 정보를 수정하고 저장하세요.
        </p>
      </section>

      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <Spinner size={28} label="불러오는 중…" />
          </div>
        }
      >
        <EditTaskClient />
      </Suspense>
    </div>
  );
}
