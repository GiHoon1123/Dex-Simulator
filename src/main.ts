import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DexSimulationModule } from './dex-simulation/dex-simulation.module';
import { MevSimulationModule } from './mev-simulation/mev-simulation.module';
import { BlockchainModule } from './shared/blockchain/blockchain.module';
import { MEVBotConfig } from './mev-simulation/types/mev.interface';

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
    .build();
  const documentBlockchain = SwaggerModule.createDocument(
    app,
    configBlockchain,
    {
      include: [BlockchainModule],
    },
  );
  SwaggerModule.setup('api/blockchain', app, documentBlockchain);

  // 4. MEV Simulation API 문서
  const configMev = new DocumentBuilder()
    .setTitle('MEV Simulation APIs')
    .setDescription('MEV 공격 시뮬레이션 API - Frontrun, Backrun, Sandwich')
    .setVersion('1.0')
    .addTag('MEV Simulation')
    .build();
  const documentMev = SwaggerModule.createDocument(app, configMev, {
    include: [MevSimulationModule],
  });
  SwaggerModule.setup('api/mev', app, documentMev);

  await app.listen(3000);
  console.log(`Application is running on: http://localhost:3000`);
  console.log(`Swagger:`);
  console.log(`  - All APIs:        http://localhost:3000/api`);
  console.log(`  - DEX Simulation:  http://localhost:3000/api/dex`);
  console.log(`  - Blockchain:      http://localhost:3000/api/blockchain`);
  console.log(`  - MEV Simulation:  http://localhost:3000/api/mev`);

  // 개발 환경에서 자동 시작
  if (process.env.NODE_ENV !== 'production') {
    const { BlockService } = await import('./shared/blockchain/block.service');
    const { TransactionGeneratorService } = await import(
      './shared/blockchain/transaction-generator.service'
    );
    const { MevBotService } = await import(
      './mev-simulation/services/mev-bot.service'
    );

    const blockService = app.get(BlockService);
    const txGeneratorService = app.get(TransactionGeneratorService);
    const mevBotService = app.get(MevBotService);

    // 자동 블록 생성 시작
    blockService.startAutoProduction();
    console.log('\n🔄 자동 블록 생성 시작됨');

    // 트랜잭션 자동 생성 시작
    txGeneratorService.startGenerating();
    console.log('🔄 트랜잭션 자동 생성 시작됨');

    // MEV 봇 시작
    const mevConfig = {
      minProfit: 0.01,
      maxRisk: 0.8,
      gasPriceMultiplier: 1.5,
      maxOpportunities: 10000000000,
      // maxOpportunities: 10,
      opportunityTimeout: 30000,
      minConfidence: 0.7,
      enabledStrategies: ['FRONT_RUN', 'BACK_RUN', 'SANDWICH'],
    };
    mevBotService.startBot(mevConfig as MEVBotConfig);
    console.log('🤖 MEV 봇 시작됨\n');
  }
}
bootstrap();
