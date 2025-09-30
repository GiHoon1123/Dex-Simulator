import { LpUser, Pool } from 'src/dex-simulation/lp/types/lp.interface';

describe('LpUser Interface', () => {
  it('LpUser 인터페이스가 올바르게 정의되어야 합니다', () => {
    // Given: LP 유저 객체
    const lpUser: LpUser = {
      id: 1,
      eth: 100,
      btc: 3000,
      share: 0.1,
      earnedEth: 0.05,
      earnedBtc: 0,
      governanceTokens: 10,
    };

    // Then: 모든 속성이 올바르게 정의되어야 함
    expect(lpUser.id).toBe(1);
    expect(lpUser.eth).toBe(100);
    expect(lpUser.btc).toBe(3000);
    expect(lpUser.share).toBe(0.1);
    expect(lpUser.earnedEth).toBe(0.05);
    expect(lpUser.earnedBtc).toBe(0);
    expect(lpUser.governanceTokens).toBe(10);
  });

  it('수치 속성들이 올바른 타입이어야 합니다', () => {
    // Given: LP 유저 객체
    const lpUser: LpUser = {
      id: 1,
      eth: 100,
      btc: 3000,
      share: 0.1,
      earnedEth: 0.05,
      earnedBtc: 0,
      governanceTokens: 10,
    };

    // Then: 수치 속성들이 올바른 타입이어야 함
    expect(typeof lpUser.id).toBe('number');
    expect(typeof lpUser.eth).toBe('number');
    expect(typeof lpUser.btc).toBe('number');
    expect(typeof lpUser.share).toBe('number');
    expect(typeof lpUser.earnedEth).toBe('number');
    expect(typeof lpUser.earnedBtc).toBe('number');
    expect(typeof lpUser.governanceTokens).toBe('number');
  });

  it('지분율이 0과 1 사이의 값이어야 합니다', () => {
    // Given: 다양한 지분율 값들
    const shareValues = [0, 0.1, 0.5, 0.9, 1];

    shareValues.forEach((share) => {
      const lpUser: LpUser = {
        id: 1,
        eth: 100,
        btc: 3000,
        share,
        earnedEth: 0.05,
        earnedBtc: 0,
        governanceTokens: 10,
      };

      // Then: 지분율이 0과 1 사이의 값이어야 함
      expect(lpUser.share).toBeGreaterThanOrEqual(0);
      expect(lpUser.share).toBeLessThanOrEqual(1);
    });
  });

  it('수수료 수익이 음수가 아니어야 합니다', () => {
    // Given: LP 유저 객체
    const lpUser: LpUser = {
      id: 1,
      eth: 100,
      btc: 3000,
      share: 0.1,
      earnedEth: 0.05,
      earnedBtc: 0.02,
      governanceTokens: 10,
    };

    // Then: 수수료 수익이 음수가 아니어야 함
    expect(lpUser.earnedEth).toBeGreaterThanOrEqual(0);
    expect(lpUser.earnedBtc).toBeGreaterThanOrEqual(0);
  });

  it('거버넌스 토큰이 음수가 아니어야 합니다', () => {
    // Given: LP 유저 객체
    const lpUser: LpUser = {
      id: 1,
      eth: 100,
      btc: 3000,
      share: 0.1,
      earnedEth: 0.05,
      earnedBtc: 0,
      governanceTokens: 10,
    };

    // Then: 거버넌스 토큰이 음수가 아니어야 함
    expect(lpUser.governanceTokens).toBeGreaterThanOrEqual(0);
  });
});

