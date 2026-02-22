import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Put,
  Query,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { SettingsService } from './settings.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Controller()
export class SettingsController {
  constructor(
    private settings: SettingsService,
    private rt: RealtimeGateway,
  ) {}

  // GET /settings?id=app
  @Get('/settings')
  get(@Query('id') id?: string) {
    return this.settings.get(id || 'app');
  }

  // PUT /settings?id=app  body: { fields: {...} }  atau langsung object {...}
  @Put('/settings')
  async upsert(@Query('id') id: string | undefined, @Body() body: any) {
    const settingsId = id || 'app';

    // dukung 2 bentuk payload:
    // 1) { fields: {...} }
    // 2) { ticker_text: "...", slide_duration_ms: 5000 }
    const fields =
      body?.fields && typeof body.fields === 'object' ? body.fields : body;

    const saved = await this.settings.upsert(settingsId, fields);

    // ✅ realtime
    this.rt.emitSettingsUpdate(saved);

    return saved;
  }

  /**
   * POST /settings/upload-background
   * multipart/form-data
   * field name: file
   */
  @Post('/settings/upload-background')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
      },
    }),
  )
  async uploadBackground(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    return this.settings.uploadLandingBackground(file);
  }
}
