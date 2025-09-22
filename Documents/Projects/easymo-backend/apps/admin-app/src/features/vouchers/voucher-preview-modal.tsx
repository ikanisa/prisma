import { X } from "lucide-react";
import LoadingState from "@/components/states/loading-state";
import ErrorState from "@/components/states/error-state";
import EmptyState from "@/components/states/empty-state";
import type { VoucherPreview } from "@/lib/api/schemas";

interface VoucherPreviewModalProps {
  open: boolean;
  onClose: () => void;
  voucherCode: string | null;
  data: VoucherPreview | null | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function VoucherPreviewModal({ open, onClose, voucherCode, data, isLoading, isError }: VoucherPreviewModalProps) {
  if (!open) return null;

  const status = data?.status ?? "unavailable";
  const previewUrl = data?.url;
  const message = data?.message ?? (status === "unavailable" ? "Preview not configured." : undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-10 h-[520px] w-[360px] max-w-full rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Voucher preview</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{voucherCode ?? "Unknown voucher"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-transparent p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="h-full overflow-hidden p-4">
          {isLoading ? (
            <LoadingState label="Generating voucher" />
          ) : isError ? (
            <ErrorState message="Failed to load preview." />
          ) : status === "unavailable" ? (
            <EmptyState description={message ?? "Preview unavailable in this environment."} />
          ) : previewUrl ? (
            <div className="flex h-full items-center justify-center">
              <img
                src={previewUrl}
                alt="Voucher preview"
                className="max-h-[440px] rounded-xl border border-slate-200 object-contain shadow-sm dark:border-slate-700"
              />
            </div>
          ) : (
            <EmptyState description="Preview did not return an image." />
          )}
        </div>
      </div>
    </div>
  );
}
