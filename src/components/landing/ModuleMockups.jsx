import React from 'react';
import { AlertTriangle, Check, CheckCircle2, Clock, Lock, Minus, Plus, Search, ShieldCheck } from '../icons';

/*
 * Vistas de ejemplo de cada módulo, construidas con los mismos campos y datos de demostración
 * que usa el panel (AgendaCalendar, ClinicInventory, ClinicFinances, equipo y permisos).
 * Son decorativas: el texto equivalente está en la tarjeta del módulo.
 */

function Window({ title, children, aside }) {
  return (
    <div className="sdl-ui__window">
      <div className="sdl-ui__bar">
        <span className="sdl-ui__dots"><i /><i /><i /></span>
        <span className="sdl-ui__title">{title}</span>
        {aside}
      </div>
      <div className="sdl-ui__body">{children}</div>
    </div>
  );
}

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
const HOURS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
// [día, hora inicio (desde 9), duración en horas, paciente, motivo, estado]
const APPTS = [
  [0, 0, 1, 'Sofía Pérez', 'Ortodoncia', 'confirmed'],
  [0, 2.5, 1, 'Carlos Gómez', 'Profilaxis', 'confirmed'],
  [1, 5.5, 1.5, 'Patricia Luján', 'Endodoncia 14', 'confirmed'],
  [2, 1, 1, 'Raúl Medina', 'Consulta general', 'pending'],
  [3, 7, 1, 'Ana María Silva', 'Resina 24', 'confirmed'],
  [4, 6, 1, 'Juan M. Torres', 'Blanqueamiento', 'confirmed'],
];

