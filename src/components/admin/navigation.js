import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useAdminSection(allowed) {
  const [params, setParams] = useSearchParams();
  const value = params.get('section');
  const active = allowed.includes(value) ? value : allowed[0];
  const select = (next) => {
    if (!allowed.includes(next)) return;
    setParams((previous) => {
      const result = new URLSearchParams(previous);
      if (next === allowed[0]) result.delete('section');
      else result.set('section', next);
      return result;
    });
  };
  return [active, select];
}

/** A callback ref also initializes drawers mounted after the initial data request. */
export function useAdminSidebar(open, setOpen) {
  const [sidebar, setSidebar] = useState(null);
  useEffect(() => {
    if (!sidebar) return;
    const media = window.matchMedia('(max-width: 900px)');
    const main = sidebar.parentElement.querySelector('main');
    const opener = document.activeElement;
    const overflow = document.body.style.overflow;
    let locked = false;

    const sync = () => {
      const modal = open && media.matches;
      sidebar.inert = media.matches && !open;
      if (main) main.inert = modal;
      if (modal && !locked) {
        document.body.style.overflow = 'hidden';
        sidebar.querySelector('button, a')?.focus();
      } else if (!modal && locked) {
        document.body.style.overflow = overflow;
      }
      locked = modal;
      if (open && !media.matches) setOpen(false);
    };
    sync();
    media.addEventListener('change', sync);

    const onKey = (event) => {
      if (!open || !media.matches) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
      if (event.key === 'Tab') {
        const controls = [...sidebar.querySelectorAll('button:not(:disabled), a[href]')]
          .filter((item) => item.getClientRects().length);
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      media.removeEventListener('change', sync);
      document.removeEventListener('keydown', onKey);
      sidebar.inert = false;
      if (main) main.inert = false;
      if (locked) document.body.style.overflow = overflow;
      if (open && media.matches && opener?.isConnected) opener.focus();
    };
  }, [sidebar, open, setOpen]);
  return setSidebar;
}
