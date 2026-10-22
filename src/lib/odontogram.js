/*
 * Modelo del odontograma (se guarda en pacientes.historial_odontograma, jsonb).
 *
 * Versión 2:
 * {
 *   v: 2,
 *   dentition: 'permanent' | 'temporary',
 *   teeth: { '16': { whole: { c: 'crown', s: 'good' } | null, surfaces: { O: { c: 'caries', s: 'bad' } }, note: '' } },
 *   notes: 'observaciones generales',
 *   history: [{ at: ISO, by: 'nombre', summary: '…' }]   // últimas 30 versiones guardadas
 * }
 *
 * Convención de la norma técnica del odontograma (MINSA, Perú): rojo = mal estado o hallazgo,
 * azul = buen estado o tratamiento realizado. Cada marca guarda su estado (s: 'bad' | 'good').
 * Los datos antiguos ({ '16': 'caries' }) se convierten al leerlos, sin perder información.
 */

export const SURFACES = ['V', 'M', 'O', 'D', 'L'];

export const CONDITIONS = {
  caries: { label: 'Caries', scope: 'surface', status: 'bad', key: '1', hint: 'Lesión cariosa en la superficie' },
  restoration: { label: 'Restauración', scope: 'surface', status: 'good', key: '2', hint: 'Resina u obturación' },
  sealant: { label: 'Sellante', scope: 'surface', status: 'good', key: '3', hint: 'Sellante de fosas y fisuras' },
  crown: { label: 'Corona', scope: 'whole', status: 'good', key: '4', hint: 'Corona completa' },
  endodontics: { label: 'Endodoncia', scope: 'whole', status: 'good', key: '5', hint: 'Tratamiento de conductos' },
  implant: { label: 'Implante', scope: 'whole', status: 'good', key: '6', hint: 'Implante dental' },
  fracture: { label: 'Fractura', scope: 'whole', status: 'bad', key: '7', hint: 'Fractura coronaria' },
  extraction: { label: 'Extracción indicada', scope: 'whole', status: 'bad', key: '8', hint: 'Pieza a extraer' },
  missing: { label: 'Ausente', scope: 'whole', status: 'good', key: '9', hint: 'Pieza ausente' },
};

export const STATUS = {
  bad: { label: 'Mal estado', color: '#dc2626' },
  good: { label: 'Buen estado', color: '#1d4ed8' },
};

const POS_NAMES = ['', 'Incisivo central', 'Incisivo lateral', 'Canino', 'Primer premolar', 'Segundo premolar', 'Primer molar', 'Segundo molar', 'Tercer molar'];
const POS_NAMES_TEMP = ['', 'Incisivo central', 'Incisivo lateral', 'Canino', 'Primer molar', 'Segundo molar'];
const QUAD = { 1: 'superior derecho', 2: 'superior izquierdo', 3: 'inferior izquierdo', 4: 'inferior derecho', 5: 'superior derecho', 6: 'superior izquierdo', 7: 'inferior izquierdo', 8: 'inferior derecho' };

export const SURFACE_NAMES = { V: 'Vestibular', M: 'Mesial', O: 'Oclusal', D: 'Distal', L: 'Lingual' };

/** Filas en el orden clínico habitual: superior 18→11 | 21→28, inferior 48→41 | 31→38. */
export const LAYOUT = {
  permanent: {
    upper: [[18, 17, 16, 15, 14, 13, 12, 11], [21, 22, 23, 24, 25, 26, 27, 28]],
    lower: [[48, 47, 46, 45, 44, 43, 42, 41], [31, 32, 33, 34, 35, 36, 37, 38]],
  },
  temporary: {
    upper: [[55, 54, 53, 52, 51], [61, 62, 63, 64, 65]],
    lower: [[85, 84, 83, 82, 81], [71, 72, 73, 74, 75]],
  },
};

export const quadrantOf = (fdi) => Math.floor(fdi / 10);
export const isUpper = (fdi) => [1, 2, 5, 6].includes(quadrantOf(fdi));
/** En pantalla, los cuadrantes derechos del paciente quedan a la izquierda: su mesial mira a la derecha. */
export const mesialOnRight = (fdi) => [1, 4, 5, 8].includes(quadrantOf(fdi));
export const isTemporary = (fdi) => quadrantOf(fdi) >= 5;

export function toothType(fdi) {
  const pos = fdi % 10;
  if (isTemporary(fdi)) return pos <= 2 ? 'incisor' : pos === 3 ? 'canine' : 'molar';
  if (pos <= 2) return 'incisor';
  if (pos === 3) return 'canine';
  if (pos <= 5) return 'premolar';
  return 'molar';
}

export function toothName(fdi) {
  const names = isTemporary(fdi) ? POS_NAMES_TEMP : POS_NAMES;
  return `${names[fdi % 10]} ${QUAD[quadrantOf(fdi)]}${isTemporary(fdi) ? ' (temporal)' : ''}`;
}

export function surfaceLabel(fdi, surface) {
  if (surface === 'O') return ['incisor', 'canine'].includes(toothType(fdi)) ? 'Incisal' : 'Oclusal';
  if (surface === 'L') return isUpper(fdi) ? 'Palatino' : 'Lingual';
  return SURFACE_NAMES[surface];
}

export const emptyModel = () => ({ v: 2, dentition: 'permanent', teeth: {}, notes: '', history: [] });

