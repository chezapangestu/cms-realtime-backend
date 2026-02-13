import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowList = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((s) =>
      s
        .trim()
        .replace(/^'+|'+$/g, '')
        .replace(/^"+|"+$/g, ''),
    ) // buang ' atau " kalau ada
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // request dari curl/server kadang tidak punya Origin
      if (!origin) return callback(null, true);

      // exact match allowlist
      if (allowList.includes(origin)) return callback(null, true);

      // allow all vercel deployments (preview + production)
      try {
        const host = new URL(origin).hostname;
        if (host.endsWith('.vercel.app')) return callback(null, true);
      } catch {}

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  });

  await app.listen(process.env.PORT || 3001, '0.0.0.0');
}
bootstrap();
