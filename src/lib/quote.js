/*
 * Cotización a partir del odontograma.
 *
 * Solo las marcas en mal estado (rojo) generan tratamientos: son lo que falta hacer. Las marcas en
 * buen estado (azul) son tratamientos ya realizados y no se cobran. Cada hallazgo se traduce en un
 * procedimiento con precio unitario; el tarifario es de la clínica (clinics.price_list) y, si aún no
 * lo configuró, se usan precios referenciales en soles.
 */
import { CONDITIONS, marks, toothType } from './odontogram.js';

/** Procedimientos cotizables. `unit`: 'tooth' (por pieza) o 'surface' (por cara adicional). */
export const PROCEDURES = {
  resin: { label: 'Restauración con resina', hint: 'Primera cara de la pieza', price: 80 },
  resinExtra: { label: 'Cara adicional de resina', hint: 'Cada cara adicional en la misma pieza', price: 30 },
  resinRedo: { label: 'Cambio de restauración', hint: 'Restauración en mal estado', price: 90 },
  sealant: { label: 'Sellante de fosas y fisuras', hint: 'Por pieza', price: 40 },
  rebuild: { label: 'Reconstrucción coronaria', hint: 'Pieza fracturada', price: 150 },
  crown: { label: 'Corona metal-porcelana', hint: 'Corona indicada o a cambiar', price: 650 },
  endoAnterior: { label: 'Endodoncia anterior', hint: 'Incisivos y caninos', price: 350 },
  endoPremolar: { label: 'Endodoncia premolar', hint: 'Premolares', price: 450 },
  endoMolar: { label: 'Endodoncia molar', hint: 'Molares', price: 600 },
  extraction: { label: 'Extracción simple', hint: 'Por pieza', price: 80 },
  extractionThird: { label: 'Extracción de tercer molar', hint: 'Cordales', price: 250 },
  implantCare: { label: 'Tratamiento periimplantario', hint: 'Implante en mal estado', price: 200 },
  implant: { label: 'Implante dental', hint: 'Reposición de pieza ausente (opcional)', price: 3500 },
  exam: { label: 'Consulta y diagnóstico', hint: 'Evaluación clínica', price: 50 },
  prophylaxis: { label: 'Profilaxis y destartraje', hint: 'Limpieza dental', price: 80 },
};

/** Procedimientos que no salen de una pieza concreta y se pueden añadir a mano. */
export const EXTRAS = ['exam', 'prophylaxis'];

/** Agrupación del tarifario por especialidad, en el orden en que un odontólogo lo recorre. */
export const CATEGORIES = [
  { key: 'prevention', label: 'Diagnóstico y prevención', icon: 'search', codes: ['exam', 'prophylaxis', 'sealant'] },
  { key: 'restorative', label: 'Restauraciones', icon: 'odontogram', codes: ['resin', 'resinExtra', 'resinRedo', 'rebuild'] },
  { key: 'endo', label: 'Endodoncia', icon: 'odontogram', codes: ['endoAnterior', 'endoPremolar', 'endoMolar'] },
  { key: 'prosthesis', label: 'Coronas e implantes', icon: 'odontogram', codes: ['crown', 'implant', 'implantCare'] },
  { key: 'surgery', label: 'Cirugía', icon: 'odontogram', codes: ['extraction', 'extractionThird'] },
];

export const MAX_PRICE = 100000;
export const MAX_CUSTOM = 30;
export const defaultPrices = () => Object.fromEntries(Object.entries(PROCEDURES).map(([k, p]) => [k, p.price]));
const validPrice = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= MAX_PRICE ? Math.round(n * 100) / 100 : null; };

/**
 * Lee el tarifario guardado en clinics.price_list. Admite el formato anterior (objeto plano
 * { codigo: precio }) y el actual { v: 2, prices, custom: [{ id, label, price }] }.
 */
export function parsePriceList(saved) {
  const raw = saved && typeof saved === 'object' ? saved : {};
  const flat = raw.v === 2 ? raw.prices || {} : raw;
  const prices = defaultPrices();
  Object.entries(flat).forEach(([k, v]) => { const n = validPrice(v); if (k in prices && n !== null) prices[k] = n; });
  const custom = (raw.v === 2 && Array.isArray(raw.custom) ? raw.custom : [])
    .filter((c) => c && typeof c.label === 'string' && c.label.trim() && validPrice(c.price) !== null)
    .slice(0, MAX_CUSTOM)
    .map((c, i) => ({ id: String(c.id || `c${i}`).slice(0, 40), label: c.label.trim().slice(0, 80), price: validPrice(c.price) }));
  return { prices, custom };
}

/** Formato que se guarda: solo precios válidos y procedimientos propios con nombre. */
export function serializePriceList(prices, custom = []) {
  const clean = {};
  Object.keys(PROCEDURES).forEach((k) => { const n = validPrice(prices[k]); clean[k] = n === null ? PROCEDURES[k].price : n; });
  return { v: 2, prices: clean, custom: custom.filter((c) => c.label?.trim() && validPrice(c.price) !== null).slice(0, MAX_CUSTOM).map((c) => ({ id: c.id, label: c.label.trim().slice(0, 80), price: validPrice(c.price) })) };
}

/** Compatibilidad: solo los precios del tarifario. */
export const resolvePrices = (saved) => parsePriceList(saved).prices;

/** Nombre y precio de un código, sea del catálogo o un procedimiento propio de la clínica (`custom:<id>`). */
export function procedureInfo(code, prices, custom = []) {
  if (PROCEDURES[code]) return { label: PROCEDURES[code].label, price: prices[code] ?? PROCEDURES[code].price };
  const own = custom.find((c) => `custom:${c.id}` === code);
  return own ? { label: own.label, price: prices[code] ?? own.price } : null;
}

