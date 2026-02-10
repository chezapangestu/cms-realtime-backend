import {
  Body, Controller, Delete, Get, Param, Post, Put,
  UploadedFiles, UploadedFile, UseInterceptors
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { PostsService } from "./posts.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import type { Multer } from "multer";

@Controller()
export class PostsController {
  constructor(private posts: PostsService, private rt: RealtimeGateway) {}

  @Get("/posts")
  list() {
    return this.posts.list();
  }

  @Post("/upload/images")
  @UseInterceptors(FilesInterceptor("files", 10))
  uploadImages(@UploadedFiles() files: Multer.File[]) {
    return this.posts.uploadImages(files);
  }

  @Post("/upload/video")
  @UseInterceptors(FileInterceptor("file"))
  uploadVideo(@UploadedFile() file: Multer.File) {
    return this.posts.uploadVideo(file);
  }

  @Post("/posts")
  async create(@Body() body: any) {
    const post = await this.posts.create(body);
    this.rt.emitUpsert(post);
    return post;
  }

  @Put("/posts/:id")
  async update(@Param("id") id: string, @Body() body: any) {
    const post = await this.posts.update(id, body);
    this.rt.emitUpsert(post);
    return post;
  }

  @Delete("/posts/:id")
  async remove(@Param("id") id: string) {
    const res = await this.posts.remove(id);
    this.rt.emitDelete(id);
    return res;
  }
}
