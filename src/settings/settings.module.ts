import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { RealtimeModule } from 'src/realtime/realtime.module';
import { SupabaseModule } from 'src/supabase/supabase.module';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService],
  imports: [SupabaseModule, RealtimeModule],
  exports: [SettingsService],
})
export class SettingsModule {}
