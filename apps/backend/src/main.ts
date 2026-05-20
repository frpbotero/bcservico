// Backend NestJS — Fase 3
// Este módulo será implementado na Fase 3 com: autenticação JWT,
// endpoints de sincronização e coleta de assinaturas digitais.

import { NestFactory } from "@nestjs/core";
import { Module } from "@nestjs/common";
import { Controller, Get } from "@nestjs/common";

@Controller()
class AppController {
  @Get("health")
  health() {
    return { status: "ok", message: "App Cautelas Backend — Fase 3 pendente" };
  }
}

@Module({ controllers: [AppController] })
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  console.log("Backend rodando em http://localhost:3000");
}

bootstrap();
