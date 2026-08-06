"use client";
import React, { createContext, useCallback, useContext, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";

interface ConfirmOptions {
  title?: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmDialogContext = createContext<ConfirmFn | null>(null);

// Hop thoai xac nhan dung chung cho toan bo admin, thay the window.confirm() mac dinh cua trinh duyet
// Dung: const confirm = useConfirmDialog(); const ok = await confirm({ message: "..." });
export function useConfirmDialog(): ConfirmFn {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) throw new Error("useConfirmDialog phai dung ben trong ConfirmDialogProvider");
  return ctx;
}

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ options: ConfirmOptions; resolve: (v: boolean) => void } | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise((resolve) => {
      setState({ options, resolve });
    });
  }, []);

  function handle(result: boolean) {
    state?.resolve(result);
    setState(null);
  }

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      <Modal isOpen={!!state} onClose={() => handle(false)} className="max-w-sm m-4" showCloseButton={false}>
        {state && (
          <div className="p-6">
            <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
              {state.options.title ?? (state.options.danger ? "Xác nhận xoá" : "Xác nhận")}
            </h3>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">{state.options.message}</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => handle(false)}>
                {state.options.cancelText ?? "Huỷ"}
              </Button>
              <Button
                onClick={() => handle(true)}
                className={state.options.danger ? "!bg-error-500 hover:!bg-error-600" : ""}
              >
                {state.options.confirmText ?? (state.options.danger ? "Xoá" : "Đồng ý")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </ConfirmDialogContext.Provider>
  );
}
