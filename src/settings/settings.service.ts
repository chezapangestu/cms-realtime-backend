import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN } from '../supabase/supabase.constants';

@Injectable()
export class SettingsService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
  ) {}

  /**
   * Ambil settings default (kita pakai 1 row saja, mis. id = "app")
   */
  async get(id = 'app') {
    const { data, error } = await this.supabase
      .from('settings')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);

    // kalau belum ada row, return default
    if (!data) {
      return { id, fields: {}, created_at: null, updated_at: null };
    }

    return data;
  }

  /**
   * Upsert fields ke settings (merge partial update)
   */
  async upsert(id = 'app', partialFields: Record<string, any>) {
    if (!partialFields || typeof partialFields !== 'object') {
      throw new BadRequestException('fields is required');
    }

    // ambil existing dulu biar merge (supaya PATCH-like)
    const existing = await this.get(id);
    const mergedFields = {
      ...(existing?.fields || {}),
      ...partialFields,
    };

    const { data, error } = await this.supabase
      .from('settings')
      .upsert({ id, fields: mergedFields }, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