describe('Pool Interface', () => {
  it('Pool 인터페이스가 올바르게 정의되어야 합니다', () => {
    // Given: 풀 객체
    const pool: Pool = {
      eth: 1000,
      btc: 30000,
      k: 30000000,
      feeRate: 0.003,
      userCount: 10,
      users: [],
      initialPoolValue: 2000,
      currentPoolValue: 2000,
      poolSizeRatio: 1.0,
      volatility: {
        eth: 2.5,
        btc: 1.8,
        overall: 2.1,
      },
      lastVolatilityUpdate: new Date(),
    };

    // Then: 모든 속성이 올바르게 정의되어야 함
    expect(pool.eth).toBe(1000);
    expect(pool.btc).toBe(30000);
    expect(pool.k).toBe(30000000);
    expect(pool.feeRate).toBe(0.003);
    expect(pool.userCount).toBe(10);
    expect(pool.users).toEqual([]);
    expect(pool.initialPoolValue).toBe(2000);
    expect(pool.currentPoolValue).toBe(2000);
    expect(pool.poolSizeRatio).toBe(1.0);
    expect(pool.volatility).toBeDefined();
    expect(pool.lastVolatilityUpdate).toBeInstanceOf(Date);
  });

  it('수치 속성들이 올바른 타입이어야 합니다', () => {
    // Given: 풀 객체
    const pool: Pool = {
      eth: 1000,
      btc: 30000,
      k: 30000000,
      feeRate: 0.003,
      userCount: 10,
      users: [],
      initialPoolValue: 2000,
      currentPoolValue: 2000,
      poolSizeRatio: 1.0,
      volatility: {
        eth: 2.5,
        btc: 1.8,
        overall: 2.1,
      },
      lastVolatilityUpdate: new Date(),
    };

    // Then: 수치 속성들이 올바른 타입이어야 함
    expect(typeof pool.eth).toBe('number');
    expect(typeof pool.btc).toBe('number');
    expect(typeof pool.k).toBe('number');
    expect(typeof pool.feeRate).toBe('number');
    expect(typeof pool.userCount).toBe('number');
    expect(typeof pool.initialPoolValue).toBe('number');
    expect(typeof pool.currentPoolValue).toBe('number');
    expect(typeof pool.poolSizeRatio).toBe('number');
  });

  it('변동성 객체가 올바른 구조를 가져야 합니다', () => {
    // Given: 풀 객체
    const pool: Pool = {
      eth: 1000,
      btc: 30000,
      k: 30000000,
      feeRate: 0.003,
      userCount: 10,
      users: [],
      initialPoolValue: 2000,
      currentPoolValue: 2000,
      poolSizeRatio: 1.0,
      volatility: {
        eth: 2.5,
        btc: 1.8,
        overall: 2.1,
      },
      lastVolatilityUpdate: new Date(),
    };

    // Then: 변동성 객체가 올바른 구조를 가져야 함
    expect(pool.volatility).toHaveProperty('eth');
    expect(pool.volatility).toHaveProperty('btc');
    expect(pool.volatility).toHaveProperty('overall');

    expect(typeof pool.volatility.eth).toBe('number');
    expect(typeof pool.volatility.btc).toBe('number');
    expect(typeof pool.volatility.overall).toBe('number');
  });

  it('변동성 값들이 음수가 아니어야 합니다', () => {
    // Given: 풀 객체
    const pool: Pool = {
      eth: 1000,
      btc: 30000,
      k: 30000000,
      feeRate: 0.003,
      userCount: 10,
      users: [],
      initialPoolValue: 2000,
      currentPoolValue: 2000,
      poolSizeRatio: 1.0,
      volatility: {
        eth: 2.5,
        btc: 1.8,
        overall: 2.1,
      },
      lastVolatilityUpdate: new Date(),
    };

    // Then: 변동성 값들이 음수가 아니어야 함
    expect(pool.volatility.eth).toBeGreaterThanOrEqual(0);
    expect(pool.volatility.btc).toBeGreaterThanOrEqual(0);
    expect(pool.volatility.overall).toBeGreaterThanOrEqual(0);
  });

  it('수수료율이 올바른 범위에 있어야 합니다', () => {
    // Given: 다양한 수수료율 값들
    const feeRates = [0.0005, 0.001, 0.003, 0.005, 0.01];

    feeRates.forEach((feeRate) => {
      const pool: Pool = {
        eth: 1000,
        btc: 30000,
        k: 30000000,
        feeRate,
        userCount: 10,
        users: [],
        initialPoolValue: 2000,
        currentPoolValue: 2000,
        poolSizeRatio: 1.0,
        volatility: {
          eth: 2.5,
          btc: 1.8,
          overall: 2.1,
        },
        lastVolatilityUpdate: new Date(),
      };

      // Then: 수수료율이 올바른 범위에 있어야 함
      expect(pool.feeRate).toBeGreaterThanOrEqual(0);
      expect(pool.feeRate).toBeLessThanOrEqual(1);
    });
  });

  it('풀 크기 비율이 양수여야 합니다', () => {
    // Given: 풀 객체
    const pool: Pool = {
      eth: 1000,
      btc: 30000,
      k: 30000000,
      feeRate: 0.003,
      userCount: 10,
      users: [],
      initialPoolValue: 2000,
      currentPoolValue: 2000,
      poolSizeRatio: 1.0,
      volatility: {
        eth: 2.5,
        btc: 1.8,
        overall: 2.1,
      },
      lastVolatilityUpdate: new Date(),
    };

    // Then: 풀 크기 비율이 양수여야 함
    expect(pool.poolSizeRatio).toBeGreaterThan(0);
  });

  it('유저 수가 음수가 아니어야 합니다', () => {
    // Given: 풀 객체
    const pool: Pool = {
      eth: 1000,
      btc: 30000,
      k: 30000000,
      feeRate: 0.003,
      userCount: 10,
      users: [],
      initialPoolValue: 2000,
      currentPoolValue: 2000,
      poolSizeRatio: 1.0,
      volatility: {
        eth: 2.5,
        btc: 1.8,
        overall: 2.1,
      },
      lastVolatilityUpdate: new Date(),
    };

    // Then: 유저 수가 음수가 아니어야 함
    expect(pool.userCount).toBeGreaterThanOrEqual(0);
  });

  it('Date 속성이 올바른 타입이어야 합니다', () => {
    // Given: 풀 객체
    const pool: Pool = {
      eth: 1000,
      btc: 30000,
      k: 30000000,
      feeRate: 0.003,
      userCount: 10,
      users: [],
      initialPoolValue: 2000,
      currentPoolValue: 2000,
      poolSizeRatio: 1.0,
      volatility: {
        eth: 2.5,
        btc: 1.8,
        overall: 2.1,
      },
      lastVolatilityUpdate: new Date(),
    };

    // Then: Date 속성이 올바른 타입이어야 함
    expect(pool.lastVolatilityUpdate).toBeInstanceOf(Date);
  });
});
