import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PostsModule } from "./posts/posts.module";
import { RealtimeModule } from "./realtime/realtime.module";

@Module({
  imports: [
    ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: ".env",
      validate: (env) => {
        if (!env.SUPABASE_URL) throw new Error("SUPABASE_URL is required");
        if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
        return env;
      },
    }),
    RealtimeModule,
    PostsModule,
  ],
})
export class AppModule {}
