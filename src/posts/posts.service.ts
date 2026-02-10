import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN } from '../supabase/supabase.constants';
import type { Multer } from 'multer';

type MediaType = 'images' | 'video' | 'popup_images' | 'popup_video' | null;

const VALID_MEDIA_TYPES = [
  'images',
  'video',
  'popup_images',
  'popup_video',
] as const;
type ValidMediaType = (typeof VALID_MEDIA_TYPES)[number];

@Injectable()
export class PostsService {
  private bucket: string;

  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
    private readonly config: ConfigService,
  ) {
    this.bucket = this.config.get<string>('SUPABASE_BUCKET') || 'cms-files';
  }

  async list() {
    const { data, error } = await this.supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async create(input: {
    fields: Record<string, string>;
    mediaType: MediaType;
    mediaUrls: string[];
    mediaPaths: string[];
  }) {
    if (!input.fields) throw new BadRequestException('fields is required');
    const mediaUrls = Array.isArray(input.mediaUrls) ? input.mediaUrls : [];
    const mediaPaths = Array.isArray(input.mediaPaths) ? input.mediaPaths : [];
    const mediaType = input.mediaType ?? null;

    // Kalau ada URL media, mediaType harus valid
    if (mediaUrls.length > 0) {
      if (!mediaType) {
        throw new BadRequestException(
          'mediaType is required when mediaUrls is provided',
        );
      }
      if (!VALID_MEDIA_TYPES.includes(mediaType as any)) {
        throw new BadRequestException(
          'mediaType must be images/video/popup_images/popup_video when mediaUrls is provided',
        );
      }

      // guard sederhana: popup_images tetap pakai endpoint images, popup_video tetap pakai endpoint video.
      // Ini optional tapi bagus untuk mencegah salah pasang.
      const isImageType =
        mediaType === 'images' || mediaType === 'popup_images';
      const isVideoType = mediaType === 'video' || mediaType === 'popup_video';
      if (!isImageType && !isVideoType) {
        throw new BadRequestException('Invalid mediaType');
      }
    }

    const { data, error } = await this.supabase
      .from('posts')
      .insert({
        fields: input.fields,
        media_type: mediaUrls.length > 0 ? mediaType : null,
        media_urls: mediaUrls,
        media_paths: mediaPaths,
      })
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async update(id: string, input: any) {
    const VALID_MEDIA_TYPES = [
      'images',
      'video',
      'popup_images',
      'popup_video',
    ] as const;

    // Ambil existing untuk cleanup
    const { data: existing, error: findErr } = await this.supabase
      .from('posts')
      .select('media_paths, media_urls, media_type')
      .eq('id', id)
      .single();

    if (findErr) throw new BadRequestException(findErr.message);

    const hasMediaUrls = Array.isArray(input.mediaUrls);
    const hasMediaPaths = Array.isArray(input.mediaPaths);
    const hasMediaType = input.mediaType !== undefined;

    // Normalisasi
    const nextMediaUrls = hasMediaUrls ? (input.mediaUrls ?? []) : undefined;
    const nextMediaPaths = hasMediaPaths ? (input.mediaPaths ?? []) : undefined;

    // Rules:
    // - jika mediaUrls dikirim kosong => clear media_type (null)
    // - jika mediaUrls dikirim ada isi => mediaType wajib valid
    // - jika mediaUrls tidak dikirim => mediaType hanya ikut kalau memang dikirim
    const nextMediaType =
      hasMediaUrls && Array.isArray(nextMediaUrls) && nextMediaUrls.length === 0
        ? null
        : hasMediaType
          ? input.mediaType
          : undefined;

    // Validasi: kalau set media_urls dan tidak kosong => media_type wajib valid
    if (
      hasMediaUrls &&
      Array.isArray(nextMediaUrls) &&
      nextMediaUrls.length > 0
    ) {
      // Ambil mediaType final: prioritas payload -> fallback existing (untuk kasus user kirim urls tanpa type)
      const mt =
        nextMediaType ??
        (hasMediaType ? input.mediaType : undefined) ??
        existing?.media_type ??
        null;

      if (!mt) {
        throw new BadRequestException(
          'mediaType is required when mediaUrls is provided',
        );
      }

      if (!VALID_MEDIA_TYPES.includes(String(mt) as any)) {
        throw new BadRequestException(
          'mediaType must be images/video/popup_images/popup_video when mediaUrls is provided',
        );
      }

      // Optional guard biar gak salah pasang:
      // popup_images tetap "keluarga gambar", popup_video tetap "keluarga video"
      const isImageType = mt === 'images' || mt === 'popup_images';
      const isVideoType = mt === 'video' || mt === 'popup_video';
      if (!isImageType && !isVideoType) {
        throw new BadRequestException('Invalid mediaType');
      }
    }

    // Jika media diganti (paths dikirim), hapus file lama
    if (hasMediaPaths) {
      const oldPaths: string[] = Array.isArray(existing?.media_paths)
        ? existing.media_paths
        : [];
      const newPaths: string[] = Array.isArray(nextMediaPaths)
        ? nextMediaPaths
        : [];

      const changed = oldPaths.join('|') !== newPaths.join('|');

      if (changed && oldPaths.length) {
        await this.supabase.storage.from(this.bucket).remove(oldPaths);
      }
    }

    const { data, error } = await this.supabase
      .from('posts')
      .update({
        ...(input.fields !== undefined ? { fields: input.fields } : {}),
        ...(nextMediaType !== undefined ? { media_type: nextMediaType } : {}),
        ...(nextMediaUrls !== undefined ? { media_urls: nextMediaUrls } : {}),
        ...(nextMediaPaths !== undefined
          ? { media_paths: nextMediaPaths }
          : {}),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async remove(id: string) {
    const { data: existing, error: findErr } = await this.supabase
      .from('posts')
      .select('media_paths')
      .eq('id', id)
      .single();

    if (findErr) throw new BadRequestException(findErr.message);

    const paths: string[] = Array.isArray(existing?.media_paths)
      ? existing.media_paths
      : [];
    if (paths.length) {
      await this.supabase.storage.from(this.bucket).remove(paths);
    }

    const { error } = await this.supabase.from('posts').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);

    return { id };
  }

  private assertImages(files: Multer.File[]) {
    for (const f of files) {
      const ok = ['image/png', 'image/jpeg'].includes(f.mimetype);
      if (!ok) throw new BadRequestException('Images must be PNG/JPG');
    }
  }

  private assertVideo(file: Multer.File) {
    const ok = ['video/mp4'].includes(file.mimetype);
    if (!ok) throw new BadRequestException('Video must be MP4');
  }

  async uploadImages(files: Multer.File[]) {
    if (!files?.length) throw new BadRequestException('files required');
    this.assertImages(files);

    const uploaded: { filePath: string; fileUrl: string }[] = [];
    for (const file of files) {
      const ext = file.originalname.split('.').pop() || 'jpg';
      const path = `images/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

      const { error: upErr } = await this.supabase.storage
        .from(this.bucket)
        .upload(path, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (upErr) throw new BadRequestException(upErr.message);

      const { data } = this.supabase.storage
        .from(this.bucket)
        .getPublicUrl(path);
      uploaded.push({ filePath: path, fileUrl: data.publicUrl });
    }

    return {
      mediaType: 'images' as const,
      mediaPaths: uploaded.map((x) => x.filePath),
      mediaUrls: uploaded.map((x) => x.fileUrl),
    };
  }

  async uploadVideo(file: Multer.File) {
    if (!file) throw new BadRequestException('file required');
    this.assertVideo(file);

    const path = `videos/${Date.now()}-${Math.random().toString(16).slice(2)}.mp4`;

    const { error: upErr } = await this.supabase.storage
      .from(this.bucket)
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });

    if (upErr) throw new BadRequestException(upErr.message);

    const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(path);

    return {
      mediaType: 'video' as const,
      mediaPaths: [path],
      mediaUrls: [data.publicUrl],
    };
  }
}
