"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const allowDismiss = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      allowDismiss.current = false;
      if (!dialog.open) dialog.showModal();
      const timer = window.setTimeout(() => {
        allowDismiss.current = true;
      }, 50);
      return () => window.clearTimeout(timer);
    }

    if (dialog.open) dialog.close();
  }, [open, mounted]);

  if (!mounted) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (allowDismiss.current) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && allowDismiss.current) {
          onClose();
        }
      }}
    >
      <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
        <div className="panel-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </dialog>,
    document.body,
  );
}
