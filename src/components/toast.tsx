"use client";

import type { Toast } from "./use-planner-data";

export function ToastView({
  toast,
  onDismiss,
}: {
  toast: Toast | null;
  onDismiss: () => void;
}) {
  if (!toast) return null;
  return (
    <div
      key={toast.id}
      role="status"
      className={`fixed bottom-4 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-md px-3.5 py-2 text-sm text-white shadow-lg ${
        toast.tone === "error" ? "bg-red-700" : "bg-zinc-900"
      }`}
    >
      <span>{toast.message}</span>
      {toast.undo && (
        <button
          onClick={() => {
            toast.undo!();
          }}
          className="rounded px-1.5 py-0.5 font-semibold text-sky-300 hover:bg-white/10"
        >
          Undo
        </button>
      )}
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="-mr-1 rounded px-1 text-white/60 hover:text-white"
      >
        ×
      </button>
    </div>
  );
}
