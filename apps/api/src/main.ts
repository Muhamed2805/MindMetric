import { existsSync } from "node:fs";
import { resolve } from "node:path";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";

const rootEnv = resolve(process.cwd(), "../../.env");
if (existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
}

process.env.MINDMETRIC_PROCESS = "api";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: false,
      bodyLimit: 32 * 1024,
      trustProxy: true,
    }),
  );

  app.setGlobalPrefix("v1", { exclude: ["health"] });
  app.enableShutdownHooks();

  const webOrigin = process.env.WEB_ORIGIN;
  if (webOrigin) {
    app.enableCors({
      origin: webOrigin,
      credentials: true,
    });
  }

  const port = Number(process.env.API_PORT ?? 3001);
  const host = process.env.API_HOST ?? "0.0.0.0";
  await app.listen({ port, host });
}

void bootstrap();
