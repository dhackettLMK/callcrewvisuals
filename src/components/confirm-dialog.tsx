"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ConfirmOptions = {
  title: string;
  body?: string;
  confirmLabel: string;
  danger?: boolean;
};

/** `const [confirm, dialog] = useConfirm()`; `if (await confirm({...})) …` */
export function useConfirm() {
  const [state, setState] = useState<
    (ConfirmOptions & { resolve: (ok: boolean) => void }) | null
  >(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setState({ ...opts, resolve })),
    [],
  );

  const close = (ok: boolean) => {
    state?.resolve(ok);
    setState(null);
  };

  const dialog = state ? <ConfirmDialog {...state} onClose={close} /> : null;

  return [confirm, dialog] as const;
}

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  danger,
  onClose,
}: ConfirmOptions & { onClose: (ok: boolean) => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30"
      onMouseDown={(e) => e.target === e.currentTarget && onClose(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-[360px] rounded-lg bg-white p-5 shadow-xl"
      >
        <h2 id="confirm-title" className="text-sm font-semibold">
          {title}
        </h2>
        {body && <p className="mt-1.5 text-sm text-zinc-600">{body}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => onClose(false)}
            className="rounded-md px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={() => onClose(true)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium text-white ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-zinc-900 hover:bg-zinc-800"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
