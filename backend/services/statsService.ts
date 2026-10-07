import { supabase } from '../utils/supabase';
import type { PlatformStatistics } from '../types';

export async function getPlatformStatistics(): Promise<PlatformStatistics | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.rpc('get_platform_statistics');

  if (error) {
    throw new Error(`Failed to load platform statistics: ${error.message}`);
  }

  return (data as PlatformStatistics | null) ?? null;
}
