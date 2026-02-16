import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGIN || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    credentials: true,
  },
})
export class RealtimeGateway {
  @WebSocketServer()
  server!: Server;

  emitUpsert(post: any) {
    this.server.emit('post:upsert', post);
  }

  emitDelete(id: string) {
    this.server.emit('post:delete', { id });
  }

  emitSettingsUpdate(settings: any) {
    this.server.emit('settings:update', settings);
  }
}
