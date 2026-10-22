import React, { useEffect, useRef } from 'react';

/** Native modal: traps focus, makes the background inert and restores its opener. */
export default function Dialog({ children, onClose, busy = false, label }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  return (
    <dialog ref={ref} className="sd-dialog" aria-label={label} aria-busy={busy}
      onCancel={(event) => { event.preventDefault(); if (!busy) closeRef.current?.(); }}
      onClick={(event) => { if (event.target === event.currentTarget && !busy) closeRef.current?.(); }}>
      {children}
    </dialog>
  );
}
