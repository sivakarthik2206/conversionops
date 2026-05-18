import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./worker.module";
import { logger } from "@conversionops/observability";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  logger.info("ConversionOps Worker started");
  await app.init();
}

bootstrap().catch(console.error);
