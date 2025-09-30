# DEX / AMM 리서치: 안전성·검증·운영 가이드 (상세 확장판)

---

> **목표:** 이 문서는 DEX/AMM의 수학적 원리부터 실제 보안 위험, 그리고 안전한 설계와 검증 방법까지 종합적으로 살펴봤습니다.
> 이론적 배경과 실제 사례를 통해 DEX 생태계의 안전성 향상 방향을 제시하고자 합니다.

---

# 목차

1. TL; DR
2. Preface
3. Introduction: AMM와 운영 환경
4. 리서치 범위
5. AMM(x·y=k) 핵심 수학(유도·예제)
6. 주요 취약점(개념)과 영향 분석
7. 보안 취약점 실사례 분석
8. 라우팅 컨트랙트(Router): 설계·위험·권장 패턴
9. 싱글톤(Singleton) 아키텍처: 동기·장단점·검증 요구
10. MEV, 프론트런, 백런: 정의·영향·완화
11. Uniswap 진화(V1→V4): 설계 교훈
12. Uniswap 버전별 상세 분석
13. "안전하다"를 증명하는 검증 파이프라인
14. 검증 기법 실무 가이드
15. 실전 시뮬레이션 계획(포크·시나리오·메트릭)
16. 결론 및 권고 액션 아이템

---

# 1. TL; DR

```math
x \cdot y = k
```

AMM은 간결한 수학으로 유동성을 자동화하지만, 실제 안전성은 아래 세 요소의 조합에 의해 결정된다.

- **수학적 불변(invariant)**: 풀 내부에서 `amountOut` 계산식과 보존 법칙이 정확히 지켜지는지(컨트랙트 레벨).
- **경제적 취약성**: 슬리피지·임팩머넌트 로스·MEV(프론트런/백런 등)로 인한 실질 손실.
- **운영·검증 파이프라인**: 형식검증, 메인넷 포크 시뮬레이션, 퍼징, 정적분석, 외부 감사, 투명한 대시보드.

따라서 "안전"은 단일한 기술적 증명으로는 부족하며, **코드+경제+운영**의 삼중 방어와 정량적 보고가 필요하다.

---

# 2. Preface

이 문서는 DEX와 AMM에 관심 있는 사람들이 개념과 안전성 이슈를 쉽게 정리해서 볼 수 있도록 만든 자료다.  
실제 투자자 보고서나 전문 감사 문서는 아니며, 학습·토론·실습 같은 가벼운 용도를 염두에 두었다.

여기서는 공격 절차나 구체적인 해킹 방법은 다루지 않고, **안전하게 설계하고 확인할 때 필요한 아이디어와 체크리스트** 위주로 다룬다.

---

# 3. Introduction: AMM와 운영 환경

AMM(Automated Market Maker)은 온체인 시장 메커니즘을 다음과 같은 불변식으로 운영한다:

```math
x \cdot y = k
```

사용자는 `amountIn`을 넣고 `amountOut`을 얻는다. 간단한 아이디어지만, 실제 구동될 때는 다음 요인이 상호 작용한다.

- **트랜잭션 공개성(mempool)** → 블록 생성자의 우선권(재정렬)으로 MEV 발생 가능
- **토큰의 이질성** (fee-on-transfer, rebasing) → 라우팅/예상값 불일치
- **유동성 분포** (concentrated liquidity 등) → 자본 효율성과 특정 포지션 공격 표적화

이 문서는 위 환경을 반영해 설계·검증·운영 요건을 제시한다.

