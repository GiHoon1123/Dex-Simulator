# DEX / AMM 리서치: 안전성·검증·운영 가이드 (상세)

---

> **목표:** 이 문서는 `x·y=k` 계열 AMM(Automated Market Maker) 기반 DEX의 수학적 동작, 주요 위험, 라우터/싱글톤 아키텍처의 역할, MEV·프론트런·백런 관련 영향, 그리고 실무에서 ‘안전함’을 증명하기 위한 검증·시뮬레이션·운영 파이프라인을 **실행 가능한 수준으로** 정리한다. 공격 절차(악용 방법)는 제공하지 않으며, 방어·검증·투명성 확보 관점만 다룬다.

---

# 목차

1. TL; DR
2. Preface
3. Introduction: AMM와 운영 환경
4. Methodology & Scope
5. AMM(x·y=k) 핵심 수학(유도·예제)
6. 주요 취약점(개념)과 영향 분석
7. 라우팅 컨트랙트(Router): 설계·위험·권장 패턴
8. 싱글톤(Singleton) 아키텍처: 동기·장단점·검증 요구
9. MEV, 프론트런, 백런: 정의·영향·완화
10. Uniswap 진화(V1→V4): 설계 교훈
11. "안전하다"를 증명하는 검증 파이프라인
12. 실전 시뮬레이션 계획(포크·시나리오·메트릭)
13. 운영 매뉴얼(모니터링·알람·비상대응)
14. 결론 및 권고 액션 아이템
15. Appendix: 코드·쿼리·체크리스트

---

# 1. TL; DR

`x·y=k` AMM은 간결한 수학으로 유동성을 자동화하지만, 실제 안전성은 아래 세 요소의 조합에 의해 결정된다.

- **수학적 불변(invariant)**: 풀 내부에서 `amountOut` 계산식과 보존 법칙이 정확히 지켜지는지(컨트랙트 레벨).
- **경제적 취약성**: 슬리피지·임팩머넌트 로스·MEV(프론트런/백런 등)로 인한 실질 손실.
- **운영·검증 파이프라인**: 형식검증, 메인넷 포크 시뮬레이션, 퍼징, 정적분석, 외부 감사, 투명한 대시보드.

따라서 "안전"은 단일한 기술적 증명으로는 부족하며, **코드+경제+운영**의 삼중 방어와 정량적 보고가 필요하다.

---

# 2. Preface

이 문서는 연구/감사/투자자 보고서용으로 설계되었다. 독자는 다음과 같다: 프로토콜 개발자, 보안 감사자, 프로덕트 매니저, 투자자.  
문서는 공격 절차(구체적 트랜잭션 구성)를 제공하지 않으며, DEX를 '방어하고 검증'하기 위한 실용적 레시피(테스트·시뮬·운영 체크리스트)를 제공한다.

---

# 3. Introduction: AMM와 운영 환경

AMM(Automated Market Maker)은 온체인 시장 메커니즘을 `x·y=k`와 유사한 불변식으로 운영한다. 사용자는 `amountIn`을 넣고 `amountOut`을 얻는다. 간단한 아이디어지만, 실제 구동될 때는 다음 요인이 상호 작용한다.

- **트랜잭션 공개성(mempool)** → 블록 생성자의 우선권(재정렬)으로 MEV 발생 가능
- **토큰의 이질성** (fee-on-transfer, rebasing) → 라우팅/예상값 불일치
- **유동성 분포** (concentrated liquidity 등) → 자본 효율성과 특정 포지션 공격 표적화

이 문서는 위 환경을 반영해 설계·검증·운영 요건을 제시한다.

---

# 4. Methodology & Scope

**데이터/검증 수단**

- 정적 분석: Slither, MythX (스마트컨트랙트 코드)
- 형식검증: Certora, SMT 기반 도구
- 유닛/속성 테스트: Hardhat/Foundry + Echidna(Fuzz)
- 메인넷 포크 시뮬레이션: Anvil/Hardhat/Tenderly
- 경제 시뮬레이션: Monte-Carlo, 시나리오 기반 스트레스 테스트
- 모니터링: Prometheus/Grafana + 알림(Ops)

**범위**: 상수곱 AMM (+ concentrated liquidity), 라우터 설계, 싱글톤 아키텍처, MEV 관련 리스크, 운영·모니터링, 증명(형식적 + 시뮬레이션)

