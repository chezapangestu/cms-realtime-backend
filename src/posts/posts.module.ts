import { Module } from "@nestjs/common";
import { PostsController } from "./posts.controller";
import { PostsService } from "./posts.service";
import { RealtimeModule } from "../realtime/realtime.module";
import { SupabaseModule } from "../supabase/supabase.module";

@Module({
  imports: [RealtimeModule, SupabaseModule],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
