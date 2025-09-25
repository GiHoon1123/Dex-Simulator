import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './app.module';

describe('DEX 시뮬레이터 통합 테스트', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('LP 모듈 통합 테스트', () => {
    it('풀 초기화부터 상태 조회까지 전체 플로우가 정상 작동해야 한다', async () => {
      // 1. 풀 초기화
      const initResponse = await request(app.getHttpServer())
        .post('/lp/init')
        .expect(201);

      expect(initResponse.body.eth).toBe(1000);
      expect(initResponse.body.btc).toBe(30000);
      expect(initResponse.body.k).toBe(30000000);
      expect(initResponse.body.userCount).toBe(10);
      expect(initResponse.body.users).toHaveLength(10);
      expect(initResponse.body.feeRate).toBe(0.003);

      // 2. 풀 상태 조회
      const statusResponse = await request(app.getHttpServer())
        .get('/lp/status')
        .expect(200);

      expect(statusResponse.body.eth).toBe(1000);
      expect(statusResponse.body.btc).toBe(30000);
      expect(statusResponse.body.userCount).toBe(10);

      // 3. 유저 추가
      const addUserResponse = await request(app.getHttpServer())
        .post('/lp/add-user')
        .expect(201);

      expect(addUserResponse.body.userCount).toBe(11);

      // 4. 유저 제거
      const removeUserResponse = await request(app.getHttpServer())
        .delete('/lp/remove-user')
        .expect(200);

      expect(removeUserResponse.body.userCount).toBe(10);
    });

    it('초기화되지 않은 풀에서 상태 조회 시 에러가 발생해야 한다', async () => {
      await request(app.getHttpServer())
        .get('/lp/status')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('풀이 초기화되지 않았습니다');
        });
    });
  });

  describe('Market 모듈 통합 테스트', () => {
    it('시장 가격 조회부터 변동 시뮬레이션까지 전체 플로우가 정상 작동해야 한다', async () => {
      // 1. 현재 가격 조회
      const currentPriceResponse = await request(app.getHttpServer())
        .get('/market/status')
        .expect(200);

      expect(currentPriceResponse.body.currentPrice.eth).toBeDefined();
      expect(currentPriceResponse.body.currentPrice.btc).toBeDefined();
      expect(currentPriceResponse.body.currentPrice.ratio).toBeDefined();
      expect(currentPriceResponse.body.volatility).toBeDefined();

      // 2. 가격 변동 시뮬레이션
      const priceChangeResponse = await request(app.getHttpServer())
        .post('/market/simulate-price-change')
        .expect(201);

      expect(priceChangeResponse.body.eventId).toMatch(/^price_change_\d+$/);
      expect(priceChangeResponse.body.previousPrice).toBeDefined();
      expect(priceChangeResponse.body.currentPrice).toBeDefined();
      expect(priceChangeResponse.body.change.eth).toBeDefined();
      expect(priceChangeResponse.body.change.btc).toBeDefined();
      expect(priceChangeResponse.body.volatility).toBeDefined();

      // 3. 아비트라지 기회 체크
      const arbitrageResponse = await request(app.getHttpServer())
        .post('/market/check-arbitrage')
        .expect(200);

      expect(arbitrageResponse.body.message).toBe('아비트라지 기회 체크 완료');
    });
  });

  describe('Trader 모듈 통합 테스트', () => {
    beforeEach(async () => {
      // 각 테스트 전에 풀 초기화
      await request(app.getHttpServer())
        .post('/lp/init')
        .expect(201);
    });

    it('랜덤 거래 실행이 정상 작동해야 한다', async () => {
      const tradeResponse = await request(app.getHttpServer())
        .post('/trader/execute-random-trade')
        .expect(201);

      expect(tradeResponse.body.trade).toBeDefined();
      expect(tradeResponse.body.trade.id).toMatch(/^trade_\d+$/);
      expect(['ETH', 'BTC']).toContain(tradeResponse.body.trade.from);
      expect(['ETH', 'BTC']).toContain(tradeResponse.body.trade.to);
      expect(tradeResponse.body.trade.from).not.toBe(tradeResponse.body.trade.to);
      expect(tradeResponse.body.trade.amountIn).toBeGreaterThan(0);
      expect(tradeResponse.body.trade.amountOut).toBeGreaterThan(0);
      expect(tradeResponse.body.trade.fee).toBeGreaterThan(0);
      expect(tradeResponse.body.poolBefore).toBeDefined();
      expect(tradeResponse.body.poolAfter).toBeDefined();
      expect(tradeResponse.body.priceInfo).toBeDefined();
    });

    it('아비트라지 거래 실행이 정상 작동해야 한다', async () => {
      const arbitrageResponse = await request(app.getHttpServer())
        .post('/trader/execute-arbitrage')
        .expect(201);

      expect(arbitrageResponse.body.message).toBeDefined();
      
      // 기회가 있을 수도 있고 없을 수도 있음
      if (arbitrageResponse.body.opportunity) {
        expect(arbitrageResponse.body.opportunity.opportunityId).toMatch(/^manual_arbitrage_\d+$/);
        expect(arbitrageResponse.body.opportunity.percentage).toBeGreaterThan(5);
        expect(arbitrageResponse.body.trade).toBeDefined();
      } else {
        expect(arbitrageResponse.body.message).toContain('아비트라지 기회가 없습니다');
      }
    });

    it('초기화되지 않은 풀에서 거래 실행 시 에러가 발생해야 한다', async () => {
      // 풀을 초기화하지 않은 상태에서 거래 시도
      const newApp = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      const freshApp = newApp.createNestApplication();
      await freshApp.init();

      await request(freshApp.getHttpServer())
        .post('/trader/execute-random-trade')
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('풀이 초기화되지 않았습니다');
        });

      await freshApp.close();
    });
  });

  describe('전체 시스템 통합 테스트', () => {
    it('시장 가격 변동부터 아비트라지 거래까지 전체 플로우가 정상 작동해야 한다', async () => {
      // 1. 풀 초기화
      await request(app.getHttpServer())
        .post('/lp/init')
        .expect(201);

      // 2. 초기 풀 상태 확인
      const initialStatus = await request(app.getHttpServer())
        .get('/lp/status')
        .expect(200);

      const initialEth = initialStatus.body.eth;
      const initialBtc = initialStatus.body.btc;
      const initialUserTokens = initialStatus.body.users[0].governanceTokens;

      // 3. 가격 변동 시뮬레이션
      await request(app.getHttpServer())
        .post('/market/simulate-price-change')
        .expect(201);

      // 4. 랜덤 거래 실행
      const tradeResponse = await request(app.getHttpServer())
        .post('/trader/execute-random-trade')
        .expect(201);

      // 5. 거래 후 풀 상태 확인
      const afterTradeStatus = await request(app.getHttpServer())
        .get('/lp/status')
        .expect(200);

      // 6. 거래로 인한 변화 확인
      expect(afterTradeStatus.body.eth).not.toBe(initialEth);
      expect(afterTradeStatus.body.btc).not.toBe(initialBtc);
      expect(afterTradeStatus.body.users[0].governanceTokens).toBeGreaterThan(initialUserTokens);
      expect(afterTradeStatus.body.users[0].earnedEth).toBeGreaterThan(0);

      // 7. 아비트라지 기회 체크
      await request(app.getHttpServer())
        .post('/market/check-arbitrage')
        .expect(200);

      // 8. 아비트라지 거래 실행
      const arbitrageResponse = await request(app.getHttpServer())
        .post('/trader/execute-arbitrage')
        .expect(201);

      // 9. 아비트라지 거래 결과 확인
      if (arbitrageResponse.body.opportunity) {
        expect(arbitrageResponse.body.opportunity.percentage).toBeGreaterThan(5);
        expect(arbitrageResponse.body.trade).toBeDefined();
        
        // 아비트라지 거래 후 풀 상태 재확인
        const finalStatus = await request(app.getHttpServer())
          .get('/lp/status')
          .expect(200);

        expect(finalStatus.body.users[0].governanceTokens).toBeGreaterThan(afterTradeStatus.body.users[0].governanceTokens);
      }
    });

    it('여러 번의 거래와 가격 변동이 누적되어 정상 작동해야 한다', async () => {
      // 1. 풀 초기화
      await request(app.getHttpServer())
        .post('/lp/init')
        .expect(201);

      // 2. 여러 번의 가격 변동
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/market/simulate-price-change')
          .expect(201);
      }

      // 3. 여러 번의 거래 실행
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/trader/execute-random-trade')
          .expect(201);
      }

      // 4. 최종 상태 확인
      const finalStatus = await request(app.getHttpServer())
        .get('/lp/status')
        .expect(200);

      expect(finalStatus.body.users[0].governanceTokens).toBeGreaterThan(0);
      expect(finalStatus.body.users[0].earnedEth).toBeGreaterThan(0);
      expect(finalStatus.body.volatility.eth).toBeGreaterThan(0);
      expect(finalStatus.body.volatility.btc).toBeGreaterThan(0);
    });
  });
});