/** Convierte cualquier formato guardado al modelo v2. */
export function normalize(raw) {
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') return emptyModel();
  if (raw.v === 2) {
    return { ...emptyModel(), ...raw, teeth: { ...(raw.teeth || {}) }, history: Array.isArray(raw.history) ? raw.history : [] };
  }
  // Formato anterior: { '16': 'caries', '26': 'crown' }
  const model = emptyModel();
  Object.entries(raw).forEach(([fdi, value]) => {
    if (typeof value !== 'string' || value === 'healthy' || !/^\d{2}$/.test(fdi)) return;
    const condition = value === 'porcelain_crown' ? 'crown' : value;
    const info = CONDITIONS[condition];
    if (!info) return;
    const mark = { c: condition, s: info.status };
    model.teeth[fdi] = info.scope === 'surface'
      ? { whole: null, surfaces: { O: mark }, note: '' }
      : { whole: mark, surfaces: {}, note: '' };
  });
  return model;
}

export const toothRecord = (model, fdi) => model.teeth[String(fdi)] || { whole: null, surfaces: {}, note: '' };

const isEmptyTooth = (t) => !t.whole && !Object.keys(t.surfaces || {}).length && !t.note?.trim();

/** Aplica una herramienta a una pieza (y superficie, si corresponde). Devuelve un modelo nuevo. */
export function applyTool(model, fdi, tool, status, surface) {
  const key = String(fdi);
  const current = toothRecord(model, fdi);
  let next;
  if (tool === 'clear') {
    next = surface && current.surfaces?.[surface]
      ? { ...current, surfaces: Object.fromEntries(Object.entries(current.surfaces).filter(([s]) => s !== surface)) }
      : { whole: null, surfaces: {}, note: current.note || '' };
  } else {
    const info = CONDITIONS[tool];
    if (!info) return model;
    const mark = { c: tool, s: status || info.status };
    if (info.scope === 'surface') {
      const target = surface || 'O';
      const same = current.surfaces?.[target]?.c === tool && current.surfaces?.[target]?.s === mark.s;
      const surfaces = { ...(current.surfaces || {}) };
      if (same) delete surfaces[target]; else surfaces[target] = mark;
      next = { ...current, surfaces, whole: ['missing', 'extraction'].includes(current.whole?.c) ? null : current.whole };
    } else {
      const same = current.whole?.c === tool && current.whole?.s === mark.s;
      next = { ...current, whole: same ? null : mark, surfaces: tool === 'missing' && !same ? {} : current.surfaces };
    }
  }
  const teeth = { ...model.teeth };
  if (isEmptyTooth(next)) delete teeth[key]; else teeth[key] = next;
  return { ...model, teeth };
}

export function setToothNote(model, fdi, note) {
  const key = String(fdi);
  const next = { ...toothRecord(model, fdi), note };
  const teeth = { ...model.teeth };
  if (isEmptyTooth(next)) delete teeth[key]; else teeth[key] = next;
  return { ...model, teeth };
}

/** Lista plana de marcas: [{ fdi, surface|null, c, s }]. */
export function marks(model) {
  const out = [];
  Object.entries(model.teeth).forEach(([fdi, t]) => {
    if (t.whole) out.push({ fdi: Number(fdi), surface: null, ...t.whole });
    Object.entries(t.surfaces || {}).forEach(([surface, m]) => out.push({ fdi: Number(fdi), surface, ...m }));
  });
  return out;
}

/** Índice CPO-D (permanentes) o ceo-d (temporales): cariadas, perdidas/extracción, obturadas. */
export function dmft(model, dentition = model.dentition) {
  const temporary = dentition === 'temporary';
  let decayed = 0;
  let missing = 0;
  let filled = 0;
  Object.entries(model.teeth).forEach(([fdi, t]) => {
    if (isTemporary(Number(fdi)) !== temporary) return;
    const surfaces = Object.values(t.surfaces || {});
    if (t.whole && ['missing', 'extraction'].includes(t.whole.c)) { missing += 1; return; }
    if (surfaces.some((m) => m.c === 'caries') || (t.whole?.c === 'fracture')) { decayed += 1; return; }
    if (surfaces.some((m) => m.c === 'restoration') || t.whole?.c === 'crown') filled += 1;
  });
  return { decayed, missing, filled, total: decayed + missing + filled, label: temporary ? 'ceo-d' : 'CPO-D' };
}

export function summarize(model) {
  const all = marks(model);
  const bad = all.filter((m) => m.s === 'bad').length;
  const good = all.length - bad;
  const teeth = Object.keys(model.teeth).length;
  if (!all.length) return 'Sin hallazgos registrados';
  return `${teeth} ${teeth === 1 ? 'pieza' : 'piezas'} · ${bad} en mal estado · ${good} en buen estado`;
}

/** Estado principal de cada pieza, para el visor 3D (estados: caries, restoration, crown, implant, missing). */
export function toArchMap(model) {
  const map = {};
  Object.entries(model.teeth).forEach(([fdi, t]) => {
    const n = Number(fdi);
    if (isTemporary(n)) return;
    const c = t.whole?.c;
    if (c === 'missing' || c === 'extraction') map[n] = 'missing';
    else if (c === 'implant') map[n] = 'implant';
    else if (c === 'crown') map[n] = 'crown';
    else if (Object.values(t.surfaces || {}).some((m) => m.c === 'caries') || c === 'fracture') map[n] = 'caries';
    else if (Object.values(t.surfaces || {}).length || c === 'endodontics') map[n] = 'restoration';
  });
  return map;
}

export function withHistory(model, by) {
  const entry = { at: new Date().toISOString(), by: by || 'Equipo', summary: summarize(model) };
  return { ...model, history: [entry, ...(model.history || [])].slice(0, 30) };
}
