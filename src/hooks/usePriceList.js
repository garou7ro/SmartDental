import { useMemo } from 'react';
import useSupabaseQuery from './useSupabaseQuery';
import { supabase } from '../lib/supabaseClient';
import { parsePriceList } from '../lib/quote';

const MISSING_COLUMN = ['42703', 'PGRST204'];

/**
 * Tarifario de la clínica (clinics.price_list). Si la columna aún no existe en la base, devuelve
 * los precios referenciales y `available: false` para que la interfaz no ofrezca guardarlo.
 */
export default function usePriceList(clinicId) {
  const query = useSupabaseQuery(
    async (signal) => {
      const { data, error } = await supabase.from('clinics').select('price_list').eq('id', clinicId).abortSignal(signal).maybeSingle();
      if (error && MISSING_COLUMN.includes(error.code)) return { raw: null, available: false };
      if (error) throw error;
      return { raw: data?.price_list || null, available: true };
    },
    { key: `prices:${clinicId}`, enabled: !!clinicId },
  );
  const parsed = useMemo(() => parsePriceList(query.data?.raw), [query.data]);
  return { ...query, ...parsed, available: query.data?.available !== false };
}
