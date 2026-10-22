import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BrandIcon } from '../icons/BrandIcons';
import './command-palette.css';

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Paleta de comandos (Ctrl/⌘ + K). `items`: [{ id, group, label, hint, icon, run }].
 * `loadExtra(query)` puede devolver más resultados (pacientes, clínicas…) de forma asíncrona.
 */
export default function CommandPalette({ items, loadExtra, placeholder = 'Buscar o ir a…' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [extra, setExtra] = useState([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const opener = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        opener.current = document.activeElement;
        setOpen((v) => !v);
      }
    };
    const onOpen = () => { opener.current = document.activeElement; setOpen(true); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('sd:command-palette', onOpen);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('sd:command-palette', onOpen); };
  }, []);

  useEffect(() => {
    if (!open) { setQuery(''); setExtra([]); return undefined; }
    const t = setTimeout(() => inputRef.current?.focus(), 20);
    return () => { clearTimeout(t); opener.current?.focus?.(); };
  }, [open]);

  useEffect(() => {
    if (!open || !loadExtra) return undefined;
    let alive = true;
    const t = setTimeout(async () => {
      try { const res = await loadExtra(query); if (alive) setExtra(res || []); } catch { if (alive) setExtra([]); }
    }, 120);
    return () => { alive = false; clearTimeout(t); };
  }, [open, query, loadExtra]);

  const results = useMemo(() => {
    const q = norm(query.trim());
    const base = q ? items.filter((it) => norm(`${it.label} ${it.hint || ''} ${it.group}`).includes(q)) : items;
    return [...base, ...extra].slice(0, 40);
  }, [items, extra, query]);

  useEffect(() => { setActive(0); }, [query, extra.length]);
  useEffect(() => { listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }); }, [active]);

  if (!open) return null;

  const run = (it) => { setOpen(false); setTimeout(() => it.run(), 0); };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(results.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter' && results[active]) { e.preventDefault(); run(results[active]); }
  };

  let lastGroup = null;
  return (
    <div className="cmdk" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="cmdk__panel" role="dialog" aria-modal="true" aria-label="Paleta de comandos">
        <div className="cmdk__search">
          <BrandIcon name="search" size={20} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder={placeholder}
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-activedescendant={results[active] ? `cmdk-${results[active].id}` : undefined}
            autoComplete="off"
            spellCheck="false"
          />
          <kbd>Esc</kbd>
        </div>
        <ul id="cmdk-list" ref={listRef} className="cmdk__list" role="listbox">
          {results.map((it, i) => {
            const header = it.group !== lastGroup ? it.group : null;
            lastGroup = it.group;
            return (
              <React.Fragment key={it.id}>
                {header && <li className="cmdk__group" role="presentation">{header}</li>}
                <li
                  id={`cmdk-${it.id}`}
                  role="option"
                  aria-selected={i === active}
                  className={`cmdk__item ${i === active ? 'is-active' : ''}`}
                  onMouseMove={() => setActive(i)}
                  onClick={() => run(it)}
                >
                  <span className="cmdk__icon">{it.avatar ? <b>{it.avatar}</b> : <BrandIcon name={it.icon || 'arrow'} size={18} />}</span>
                  <span className="cmdk__text"><strong>{it.label}</strong>{it.hint && <small>{it.hint}</small>}</span>
                  {i === active && <kbd>↵</kbd>}
                </li>
              </React.Fragment>
            );
          })}
          {!results.length && <li className="cmdk__empty">Sin resultados para «{query}»</li>}
        </ul>
        <footer className="cmdk__foot"><span><kbd>↑</kbd><kbd>↓</kbd> moverse</span><span><kbd>↵</kbd> abrir</span><span><kbd>Ctrl</kbd><kbd>K</kbd> abrir o cerrar</span></footer>
      </div>
    </div>
  );
}

export const openCommandPalette = () => window.dispatchEvent(new Event('sd:command-palette'));