const endoFor = (fdi) => {
  const t = toothType(fdi);
  return t === 'molar' ? 'endoMolar' : t === 'premolar' ? 'endoPremolar' : 'endoAnterior';
};
const isThirdMolar = (fdi) => fdi % 10 === 8 && fdi < 50;

/**
 * Sugerencias de tratamiento por pieza a partir de las marcas en mal estado.
 * Devuelve [{ id, fdi, code, qty, reason }]; `id` es estable para poder activar o desactivar cada una.
 */
export function suggestions(model, { includeImplants = false } = {}) {
  const byTooth = new Map();
  marks(model).forEach((m) => {
    if (!byTooth.has(m.fdi)) byTooth.set(m.fdi, []);
    byTooth.get(m.fdi).push(m);
  });
  const out = [];
  const push = (fdi, code, qty, reason) => out.push({ id: `${fdi}:${code}`, fdi, code, qty, reason });
  [...byTooth.keys()].sort((a, b) => a - b).forEach((fdi) => {
    const list = byTooth.get(fdi);
    const whole = list.find((m) => m.surface === null);
    const bad = list.filter((m) => m.s === 'bad');
    // Una extracción indicada sustituye a cualquier otro tratamiento de la pieza.
    if (whole?.c === 'extraction' && whole.s === 'bad') { push(fdi, isThirdMolar(fdi) ? 'extractionThird' : 'extraction', 1, 'Extracción indicada'); return; }
    if (whole?.c === 'missing') { if (includeImplants) push(fdi, 'implant', 1, 'Pieza ausente'); return; }
    if (whole && whole.s === 'bad') {
      if (whole.c === 'fracture') push(fdi, 'rebuild', 1, 'Fractura');
      else if (whole.c === 'crown') push(fdi, 'crown', 1, 'Corona en mal estado');
      else if (whole.c === 'endodontics') push(fdi, endoFor(fdi), 1, 'Endodoncia indicada');
      else if (whole.c === 'implant') push(fdi, 'implantCare', 1, 'Implante en mal estado');
    }
    // Caras con caries: la primera es una resina, las demás caras adicionales.
    const caries = bad.filter((m) => m.surface && m.c === 'caries');
    if (caries.length && !(whole?.c === 'crown' && whole.s === 'bad')) {
      const faces = caries.map((m) => m.surface).join('');
      push(fdi, 'resin', 1, `Caries (${faces})`);
      if (caries.length > 1) push(fdi, 'resinExtra', caries.length - 1, `${caries.length - 1} ${caries.length === 2 ? 'cara adicional' : 'caras adicionales'}`);
    }
    const redo = bad.filter((m) => m.surface && m.c === 'restoration');
    if (redo.length) push(fdi, 'resinRedo', 1, `Restauración defectuosa (${redo.map((m) => m.surface).join('')})`);
    if (bad.some((m) => m.surface && m.c === 'sealant')) push(fdi, 'sealant', 1, 'Sellante en mal estado');
  });
  return out;
}

const money = (n) => Math.round(n * 100) / 100;

/**
 * Arma la cotización: agrupa por procedimiento, aplica precios, extras y descuento.
 * `excluded`: ids de sugerencias desactivadas. `extras`: { exam: 1, prophylaxis: 1 }.
 */
export function buildQuote(model, prices, { excluded = [], extras = {}, discount = 0, includeImplants = false, custom = [] } = {}) {
  const items = suggestions(model, { includeImplants }).filter((s) => !excluded.includes(s.id));
  const groups = new Map();
  items.forEach((s) => {
    const g = groups.get(s.code) || { code: s.code, qty: 0, teeth: [] };
    g.qty += s.qty;
    if (!g.teeth.includes(s.fdi)) g.teeth.push(s.fdi);
    groups.set(s.code, g);
  });
  Object.entries(extras).forEach(([code, qty]) => {
    const n = Math.max(0, Math.min(99, Math.floor(Number(qty) || 0)));
    if (n && procedureInfo(code, prices, custom)) groups.set(code, { code, qty: n, teeth: [] });
  });
  const lines = [...groups.values()].map((g) => {
    const info = procedureInfo(g.code, prices, custom);
    return { ...g, label: info.label, unit: info.price, total: money(info.price * g.qty) };
  });
  const subtotal = money(lines.reduce((sum, l) => sum + l.total, 0));
  const pct = Math.min(100, Math.max(0, Number(discount) || 0));
  const discountAmount = money((subtotal * pct) / 100);
  return { lines, subtotal, discount: pct, discountAmount, total: money(subtotal - discountAmount), teeth: new Set(items.map((s) => s.fdi)).size };
}

export const formatSoles = (n) => `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Copia inmutable de una cotización para guardarla con el odontograma (últimas 10). */
export function withQuote(model, quote, { by, notes, validDays = 30 } = {}) {
  const entry = {
    id: `q${Date.now().toString(36)}`,
    at: new Date().toISOString(),
    by: by || 'Equipo',
    valid_days: validDays,
    notes: (notes || '').slice(0, 1000),
    lines: quote.lines.map(({ code, label, qty, unit, total, teeth }) => ({ code, label, qty, unit, total, teeth })),
    subtotal: quote.subtotal,
    discount: quote.discount,
    total: quote.total,
  };
  return { ...model, quotes: [entry, ...(Array.isArray(model.quotes) ? model.quotes : [])].slice(0, 10) };
}

export const conditionLabel = (c) => CONDITIONS[c]?.label || c;
