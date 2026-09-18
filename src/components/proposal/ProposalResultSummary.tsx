import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function ProposalResultSummary({
  message,
  onAddAnother,
}: {
  message: string;
  onAddAnother?: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-4 sm:p-5">
      <p className="text-sm font-medium text-[var(--color-success)]">{message}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href="/">
          <Button type="button" variant="secondary" className="w-full sm:w-auto">
            현재 할 일 보기
          </Button>
        </Link>
        {onAddAnother && (
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={onAddAnother}>
            다른 요청 추가
          </Button>
        )}
      </div>
    </div>
  );
}
