export const EXPORT_MODULES = {
  patients: { table: 'pacientes', key: 'pacientes', fields: 'id,nombre,dni,telefono,email,clinic_id,created_at,updated_at' },
  appointments: { table: 'citas', key: 'citas', fields: 'id,paciente_id,empleado_id,fecha_hora,motivo,estado,notas,clinic_id,created_at,updated_at' },
  inventory: { table: 'inventario', key: 'inventario', fields: 'id,producto,cantidad,stock_minimo,clinic_id,created_at,updated_at' },
  finances: { table: 'transacciones', key: 'transacciones', fields: 'id,paciente_id,monto,concepto,clinic_id,created_at' },
  staff: { table: 'profiles', key: 'staff', fields: 'id,email,nombre_completo,role,assistant_role,status,clinic_id,created_at,updated_at' },
};

// Fetch every selected module before allowing a download. A failed or truncated page
// must never become an apparently valid empty backup.
export async function collectClinicExport(client, { clinicId, clinicName, modules, signal }) {
  if (!clinicId) throw new Error('No se ha identificado la clínica.');
  const selected = Object.keys(EXPORT_MODULES).filter((key) => modules[key]);
  if (!selected.length) throw new Error('Selecciona al menos un módulo.');
  const payload = { exportedAt: new Date().toISOString(), clinicId, clinicName };
  for (const key of selected) {
    const spec = EXPORT_MODULES[key];
    const rows = [];
    let expectedCount;
    do {
      const { data, error, count } = await client.from(spec.table)
        .select(spec.fields, { count: 'exact' }).eq('clinic_id', clinicId)
        .order('id', { ascending: true }).range(rows.length, rows.length + 499).abortSignal(signal);
      if (error) throw error;
      if (!Array.isArray(data) || !Number.isInteger(count)) throw new Error('No se pudo verificar que la exportación esté completa.');
      if (expectedCount !== undefined && expectedCount !== count) throw new Error('Los registros cambiaron durante la exportación. Vuelve a intentarlo.');
      expectedCount = count;
      if (data.length === 0 && rows.length < count) throw new Error('La exportación recibida está incompleta.');
      // Whitelist again at the boundary; credentials never enter the download.
      rows.push(...data.map((row) => Object.fromEntries(spec.fields.split(',').map((field) => [field, row[field]]))));
    } while (rows.length < expectedCount);
    payload[spec.key] = rows;
  }
  return payload;
}

export function csvCell(value) {
  let text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  // Numeric cells are trusted data. Text cells can be controlled by users and
  // must not be interpreted as spreadsheet formulas when opened from a CSV.
  if (typeof value !== 'number' && (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text))) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function exportCsv(payload, moduleKey) {
  const spec = EXPORT_MODULES[moduleKey];
  if (!spec || !Array.isArray(payload[spec.key])) throw new Error('Selecciona un módulo disponible para CSV.');
  const fields = spec.fields.split(',');
  return [fields.map(csvCell).join(','), ...payload[spec.key].map((row) => fields.map((field) => csvCell(row[field])).join(','))].join('\r\n');
}

export function validateClinicExport(payload, clinicId) {
  if (!payload || Array.isArray(payload) || payload.clinicId !== clinicId) throw new Error('El archivo no pertenece a esta clínica.');
  const present = Object.values(EXPORT_MODULES).filter(({ key }) => Object.hasOwn(payload, key));
  if (!present.length) throw new Error('El archivo no contiene módulos reconocidos.');
  for (const { key } of present) {
    if (!Array.isArray(payload[key]) || payload[key].some((row) => !row || typeof row !== 'object' || Array.isArray(row) || typeof row.id !== 'string' || (row.clinic_id != null && row.clinic_id !== clinicId))) {
      throw new Error(`El módulo ${key} contiene registros incompatibles.`);
    }
  }
  return present.reduce((total, { key }) => total + payload[key].length, 0);
}
