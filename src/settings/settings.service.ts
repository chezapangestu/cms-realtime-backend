import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN } from '../supabase/supabase.constants';
import { randomUUID } from 'crypto';
import { extname } from 'path';

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

  /**
   * Upload image background landing ke Supabase Storage
   * return public URL + path
   */
  async uploadLandingBackground(file: Express.Multer.File) {
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMime.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only JPG, PNG, and WEBP images are allowed',
      );
    }

    // extra safeguard (controller juga sudah limit)
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new BadRequestException('File too large. Max 10MB');
    }

    // bucket bisa pakai env khusus atau fallback
    const bucket =
      process.env.SUPABASE_STORAGE_BUCKET_CMS_ASSETS ||
      process.env.SUPABASE_STORAGE_BUCKET ||
      'cms-assets';

    const originalExt = (extname(file.originalname || '') || '').toLowerCase();

    const ext =
      originalExt && ['.jpg', '.jpeg', '.png', '.webp'].includes(originalExt)
        ? originalExt
        : file.mimetype === 'image/png'
          ? '.png'
          : file.mimetype === 'image/webp'
            ? '.webp'
            : '.jpg';

    const filePath = `settings/landing-backgrounds/${Date.now()}-${randomUUID()}${ext}`;

    const { error: uploadError } = await this.supabase.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
        cacheControl: '3600',
      });

    if (uploadError) {
      throw new InternalServerErrorException(uploadError.message);
    }

    const { data } = this.supabase.storage.from(bucket).getPublicUrl(filePath);

    const publicUrl = data?.publicUrl;
    if (!publicUrl) {
      throw new InternalServerErrorException('Failed to generate public URL');
    }

    return {
      url: publicUrl,
      path: filePath,
      bucket,
    };
  }
}