**제한**: 실제 공격 트랜잭션 제작/배포 방법은 다루지 않음.

---

# 5. AMM(x·y=k) 핵심 수학(유도·예제)

## 5.1 기본 유도 (수수료 포함)

현재 리저브: \(X, Y\). 사용자가 토큰 \(X\)를 `amountIn`만큼 넣고 수수료 \(f\)가 적용되면 실제 반영량은

\(\Delta x = amountIn\times(1 - f)\).

보존법칙(상수곱):

\((X + \Delta x)(Y - amountOut) = X \cdot Y\)

따라서:

\[ amountOut = Y - \frac{X \cdot Y}{X + \Delta x} = \frac{\Delta x \cdot Y}{X + \Delta x} \]

즉, 교환량은 입력 대비 비선형적으로 감소한다.

## 5.2 즉시 가격과 가격 변화

즉시(마켓) 가격: \(P = Y / X\).  
교환 이후 가격: \(P' = (Y - amountOut) / (X + \Delta x)\).  
이 차이가 슬리피지·price impact다.

## 5.3 임퍼머넌트 로스(IL)

가격 배율 \(r = P*{final} / P*{initial}\) 이면 LP의 상대 손실(단일 풀, 균등 비중 예시):

\[ IL(r) = 1 - \frac{2\sqrt{r}}{1 + r} \]

간단 예: r=2 → IL ≈ 5.7%.

## 5.4 숫자 예제 (직관)

- 초기: X=100 ETH, Y=100,000 USDC → P=1000 USDC/ETH.
- 사용자: 1 ETH swap (f=0.003) → \(\Delta x=0.997\) → amountOut ≈ \(0.997 \* 100000 / (100 + 0.997) ≈ 990.08\) USDC (대략)

(정확값은 소수점·반올림에 따라 달라짐 — 실제 유닛 테스트로 확인 필수)

---

# 6. 주요 취약점(개념)과 영향 분석

각 항목은 개념, 피해 대상, 정량적 영향(가능하면), 권장 완화책으로 구성.

## 6.1 가격 임팩트(Price Impact)

- **개념:** 큰 트랜잭션이 리저브를 변동시켜 체결 비율을 악화시킨다.
- **피해:** 사용자 슬리피지, LP의 IL 악화.
- **정량화:** amountIn 대비 price change 산출(수식 기반).
- **완화:** per-tx max impact, 분할(Split) 주문, 동적 수수료.

## 6.2 프론트런 / 샌드위치 (MEV)

- **개념:** mempool에 공개된 tx를 보고 공격자가 앞/뒤로 삽입해 차익을 얻음.
- **피해:** 사용자는 더 불리한 가격으로 체결한다.
- **완화:** private relays(Flashbots), batch settlement, 라우터 슬리피지 강제.

## 6.3 백런(아비트라지 계열)

- **개념:** tx 직후 생긴 가격 불균형을 따라붙어 차익을 먹음.
- **피해:** 기회 독점으로 인한 불공정성, 일부 LP·거래자는 간접적인 비용 부담.
- **완화:** 모니터링, cross-DEX 라우팅, auction 모델 연구.

## 6.4 플래시론 연계

- **개념:** 일시적 대규모 자금으로 가격 왜곡 후 회수.
- **피해:** 가격 조작성 거래로 인해 LP·사용자 피해.
- **완화:** per-tx limits, TWAP 보호, 오라클 집계 기간 증가.

## 6.5 오라클/가격 피드 조작

- **개념:** 외부 데이터에 의존할 때 단일 오라클 조작 가능.
- **완화:** 다중 오라클, 절사평균, 긴 집계 기간.

## 6.6 구현 취약성

- **개념:** 잘못된 수학·검증 미비·재진입 등 버그.
- **완화:** 정적분석, 형식검증, 다중 감사, fuzz testing.

---

# 7. 라우팅 컨트랙트(Router): 설계·위험·권장 패턴

## 7.1 역할 재정리

- 경로 최적화(멀티홉/스플릿)
- 슬리피지/데드라인 검사
- 토큰 수취·전달 오케스트레이션
- 가스·UX 고려한 경로 우선순위 결정

## 7.2 위험 포인트(설계부실 시)

1. 경로·amount 정보의 과도한 온체인 노출 → MEV 표적화 증가
2. fee-on-transfer 등 비표준 토큰 미대응
3. 멀티홉 원자성 미보장
4. per-tx limit 미설정

## 7.3 권장 구현 패턴

- `deadlines`와 `amountOutMin` 강제
- `nonReentrant` 보호
- `safeTransfer` 유틸 사용
- 실제 수령량 확인(transfer return value) 후 다음 홉 계산
- `getAmountsOut` view 제공(프론트엔드 검증)
- per-tx maxImpact 숫자화(예: 0.5% of pool liquidity)

## 7.4 라우팅 알고리듬(권장)

- 오프체인 후보 경로 생성: 길이 ≤ 3, 피벗 토큰 제한(WETH/USDC 등)
- 각 후보 경로 시뮬: getAmountOut(연쇄)
- netGain = amountOut - gasCostInToken 으로 순위 결정
- 큰 주문→split heuristic(등분 또는 convex solve 근사)

## 7.5 UX 권장

- 예상 amount + slippage 확률(시뮬 결과 기반) 노출
- private tx 옵션 안내(Flashbots)
- large order warning modal

---

# 8. 싱글톤(Singleton) 아키텍처: 동기·장단점·검증 요구

## 8.1 개념

하나의 컨트랙트로 모든 풀 로직을 처리하고, 풀별 상태는 storage(맵핑)로 분리.

## 8.2 장점

- 가스 절감(코드 재사용)
- 배포·감사 비용 절감(코드 1회 감사로 전체 커버)
- 훅/플러그인으로 풀별 정책 적용 가능

## 8.3 위험

- 단일 실패 지점(SPoF) — 버그시 전 풀 노출
- hook 악용 가능(검증 없이 등록되면)
- 복잡한 storage 인덱싱으로 인한 실수 위험

## 8.4 검증 요구사항

- 형식검증(formal verification) 권장
- hook 등록 프로세스(심사 + timelock)
- 권한 분리: 운영자 emergency stop은 최소화, 멀티시그+timelock

---

# 9. MEV, 프론트런, 백런: 정의·영향·완화

## 9.1 정의 요약

- **MEV:** 블록 프로듀서가 트랜잭션 순서/포함을 조작하여 추출할 수 있는 최대 가치
- **프론트런:** 유저 tx 앞에 거래를 넣어 가격을 유리하게 조작
- **백런:** 유저 tx 직후 생긴 기회를 잡아 차익을 얻음
- **샌드위치:** 앞+뒤로 끼워 차익 확보

## 9.2 실무적 영향

- 유저 경험 악화
- 가스 경쟁 심화
- 프로토콜 신뢰성 저하

## 9.3 완화 수단(우선순위)

1. Private relays(Flashbots, mev-boost)을 통한 tx 전송 옵션
2. Batch settlement/auction(동시 처리로 순서 의미 축소)
3. UI-level 권장 설정(슬리피지) + large order 경고
4. 라우터 private tx 연동(옵션)

---

# 10. Uniswap 진화(V1→V4): 설계 교훈

- **V1:** 단순, 적은 공격면
- **V2:** ERC20↔ERC20, TWAP(온체인 오라클), flash swaps — 온체인 가격 데이터 필요성 인식
- **V3:** Concentrated liquidity — 자본 효율 ↑, 전략적 복잡성·IL 계산 복잡성 ↑
- **V4:** Singleton + Hooks — 가스·감사 효율 ↑, 단일 실패 위험·hook 검증 필요

**요지:** 기능 추가는 경제적 이득을 주지만, 항상 더 많은 검증·감사·운영 절차를 요구한다.

---

# 11. "안전하다"를 증명하는 검증 파이프라인

아래는 코드·경제·운영 각 레이어 별 필수 항목이다.

## 11.1 코드 레이어 (기계적 증명)

- Unit tests: swap formulas, edge cases, transfer-fee tokens
- Property-based tests(Echidna)
- Static analysis: Slither, MythX
- Formal verification: Certora or SMT proofs for invariants
- External audits (min 2) + public bug bounty

**핵심 불변(예시)**: reserves non-negative, total token conservation, per-tx max impact never bypassed, no unauthorized mint/burn

## 11.2 경제 레이어 (시뮬레이션)

- 메인넷 포크: flash-loan-like influx, large swaps, oracle delay
- Monte-Carlo: volatility scenarios, trader behavior models
- MEV sim: tx reorder/insert impact quantification

**출력 양식(권장)**: "X% 신뢰구간에서 Y% 손실 초과 확률 Z%" 형태

## 11.3 운영 레이어 (투명성)

- 대시보드: pool_health, price_gap, large_tx_alerts
- 공개 문서: audits, sim results, emergency procedures

---

# 12. 실전 시뮬레이션 계획(포크·시나리오·메트릭)

## 12.1 준비

- Tools: Anvil/Foundry, Hardhat, Tenderly, Python (pandas, numpy)
- Dataset: 메인넷 블록/풀 상태(특정 블록 포크)
- Actors: honest users, LPs, attacker bots(시뮬), MEV block builder

## 12.2 핵심 시나리오 (각각 스크립트화)

1. **대량 단일 스왑** (single large trade) — price impact, LP PnL
2. **스플릿 주문 전략** (N-split) — price improvement vs gas cost
3. **MEV 샌드위치** (재정렬 시뮬) — user loss 측정(방어 전/후)
4. **오라클 지연** — TWAP vs instantaneous oracle comparison
5. **싱글톤 훅 악성 입력** — hook 동작 검증 + 시나리오 차단

## 12.3 메트릭

- user received amount vs expected
- LP PnL 분포
- price_gap(AMM vs oracle)
- attacker's profit
- fraction of pool liquidity impacted

---

# 13. 운영 매뉴얼(모니터링·알람·비상대응)

## 13.1 핵심 모니터링 지표

- Price gap (AMM price vs multioracle median)
- Single tx impact (%)
- Top contributor address concentration
- Realized slippage distribution

## 13.2 알람 규칙 예시

- price_gap > 5%: ALERT + operator review
- single_tx > 2% liquidity: BLOCK / REVIEW
- repeated large tx by same addr (N times within window): FLAG

## 13.3 비상대응 절차

- emergency multisig pause (pre-registered signers, SLA)
- public incident notice template
- replayable fork-scripts 위치 공개(내부)

---

# 14. 결론 및 권고 액션 아이템

**결론:** AMM의 수학은 단순하지만, 실질적 '안전'은 코드·경제·운영의 조합 증명으로 확보되어야 한다.

**권고(우선순위)**

1. 형식검증: 핵심 invariants Certora/SMT로 증명
2. 메인넷 포크 5개 시나리오 자동화 및 결과 공개
3. 라우터 정책 강제화: amountOutMin, deadline, per-tx limit
4. 싱글톤 도입시 hook 등록 프로세스(심사+timelock) 마련
5. 공개 모니터링 대시보드 구축

---

# 15. Appendix

## A. 라우터 의사코드(방어형)

```solidity
// pseudocode (defensive)
function swapExactTokensForTokens(amountIn, amountOutMin, path[], to, deadline) external nonReentrant {
    require(block.timestamp <= deadline, "Expired");
    require(amountIn <= perTxMaxAmount, "exceeds per-tx limit");

    uint received = safeTransferFromAndReturnAmount(path[0], msg.sender, address(this), amountIn);

    uint[] memory amounts = getAmountsOut(received, path);
    require(amounts[amounts.length - 1] >= amountOutMin, "Slippage too high");

    require(calculateImpact(received, path[0], path[1]) <= maxImpactBps, "Impact too high");

    // execute swaps atomically
}
```

## B. Hardhat 포크 시나리오 의사코드

```js
// pseudocode
await network.provider.request({
  method: 'hardhat_reset',
  params: [{ forking: { jsonRpcUrl: MAINNET_URL, blockNumber: BLOCK } }],
});
// set up actor wallets, fund, impersonate big addresses
// run scenario scripts
await simulateLargeSwap(poolAddress, user, amount);
collectMetrics();
```

## C. Dune SQL 예시 (ERC20 transfers 일별 합계)

```sql
SELECT date_trunc('day', block_time) AS day, sum(amount) as volume
FROM erc20."erc20_Transfers"
WHERE token_address = '\x...'
GROUP BY 1
ORDER BY 1;
```

## D. 감사 체크리스트 요약

- [ ] 핵심 수학적 불변(invariants) 문서화
- [ ] unit test coverage ≥ 90%
- [ ] property-based tests 포함(Echidna)
- [ ] static analysis reports (Slither, MythX)
- [ ] formal verification artifacts (if available)
- [ ] mainnet-fork simulation reports (≥3 scenarios)
- [ ] operational dashboard + alert rules

---