function AgendaUI() {
  return (
    <div className="sdl-ui sdl-ui--agenda">
      <Window
        title="Agenda"
        aside={<span className="sdl-ui__seg"><b>Calendario</b><span>Lista</span></span>}
      >
        <div className="sdl-ui__cal">
          <span />
          {DAYS.map((d) => <span key={d} className="sdl-ui__day">{d}</span>)}
          <div className="sdl-ui__hours">{HOURS.map((h) => <span key={h}>{h}</span>)}</div>
          {DAYS.map((d, di) => (
            <div key={d} className="sdl-ui__col">
              {APPTS.filter((a) => a[0] === di).map(([, start, dur, name, why, st], i) => (
                <div
                  key={name}
                  className={`sdl-ui__appt is-${st}`}
                  style={{ '--s': start, '--d': dur, '--k': di + i }}
                >
                  <b>{name}</b>
                  <span>{why}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Window>
      <div className="sdl-ui__float sdl-ui__float--br">
        <p className="sdl-ui__kicker"><Clock size={12} />Hoy · 09:00</p>
        <p className="sdl-ui__strong">Sofía Pérez</p>
        <p className="sdl-ui__muted">Ortodoncia (ajuste de brackets)</p>
        <span className="sdl-ui__chip is-ok"><CheckCircle2 size={12} />Confirmada</span>
      </div>
    </div>
  );
}

const STOCK = [
  ['Guantes de nitrilo M', 3, 5],
  ['Resina fotocurable A2', 8, 10],
  ['Anestesia lidocaína 2 %', 25, 10],
  ['Agujas cortas 30G', 80, 20],
];

function InventarioUI() {
  return (
    <div className="sdl-ui sdl-ui--inv">
      <Window title="Inventario">
        <div className="sdl-ui__kpis">
          <div><span>Total insumos</span><b>6</b></div>
          <div className="is-bad"><span>Stock crítico</span><b>3</b></div>
          <div className="is-good"><span>Stock óptimo</span><b>3</b></div>
        </div>
        <div className="sdl-ui__rows">
          {STOCK.map(([name, qty, min], i) => {
            const low = qty <= min;
            const pct = Math.min(100, (qty / (min * 3)) * 100);
            return (
              <div key={name} className={`sdl-ui__row ${low ? 'is-low' : ''}`} style={{ '--k': i }}>
                <span className="sdl-ui__name">{name}</span>
                <span className="sdl-ui__meter">
                  <i style={{ '--w': `${pct}%` }} />
                  <em style={{ left: `${(1 / 3) * 100}%` }} title="mínimo" />
                </span>
                <span className="sdl-ui__qty">{qty}<small>/ {min} mín.</small></span>
                <span className={`sdl-ui__chip ${low ? 'is-bad' : 'is-ok'}`}>
                  {low ? <AlertTriangle size={12} /> : <Check size={12} />}
                  {low ? 'Crítico' : 'Suficiente'}
                </span>
              </div>
            );
          })}
        </div>
      </Window>
      <div className="sdl-ui__float sdl-ui__float--br">
        <p className="sdl-ui__kicker">Registrar salida</p>
        <p className="sdl-ui__strong">Guantes de nitrilo M</p>
        <div className="sdl-ui__stepper"><Minus size={14} /><b>1</b><Plus size={14} /></div>
      </div>
    </div>
  );
}

const MOVES = [
  ['Ajuste de ortodoncia', 'Sofía Pérez', 'Hoy', 120],
  ['Profilaxis ultrasónica', 'Carlos Gómez', 'Ayer', 90],
  ['Endodoncia pieza 14', 'Patricia Luján', 'Hace 2 días', 350],
  ['Curación con resina', 'Ana María Silva', 'Hace 3 días', 150],
];

function CajaUI() {
  return (
    <div className="sdl-ui sdl-ui--caja">
      <Window title="Caja">
        <div className="sdl-ui__total">
          <span>Ingresos registrados</span>
          <b>S/ 710<small>.00</small></b>
          <svg viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="sdl-ui-g" x1="0" x2="1">
                <stop offset="0" stopColor="#2fe0c8" />
                <stop offset="1" stopColor="#2f7bff" />
              </linearGradient>
            </defs>
            <path d="M0 34 L40 28 L80 30 L120 18 L160 20 L200 6" fill="none" stroke="url(#sdl-ui-g)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="sdl-ui__search"><Search size={13} />Buscar por concepto o paciente</div>
        <div className="sdl-ui__rows">
          {MOVES.map(([concept, who, when, amount], i) => (
            <div key={concept} className="sdl-ui__move" style={{ '--k': i }}>
              <span className="sdl-ui__name">{concept}<small>{who}</small></span>
              <span className="sdl-ui__chip">{when}</span>
              <b>+ S/ {amount}.00</b>
            </div>
          ))}
        </div>
      </Window>
      <div className="sdl-ui__float sdl-ui__float--toast">
        <CheckCircle2 size={18} />
        <div>
          <p className="sdl-ui__strong">Ingreso registrado</p>
          <p className="sdl-ui__muted">S/ 150.00 ingresados a la caja.</p>
        </div>
      </div>
    </div>
  );
}

const TEAM = [
  ['Titular', 'DR', 'owner'],
  ['Asistente', 'LM', 'assistant'],
  ['Asistente', 'JC', 'assistant'],
];
const PERMS = [
  ['Agenda', 'Completa', 'Citas asignadas'],
  ['Pacientes', 'Completo', 'Asignados'],
  ['Inventario', 'Compras y salidas', 'Consulta y salidas'],
  ['Caja', 'Completa', null],
];

function EquipoUI() {
  return (
    <div className="sdl-ui sdl-ui--team">
      <Window title="Equipo y permisos" aside={<span className="sdl-ui__plan">3 / 3 usuarios · Básico</span>}>
        <div className="sdl-ui__people">
          {TEAM.map(([role, ini, kind], i) => (
            <div key={ini} className={`sdl-ui__person is-${kind}`} style={{ '--k': i }}>
              <span className="sdl-ui__avatar">{ini}</span>
              <span className="sdl-ui__role">{role}</span>
            </div>
          ))}
        </div>
        <div className="sdl-ui__perms">
          <span className="sdl-ui__ph" />
          <span className="sdl-ui__ph">Titular</span>
          <span className="sdl-ui__ph">Asistente</span>
          {PERMS.map(([mod, own, asst], i) => (
            <React.Fragment key={mod}>
              <span className="sdl-ui__pm" style={{ '--k': i }}>{mod}</span>
              <span className="sdl-ui__chip is-ok" style={{ '--k': i }}><Check size={12} />{own}</span>
              {asst ? (
                <span className="sdl-ui__chip is-part" style={{ '--k': i }}><Check size={12} />{asst}</span>
              ) : (
                <span className="sdl-ui__chip is-off" style={{ '--k': i }}><Lock size={12} />Sin acceso</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </Window>
      <div className="sdl-ui__float sdl-ui__float--bl">
        <ShieldCheck size={18} />
        <div>
          <p className="sdl-ui__strong">Caja solo para el titular</p>
          <p className="sdl-ui__muted">Cada usuario entra con su cuenta.</p>
        </div>
      </div>
    </div>
  );
}

const MAP = { agenda: AgendaUI, inventario: InventarioUI, caja: CajaUI, equipo: EquipoUI };

export default function ModuleMockup({ kind }) {
  const C = MAP[kind];
  return C ? <C /> : null;
}