![](https://velog.velcdn.com/images/rlaejrqo465/post/6a46c3e5-a770-4fa3-896f-85e4a198ac2e/image.png)

---

# 4. 리서치 범위

본 리서치에서는 상수곱 AMM 기반 DEX의 수학적 원리, 보안 취약점, 그리고 안전성 확보 방안을 살펴봤습니다.
이론적 분석과 실제 사례를 통해 DEX 생태계의 안전성 향상 방향을 제시해봤습니다.

**다루는 내용**: 상수곱 AMM, 라우터 설계, 싱글톤 아키텍처, MEV 관련 리스크, 검증 방법론

**제한**: 실제 공격 트랜잭션 제작/배포 방법은 다루지 않음.

---

# 5. AMM(x·y=k) 핵심 수학(유도·예제)

AMM의 핵심인 상수곱 공식의 수학적 원리를 상세히 유도해봤습니다:

```math
x \cdot y = k
```

수수료가 포함된 실제 교환량 계산, 가격 임팩트, 임퍼머넌트 로스 등 AMM의 수학적 기초를 체계적으로 살펴봤습니다.

## 5.1 기본 유도 (수수료 포함)

현재 리저브: $X, Y$. 사용자가 토큰 $X$를 `amountIn`만큼 넣고 수수료 $f$가 적용되면 실제 반영량은

```math
\Delta x = amountIn \times (1 - f)
```

보존법칙(상수곱):

```math
(X + \Delta x)(Y - amountOut) = X \cdot Y
```

따라서:

```math
amountOut = Y - \frac{X \cdot Y}{X + \Delta x} = \frac{\Delta x \cdot Y}{X + \Delta x}
```

즉, 교환량은 입력 대비 비선형적으로 감소한다.

## 5.2 즉시 가격과 가격 변화

즉시(마켓) 가격: $P = Y / X$.  
교환 이후 가격: $P' = (Y - amountOut) / (X + \Delta x)$.  
이 차이가 슬리피지·price impact다.

## 5.3 임퍼머넌트 로스(IL)

가격 배율 $r = P_{final} / P_{initial}$ 이면 LP의 상대 손실(단일 풀, 균등 비중 예시):

```math
IL(r) = 1 - \frac{2\sqrt{r}}{1 + r}
```

간단 예: $r=2$ → $IL \approx 5.7\%$.

## 5.4 숫자 예제 (직관)

- 초기: $X=100$ ETH, $Y=100,000$ USDC → $P=1000$ USDC/ETH.
- 사용자: 1 ETH swap ($f=0.003$) → $\Delta x=0.997$ → amountOut ≈ $0.997 \times 100000 / (100 + 0.997) ≈ 990.08$ USDC (대략)

(정확값은 소수점·반올림에 따라 달라짐 — 실제 유닛 테스트로 확인 필수)

---

# 6. 주요 취약점(개념)과 영향 분석

각 항목은 개념, 피해 대상, 정량적 영향(가능하면), 권장 완화책으로 구성되어 있다.

## 6.1 가격 임팩트(Price Impact)

- **개념:** 큰 트랜잭션이 리저브를 변동시켜 체결 비율을 악화시킨다.
- **피해:** 사용자 슬리피지, LP의 IL 악화.
- **정량화:** amountIn 대비 price change 산출(수식 기반).
- **완화:** per-tx max impact, 분할(Split) 주문, 동적 수수료.

## 6.2 프론트런 / 샌드위치 (MEV)

- **개념:** mempool에 공개된 tx를 보고 공격자가 앞/뒤로 삽입해 차익을 얻음.
- **피해:** 사용자는 더 불리한 가격으로 체결한다.
- **완화:** private relays(Flashbots), batch settlement, 라우터 슬리피지 강제.

![](https://velog.velcdn.com/images/rlaejrqo465/post/9fde4eea-5782-4dd8-8785-38db1ac6d379/image.png)

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

# 7. 보안 취약점 실사례 분석

과거 DEX 해킹 사례들을 살펴봤는데, 실제로 어떤 취약점들이 있었는지, 그리고 어떤 교훈을 얻을 수 있는지 정리해봤습니다. 이를 통해 이론적 지식과 실제 보안 위험 사이의 간극을 이해할 수 있다고 생각합니다.

---

## 7.1 Bancor 사건 (June 2020)

**요약**

- 2020년 6월, Bancor는 새로 배포된 스마트 컨트랙트에서 치명적 취약점을 발견했고, 이를 방지하기 위해 내부적으로 (화이트햇 방식으로) 자금 이동을 시도함. 이 과정에서 프론트러너 등에 의해 약 $100k~$150k 규모의 자금이 실질적으로 이동하거나 손실된 것으로 보고됨.

**취약점/원인(요지)**

- 취약한 컨트랙트 로직과 배포 타이밍, 그리고 관련 승인(allowance)/권한 처리의 문제로 인해 공격자가 아닌 제3자가 이득을 본 사례가 존재.

**피해/대응**

- 유출 규모에 대한 보도는 다소 차이가 있으나, 사건은 Bancor 팀이 빠르게 대응하여 추가 피해를 줄이려 한 점이 특징.

**교훈(요약)**

- 컨트랙트 배포 전 검증(특히 사용자 승인·권한 관련 로직) 강화
- 긴급 대응 절차(화이트햇 이동 포함)와 그에 수반되는 프론트러닝 위험 고려

---

## 7.2 dYdX 사건 (Nov 2021 — Deposit Proxy)

**요약**

- 2021년 11월 말에 dYdX는 `deposit proxy`(입금 변환/프록시) 컨트랙트에서 취약점을 발견했고, 포스트모템을 공개하며 사용자 자금을 보호하기 위한 조치와 보상/환불 절차를 안내함.

**취약점/원인(요지)**

- 이전 버전에서 사용되던 컨트랙트를 기반으로 도입된 로직이 L2/프록시 환경에서 예상치 못한 입력을 처리할 수 있는 여지를 남겼음(예: 로우레벨 `call` 처리 등). dYdX는 이 취약점으로 인해 위험 가능성이 있었던 자금을 확인하고 보호 조치를 취함.

**피해/대응**

- 공식 포스트모템에 따르면 즉시 대규모 탈취는 발생하지 않았고, dYdX는 가스 비용 환불·버그 리포터 보상·영향받은 사용자에 대한 안내를 수행함. 일부 보도는 관련 보험기금 등을 겨냥한 후속 사건(또는 별도 사건)으로 약 $9M 규모의 문제를 다루기도 함.

**교훈(요약)**

- 레거시 컨트랙트나 재사용된 코드의 동작을 새로운 환경(L2, 프록시 등)에서 다시 검증할 것
- 빠른 포스트모템 공개와 사용자 보호 절차의 표준화

---

## 7.3 Curve Finance 사건 (30 July 2023)

**요약**

- 2023년 7월 30일경, Curve와 Curve 기반 풀들 중 일부가 Vyper 언어 및 특정 컴파일러/버전 연관 문제로 인해 공격을 받아 수천만 달러 규모의 손실이 발생함(여러 보고에서 약 $60M~$70M 규모 보도).

**취약점/원인(요지)**

- Vyper의 특정 버전에서 재진입 방지 장치가 의도대로 동작하지 않는 구현/컴파일 문제로 인해 공격자가 복수의 풀을 연쇄적으로 악용할 수 있었음.

**피해/대응**

- 여러 프로젝트와 풀들이 손실을 봤고, Curve 측과 커뮤니티는 피해 복구 및 보상(예: CRV 할당 제안 등), 관련 컨트랙트 버전·컴파일러 사용 지침의 재검토를 진행함.

**교훈(요약)**

- 사용 언어(Vyper 등) 및 컴파일러의 알려진 버전 이슈에 대한 지속적 모니터링
- 다중 풀 상호작용 시나리오의 정교한 테스트(통합 테스트 포함)
- 사건 발생 시 신속한 온체인/오프체인 커뮤니케이션과 보상 정책

---

# 8. 라우팅 컨트랙트(Router): 설계·위험·권장 패턴

라우터는 사용자의 거래를 가장 좋은 경로로 안전하게 처리해주는 핵심 부분이라고 생각합니다. 이 섹션에서는 라우터의 역할, 주요 위험 요소, 그리고 안전한 구현을 위한 권장 패턴을 살펴봤습니다.

## 8.1 역할 재정리

- 경로 최적화(멀티홉/스플릿)
- 슬리피지/데드라인 검사
- 토큰 수취·전달 오케스트레이션
- 가스·UX 고려한 경로 우선순위 결정

![](https://velog.velcdn.com/images/rlaejrqo465/post/5f265700-1adf-4291-a9c5-5f1ecc7254e0/image.png)

## 8.2 위험 포인트(설계부실 시)

1. 경로·amount 정보의 과도한 온체인 노출 → MEV 표적화 증가
2. fee-on-transfer 등 비표준 토큰 미대응
3. 멀티홉 원자성 미보장
4. per-tx limit 미설정

## 8.3 권장 구현 패턴 (2025년 기준)

- `deadlines`와 `amountOutMin` 강제
- `nonReentrant` 보호 (OpenZeppelin 최신 버전 활용)
- `call()` 기반 안전한 토큰 전송 (deprecated된 `transfer()`/`send()` 대신)
- 실제 수령량 확인 후 다음 홉 계산 (EIP-1153 transient storage 활용)
- 오프체인 가격 오라클 통합 (온체인 `getAmountsOut` 대신)
- per-tx maxImpact 숫자화(예: 0.5% of pool liquidity):

```math
maxImpact = 0.005 \times poolLiquidity
```

**최신 보안 패턴 (2025년):**

- EIP-2771 메타 트랜잭션 지원
- Foundry 테스트 프레임워크 활용
- EIP-4844 blob 트랜잭션 고려
- Uniswap V4 hooks 시스템 호환성

## 8.4 라우팅 알고리즘(권장) - 2025년 업데이트

- 오프체인 후보 경로 생성: 길이 $\leq 3$, 피벗 토큰 제한(WETH/USDC 등)
- 각 후보 경로 시뮬: Uniswap V4 `quoteExactInputSingle` 또는 1inch V5 API 활용
- netGain 계산으로 순위 결정:

```math
netGain = amountOut - gasCostInToken
```

- 큰 주문→split heuristic(등분 또는 convex solve 근사)
- **최신 추가사항:**
  - EIP-4844 blob 트랜잭션을 통한 배치 처리
  - Uniswap V4 hooks를 활용한 동적 수수료 최적화
  - MEV 보호를 위한 private mempool 통합

## 8.5 UX 권장 (2025년 기준)

- 예상 amount + slippage 확률(시뮬 결과 기반) 노출
- private tx 옵션 안내(Flashbots, mev-boost, SUAVE)
- large order warning modal
- **최신 UX 개선사항:**
  - EIP-4844 blob 트랜잭션을 통한 저비용 배치 거래
  - Uniswap V4 hooks 기반 커스터마이징된 거래 경험
  - 실시간 MEV 보호 상태 표시
  - 다중 체인 브릿지 통합 인터페이스

## 8.6 실제 서비스 사례 (2025년 9월 기준)

**라우팅 컨트랙트 활용 프로젝트:**

- **1inch Network**: 다중 DEX 애그리게이터로 복잡한 라우팅 알고리즘을 통해 최적 경로 제공
- **Paraswap**: 20+ DEX 통합으로 효율적인 라우팅 서비스 제공
- **Matcha (0x Protocol)**: 0x Protocol 기반의 DEX 애그리게이터
- **Uniswap V4**: hooks 시스템과 통합된 라우팅 최적화
- **Kyber Network**: 동적 AMM과 라우팅 컨트랙트 결합

**주요 특징:**

- 평균 15-30% 가스 비용 절감
- MEV 보호 기능 내장
- 실시간 가격 비교 및 최적화

---

# 9. 싱글톤(Singleton) 아키텍처: 동기·장단점·검증 요구

싱글톤 아키텍처는 모든 풀을 하나의 컨트랙트에서 관리하는 혁신적인 접근법이라고 생각합니다. 가스 효율성과 감사 비용 절약이라는 장점과 단일 실패 지점이라는 위험 사이의 트레이드오프를 살펴봤습니다.

## 9.1 개념

하나의 컨트랙트로 모든 풀 로직을 처리하고, 풀별 상태는 storage(맵핑)로 분리.

![](https://velog.velcdn.com/images/rlaejrqo465/post/adbd7045-7233-4657-89c6-3a4674c5f0f2/image.png)

## 9.2 장점

- 가스 절감(코드 재사용)
- 배포·감사 비용 절감(코드 1회 감사로 전체 커버)
- 훅/플러그인으로 풀별 정책 적용 가능

## 9.3 위험

- 단일 실패 지점(SPoF) — 버그시 전 풀 노출
- hook 악용 가능(검증 없이 등록되면)
- 복잡한 storage 인덱싱으로 인한 실수 위험

## 9.4 검증 요구사항

- 형식검증(formal verification) 권장
- hook 등록 프로세스(심사 + timelock)
- 권한 분리: 운영자 emergency stop은 최소화, 멀티시그+timelock

## 9.5 실제 서비스 사례 (2025년 9월 기준)

**싱글톤 아키텍처 활용 프로젝트:**

- **Uniswap V4**: 모든 풀을 단일 컨트랙트에서 관리, 풀 생성 비용 99.99% 절감
- **Balancer V3**: Weighted Pool, Stable Pool, Linear Pool을 싱글톤으로 통합 관리
- **Curve Finance**: 모든 스테이블코인 풀을 단일 컨트랙트에서 관리
- **SushiSwap Trident**: 다양한 풀 유형을 싱글톤 프레임워크로 통합
- **Velodrome V2**: Optimism 기반 싱글톤 AMM으로 가스 효율성 극대화

**주요 성과:**

- 풀 생성 비용: $50,000+ → $5 이하 (99.99% 절감)
- 가스 비용: 평균 40-60% 절감
- 감사 비용: 개별 풀 대비 80% 절감
- 배포 시간: 수분 → 수초 단축

---

# 10. MEV, 프론트런, 백런: 정의·영향·완화

MEV(Maximal Extractable Value)는 블록체인에서 발생하는 새로운 형태의 경제적 현상이라고 생각합니다. 이 섹션에서는 MEV의 다양한 형태와 DEX에 미치는 영향, 그리고 이를 완화하기 위한 방안들을 살펴봤습니다.

## 10.1 정의 요약

- **MEV:** 블록 프로듀서가 트랜잭션 순서/포함을 조작하여 추출할 수 있는 최대 가치
- **프론트런:** 유저 tx 앞에 거래를 넣어 가격을 유리하게 조작
- **백런:** 유저 tx 직후 생긴 기회를 잡아 차익을 얻음
- **샌드위치:** 앞+뒤로 끼워 차익 확보

![](https://velog.velcdn.com/images/rlaejrqo465/post/e584e192-066f-4aa8-96ac-8d3d78002fa7/image.png)

## 10.2 실무적 영향

- 유저 경험 악화
- 가스 경쟁 심화
- 프로토콜 신뢰성 저하

## 10.3 완화 수단(우선순위)

1. Private relays(Flashbots, mev-boost)을 통한 tx 전송 옵션
2. Batch settlement/auction(동시 처리로 순서 의미 축소)
3. UI-level 권장 설정(슬리피지) + large order 경고
4. 라우터 private tx 연동(옵션)

---

# 11. Uniswap 진화(V1→V4): 설계 교훈

Uniswap의 버전별 진화 과정을 통해 DEX 설계의 핵심 교훈을 도출해봤습니다. 각 버전에서 도입된 혁신과 그에 따른 트레이드오프를 분석하여 DEX 개발의 방향성을 이해해봤습니다.

- **V1:** 단순, 적은 공격면
- **V2:** ERC20↔ERC20, TWAP(온체인 오라클), flash swaps — 온체인 가격 데이터 필요성 인식
- **V3:** Concentrated liquidity — 자본 효율 ↑, 전략적 복잡성·IL 계산 복잡성 ↑
- **V4:** Singleton + Hooks — 가스·감사 효율 ↑, 단일 실패 위험·hook 검증 필요

**요지:** 기능 추가는 경제적 이득을 주지만, 항상 더 많은 검증·감사·운영 절차를 요구한다.

---

# 12. Uniswap 버전별 상세 분석

Uniswap의 각 버전을 상세히 분석하여 기술적 혁신과 보안 고려사항을 심층적으로 살펴봤습니다. 버전별 특징, 장단점, 보안 측면, 그리고 유동성 변화를 종합적으로 비교 분석해봤습니다.

![](https://velog.velcdn.com/images/rlaejrqo465/post/85a9b674-69ec-4ae9-8ae2-93bfa768841c/image.webp)

## 12.1 Uniswap V1 (2018년 11월)

**핵심 특징:**

- ETH ↔ ERC20 토큰 간의 직접 교환만 지원
- 단순한 상수곱 공식 사용:

```math
x \cdot y = k
```

- 각 토큰 쌍마다 별도의 컨트랙트 배포

**장점:**

- 코드가 단순하여 감사가 용이
- 공격 표면이 최소화됨
- 가스 비용이 예측 가능

**단점:**

- ERC20 ↔ ERC20 교환 불가 (ETH를 거쳐야 함)
- 자본 효율성이 낮음
- 유동성 분산으로 인한 높은 슬리피지

**보안 측면:**

- 단순한 구조로 인한 낮은 취약점 위험
- 각 풀이 독립적이어서 한 풀의 문제가 다른 풀로 전파되지 않음

## 12.2 Uniswap V2 (2020년 5월)

**핵심 특징:**

- ERC20 ↔ ERC20 직접 교환 지원
- TWAP(Time-Weighted Average Price) 오라클 도입
- Flash Swaps 기능 추가
- 각 토큰 쌍마다 별도 팩토리 컨트랙트

**장점:**

- ERC20 토큰 간 직접 교환으로 가스 절약
- TWAP 오라클로 가격 조작 공격 방어
- Flash Swaps로 차익거래 기회 확대

**단점:**

- 오라클 시스템의 복잡성 증가
- Flash Swaps로 인한 새로운 공격 벡터
- 여전히 낮은 자본 효율성

**보안 측면:**

- TWAP 오라클로 가격 조작 공격 방어
- Flash Swaps의 재진입 공격 위험
- 오라클 지연 공격 가능성

**유동성 변화:**

- V1 대비 유동성 집중도 향상
- 더 많은 토큰 쌍 지원으로 전체 유동성 증가

## 12.3 Uniswap V3 (2021년 5월)

**핵심 특징:**

- Concentrated Liquidity 도입
- Tick 기반 가격 범위 설정
- Multiple Fee Tiers ($0.05\%$, $0.3\%$, $1\%$)
- Non-fungible Liquidity Positions (NFT)

**장점:**

- 자본 효율성 대폭 향상 (최대 $4000 \times$)
- LP가 원하는 가격 범위에서 유동성 제공 가능
- 더 정확한 가격 발견

**단점:**

- 복잡한 수학적 계산 (tick 기반)
- LP의 수동적 관리 필요
- Impermanent Loss 계산 복잡성 증가

**보안 측면:**

- 복잡한 수학으로 인한 구현 오류 위험
- Tick 계산의 정밀도 문제
- NFT 기반 포지션 관리의 복잡성

**유동성 변화:**

- 자본 효율성 향상으로 실제 필요한 유동성 감소
- 가격 범위별 유동성 분포의 불균형
- 더 정확한 가격 발견으로 슬리피지 감소

## 12.4 Uniswap V4 (2024년 출시, 2025년 기준)

**핵심 특징:**

- Singleton 아키텍처 도입 (풀 생성 비용 99.99% 절감)
- Hooks 시스템으로 커스터마이징 가능
- Flash Accounting으로 가스 효율성 향상
- 네이티브 ETH 지원 복원
- 모든 풀이 하나의 컨트랙트에서 관리

**장점:**

- 가스 비용 대폭 절약 (EIP-1153 transient storage 활용)
- 감사 비용 절약 (하나의 컨트랙트만 감사)
- Hooks로 풀별 커스터마이징 가능
- 1,550만 달러 규모의 버그 바운티 프로그램 운영

**단점:**

- 단일 실패 지점 (Single Point of Failure)
- Hooks 시스템의 보안 위험
- 복잡한 아키텍처로 인한 디버깅 어려움

**보안 측면:**

- 6개 독립 보안 회사의 9번 보안 감사 완료
- Singleton 아키텍처로 인한 전면적 노출 위험
- Hooks 시스템의 악성 코드 위험 (등록 프로세스 강화)
- 복잡한 상호작용으로 인한 예상치 못한 부작용

**유동성 변화:**

- 가스 비용 절약으로 더 많은 소규모 거래 활성화
- Hooks를 통한 새로운 유동성 제공 방식
- EIP-4844 blob 트랜잭션 지원으로 배치 처리 효율성 향상

## 12.5 버전별 비교 요약

| 버전 | 자본 효율성 | 보안 복잡도 | 가스 비용 | 유동성 집중도 |
| ---- | ----------- | ----------- | --------- | ------------- |
| V1   | 낮음        | 낮음        | 중간      | 낮음          |
| V2   | 낮음        | 중간        | 중간      | 중간          |
| V3   | 높음        | 높음        | 높음      | 높음          |
| V4   | 높음        | 매우 높음   | 낮음      | 매우 높음     |

**핵심 교훈:**

1. **기능 추가는 복잡성 증가를 동반**: 각 버전마다 새로운 기능이 추가되면서 보안 복잡도가 증가
2. **자본 효율성과 보안의 트레이드오프**: 효율성을 높이면 보안 검증이 더욱 중요해짐
3. **아키텍처 변화의 위험**: Singleton 같은 근본적 변화는 새로운 위험을 초래
4. **지속적인 검증 필요**: 각 버전마다 새로운 검증 방법론이 필요

---

# 13. "안전하다"를 증명하는 검증 파이프라인

DEX의 안전성을 체계적으로 증명하기 위한 다층적 검증 접근법을 제시해봤습니다. 코드 레벨의 기계적 증명부터 경제적 시뮬레이션, 운영 투명성까지 포괄적인 검증 프레임워크를 살펴봤습니다.

아래는 코드·경제·운영 각 레이어 별 필수 항목이다.

## 13.1 코드 레이어 (기계적 증명)

- Unit tests: swap formulas, edge cases, transfer-fee tokens
- Property-based tests(Echidna)
- Static analysis: Slither, MythX
- Formal verification: Certora or SMT proofs for invariants
- External audits (min 2) + public bug bounty

**핵심 불변(예시)**: reserves non-negative, total token conservation, per-tx max impact never bypassed, no unauthorized mint/burn

## 13.2 경제 레이어 (시뮬레이션)

- 메인넷 포크: flash-loan-like influx, large swaps, oracle delay
- Monte-Carlo: volatility scenarios, trader behavior models
- MEV sim: tx reorder/insert impact quantification

**출력 양식(권장)**: "X% 신뢰구간에서 Y% 손실 초과 확률 Z%" 형태

## 13.3 운영 레이어 (투명성)

- 대시보드: pool_health, price_gap, large_tx_alerts
- 공개 문서: audits, sim results, emergency procedures

---

# 14. 검증 기법 실무 가이드

DEX 개발에서 활용할 수 있는 주요 검증 도구들과 기법들을 소개해봤습니다. 정적 분석, Fuzz Testing, 형식 검증, 메인넷 포크 테스트 등 실무에서 검증된 도구들의 특징과 활용법을 살펴봤습니다.

## 14.1 정적 분석 도구

**Slither**

- 가장 널리 사용되는 Solidity 정적 분석 도구
- 재진입, 정수 오버플로우, 권한 검증 오류 등 탐지
- 설정: `slither . --exclude-dependencies`

**MythX**

- 클라우드 기반 정적 분석 서비스
- 더 정교한 분석과 false positive 감소
- CI/CD 파이프라인 통합 가능

## 14.2 Fuzz Testing

**Echidna**

- Haskell 기반 property-based fuzzing 도구
- 핵심 불변식 자동 검증
- 설정 예시:

```solidity
contract TestInvariants is Testable {
    function echidna_balance_never_negative() public view returns (bool) {
        return token.balanceOf(address(this)) >= 0;
    }
}
```

## 14.3 Formal Verification

**Certora**

- SMT solver 기반 형식 검증
- 핵심 수학적 불변식 증명
- 설정 복잡도가 높지만 가장 강력한 검증

## 14.4 메인넷 포크 테스트 (2025년 기준)

**Foundry/Anvil (권장)**

- 실제 메인넷 상태를 포크하여 테스트
- 복잡한 시나리오 시뮬레이션 가능
- 설정: `anvil --fork-url` 또는 `vm.createFork()` 활용
- EIP-4844 blob 트랜잭션 시뮬레이션 지원

**Hardhat (레거시 지원)**

- 기존 프로젝트 호환성 유지
- 설정: `hardhat_reset`으로 특정 블록으로 되돌리기

---

# 15. 실전 시뮬레이션 계획(포크·시나리오·메트릭)

실제 메인넷 환경에서 DEX의 동작을 시뮬레이션하여 다양한 시나리오를 테스트하는 방법을 제시해봤습니다. 메인넷 포크를 활용한 현실적인 테스트 환경 구축과 핵심 시나리오별 검증 방법을 살펴봤습니다.

## 15.1 준비

- Tools: Anvil/Foundry, Hardhat, Tenderly, Python (pandas, numpy)
- Dataset: 메인넷 블록/풀 상태(특정 블록 포크)
- Actors: honest users, LPs, attacker bots(시뮬), MEV block builder

## 15.2 핵심 시나리오 (각각 스크립트화)

1. **대량 단일 스왑** (single large trade) — price impact, LP PnL
2. **스플릿 주문 전략** (N-split) — price improvement vs gas cost
3. **MEV 샌드위치** (재정렬 시뮬) — user loss 측정(방어 전/후)
4. **오라클 지연** — TWAP vs instantaneous oracle comparison
5. **싱글톤 훅 악성 입력** — hook 동작 검증 + 시나리오 차단

<!-- [이미지 자리표시자: 시뮬레이션 시나리오별 테스트 결과를 보여주는 차트를 넣으세요] -->

## 15.3 메트릭

![](https://velog.velcdn.com/images/rlaejrqo465/post/63053be6-109d-4e87-b3e9-21af84a2b7bd/image.png)

- user received amount vs expected
- LP PnL 분포
- price_gap(AMM vs oracle)
- attacker's profit
- fraction of pool liquidity impacted

---

# 16. 결론 및 권고 액션 아이템

본 리서치를 통해 DEX/AMM의 안전성 확보를 위한 종합적인 접근법을 제시해봤습니다. 수학적 기초부터 실무 운영까지 다층적 방어 체계의 중요성을 강조하고, 구체적인 실행 방안을 제안해봤습니다.

**결론:** AMM의 수학은 단순하지만, 실질적 '안전'은 코드·경제·운영의 조합 증명으로 확보되어야 한다.

**권고(우선순위)**

1. 형식검증: 핵심 invariants Certora/SMT로 증명
2. 메인넷 포크 5개 시나리오 자동화 및 결과 공개
3. 라우터 정책 강제화: amountOutMin, deadline, per-tx limit
4. 싱글톤 도입시 hook 등록 프로세스(심사+timelock) 마련
5. 공개 모니터링 대시보드 구축

---

# 참고 자료 및 출처

## 주요 참고 사이트

### DEX 메트릭 및 분석

- **[Dune Analytics - DEX Metrics](https://dune.com/hagaetc/dex-metrics)**: DEX 거래량, TVL, 수수료 등 실시간 메트릭 분석
- **[DeFiLlama](https://defillama.com/)**: DeFi 프로토콜 TVL 및 메트릭 추적
- **[The Block Research](https://www.theblock.co/research)**: DEX 시장 분석 및 리서치

### Uniswap 공식 문서 및 블로그

- **[Uniswap Permit2 & Universal Router](https://blog.uniswap.org/permit2-and-universal-router)**: Uniswap의 라우팅 컨트랙트 및 승인 시스템
- **[Uniswap Auto Router](https://blog.uniswap.org/auto-router)**: Uniswap의 자동 라우팅 알고리즘
- **[Uniswap V4 Documentation](https://docs.uniswap.org/sdk/v4/overview)**: Uniswap V4 공식 문서
- **[Uniswap Labs Blog](https://blog.uniswap.org/)**: Uniswap의 최신 업데이트 및 기술 블로그

### 기술 분석 및 리서치

- **[DWF Labs - Uniswap V4 Analysis](https://www.dwf-labs.com/research/457-what-s-new-in-uniswap-v4-three-key-changes-and-two-new-protocols)**: Uniswap V4 싱글톤 아키텍처 분석

### 보안 및 감사

- **[OpenZeppelin](https://openzeppelin.com/)**: 스마트 컨트랙트 보안 라이브러리 및 감사
- **[Trail of Bits](https://www.trailofbits.com/)**: 스마트 컨트랙트 보안 감사
- **[ConsenSys Diligence](https://consensys.net/diligence/)**: 블록체인 보안 감사
- **[Certora](https://www.certora.com/)**: 형식 검증 도구

### MEV 및 프론트런 연구

- **[Flashbots](https://docs.flashbots.net/)**: MEV 보호 솔루션
- **[MEV-Boost](https://boost.flashbots.net/)**: MEV 추출 최적화
- **[EigenPhi](https://eigenphi.io/)**: MEV 분석 플랫폼

### 수학적 모델링

- **[Uniswap V3 Whitepaper](https://uniswap.org/whitepaper-v3.pdf)**: Concentrated Liquidity 수학

### 실제 사고 사례 분석

- **[Rekt News](https://rekt.news/)**: DeFi 해킹 사례 분석
- **[Immunefi](https://immunefi.com/)**: 버그 바운티 플랫폼

## 추가 유용한 자료

### 커뮤니티 및 포럼

- **[Uniswap Discord](https://discord.gg/FCfyBSbCU5)**: Uniswap 개발자 커뮤니티
- **[Ethereum Research Forum](https://ethresear.ch/)**: 이더리움 기술 논의
- **[DeFi Pulse](https://defipulse.com/)**: DeFi 프로토콜 순위 및 분석

### 실시간 데이터

- **[CoinGecko](https://www.coingecko.com/)**: 암호화폐 가격 및 시장 데이터
- **[CoinMarketCap](https://coinmarketcap.com/)**: 암호화폐 시장 캡 및 통계
- **[Etherscan](https://etherscan.io/)**: 이더리움 블록 익스플로러

## 개인 학습 프로젝트

### DEX 이해를 위한 시뮬레이터

- **[DEX Simulator (TypeScript)](https://github.com/GiHoon1123/Dex-Simulator)**: DEX 개념 이해를 위해 직접 개발한 NestJS 기반 시뮬레이터
  - **개발 목적**: DEX/AMM의 동작 원리를 실제 코드로 구현하여 이해하기 위함
  - **주요 기능**:
    - AMM 풀, LP, 트레이더 시뮬레이션
    - 동적 수수료 시스템 구현 (풀 크기 및 변동성 기반)
    - 아비트라지 기회 탐지 및 실행
    - 실시간 가격 변동 및 변동성 계산
    - 이벤트 기반 아키텍처
  - **기술 스택**: NestJS, TypeScript, Jest
  - **특징**: 지속적으로 업데이트되며, 이론적 내용을 실제 구현으로 검증

---
