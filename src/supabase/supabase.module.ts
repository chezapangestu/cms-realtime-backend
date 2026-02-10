import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ADMIN } from "./supabase.constants";

@Module({
  providers: [
    {
      provide: SUPABASE_ADMIN,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>("SUPABASE_URL");
        const key = config.get<string>("SUPABASE_SERVICE_ROLE_KEY");

        if (!url) throw new Error("Missing env SUPABASE_URL");
        if (!key) throw new Error("Missing env SUPABASE_SERVICE_ROLE_KEY");

        return createClient(url, key, {
          auth: { persistSession: false },
        });
      },
    },
  ],
  exports: [SUPABASE_ADMIN],
})
export class SupabaseModule {}
