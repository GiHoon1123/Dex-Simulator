import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DexSimulationModule } from './dex-simulation/dex-simulation.module';
import { SharedModule } from './shared/shared.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 전역 에러 핸들러 등록
  app.useGlobalFilters(new HttpExceptionFilter());

  // 1. 전체 API 문서
  const configAll = new DocumentBuilder()
    .setTitle('DEX Simulator - All APIs')
    .setDescription('전체 API 문서')
    .setVersion('1.0')
    .build();
  const documentAll = SwaggerModule.createDocument(app, configAll);
  SwaggerModule.setup('api', app, documentAll);

  // 2. DEX Simulation API 문서
  const configDex = new DocumentBuilder()
    .setTitle('DEX Simulation APIs')
    .setDescription(
      'DEX 작동 원리 시뮬레이션 API - LP, Trader, Market 관련 기능',
    )
    .setVersion('1.0')
    .addTag('Liquidity Providers (LP)')
    .addTag('Trader')
    .addTag('Market')
    .build();
  const documentDex = SwaggerModule.createDocument(app, configDex, {
    include: [DexSimulationModule],
  });
  SwaggerModule.setup('api/dex', app, documentDex);

  // 3. Blockchain API 문서
  const configBlockchain = new DocumentBuilder()
    .setTitle('Blockchain Simulation APIs')
    .setDescription(
      '블록체인 시뮬레이션 API - 트랜잭션 풀, 블록 생성, 가스 시스템',
    )
    .setVersion('1.0')
    .addTag('Blockchain')
    .addTag('Transaction Pool')
    .addTag('Gas')
    .build();
  const documentBlockchain = SwaggerModule.createDocument(
    app,
    configBlockchain,
    {
      include: [SharedModule],
    },
  );
  SwaggerModule.setup('api/blockchain', app, documentBlockchain);

  // 4. MEV Simulation API 문서 (나중에 추가)
  // const configMev = new DocumentBuilder()
  //   .setTitle('MEV Simulation APIs')
  //   .setDescription('MEV 공격 시뮬레이션 API - Frontrun, Backrun, Sandwich')
  //   .setVersion('1.0')
  //   .addTag('MEV')
  //   .build();
  // const documentMev = SwaggerModule.createDocument(app, configMev, {
  //   include: [MevSimulationModule],
  // });
  // SwaggerModule.setup('api/mev', app, documentMev);

  await app.listen(3000);
  console.log(`Application is running on: http://localhost:3000`);
  console.log(`Swagger:`);
  console.log(`  - All APIs:        http://localhost:3000/api`);
  console.log(`  - DEX Simulation:  http://localhost:3000/api/dex`);
  console.log(`  - Blockchain:      http://localhost:3000/api/blockchain`);
}
bootstrap();
