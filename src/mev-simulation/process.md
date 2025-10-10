## 개선 필요 항목

### 1. 전략 선택 로직 개선

**현재**: 최대수익(netProfit)만 비교 → 항상 Sandwich 전략 선택 (3% 수익)
**문제**: Front-run(2%), Back-run(1.5%)은 절대 선택 안 됨
**해결방안**:

- 가스비 기반 필터링 (Front-run: 200+ gwei, Back-run: 100-200 gwei, Sandwich: 20+ ETH)
- 확률적 선택 도입 (80% 최적화, 20% 다양성)
- 전략별 적합도 점수 계산 (feasibility, successProbability, riskLevel 고려)

### 2. 전략 실행 프로세스 구체화 (현실세계와 동일하게)

**현재**: submitTransaction()이 랜덤 해시만 생성, 실제 실행 없음
**문제**: 풀 상태 변화 없음, 가스비 경쟁 없음, 블록 순서 조작 없음

#### Front-run 전략

- [ ] 타겟 트랜잭션보다 높은 가스비로 매수 트랜잭션 생성
- [ ] TransactionPoolService에 실제 제출
- [ ] BlockService에서 가스비 기반 정렬 (MEV 트랜잭션이 앞에 배치)
- [ ] PoolService에서 AMM 수식으로 가격 변화 계산 (x \* y = k)
- [ ] 타겟 트랜잭션 실행 (변화된 가격 적용)
- [ ] 매도 트랜잭션 실행하여 차익 실현

#### Back-run 전략

- [ ] 타겟 트랜잭션 실행 후 풀 가격 확인
- [ ] 가격 변화를 이용한 차익거래 트랜잭션 생성
- [ ] 타겟 직후 블록에 포함되도록 제출
- [ ] 실제 수익 계산 및 기록

#### Sandwich 전략

- [ ] Front-run 트랜잭션 (매수, 최고 가스비)
- [ ] 타겟 트랜잭션 (중간)
- [ ] Back-run 트랜잭션 (매도, 높은 가스비)
- [ ] 3개 트랜잭션의 순서 보장 (Bundle Transaction)
- [ ] 실제 슬리피지 계산 및 피해자 손실 기록

### 3. AMM 풀 시뮬레이션 구현

**현재**: 풀 상태가 static, 가격 변화 없음
**필요**:

- [ ] Uniswap V2/V3 AMM 수식 구현 (x \* y = k 또는 concentrated liquidity)
- [ ] Price Impact 계산 (거래 크기에 따른 가격 변화)
- [ ] 슬리피지 실제 적용
- [ ] 유동성 변화 추적
- [ ] 풀별 상태 관리 (reserves, price, liquidity)

### 4. 블록 빌더/트랜잭션 정렬

**현재**: 트랜잭션 순서가 랜덤
**필요**:

- [ ] 가스비 기반 트랜잭션 정렬 (높은 가스비 = 우선순위)
- [ ] MEV-Boost 스타일 우선순위 경매
- [ ] Bundle Transaction 지원 (atomic execution)
- [ ] 블록 공간 제한 (gas limit)

### 5. MEV 경쟁 시뮬레이션

**현재**: 단일 MEV 봇만 존재
**필요**:

- [ ] 멀티플 MEV 봇 경쟁
- [ ] 가스비 경쟁 (bidding war)
- [ ] 백런닝 경쟁 (같은 기회를 노리는 여러 봇)
- [ ] 실패 케이스 시뮬레이션

### 6. 실제 수익/손실 검증

**현재**: 추정값만 사용 (calculateProfit)
**필요**:

- [ ] 실제 거래 실행 후 수익 계산
- [ ] 가스비 실제 차감
- [ ] 실패 시 가스비 손실 반영
- [ ] 슬리피지로 인한 손실 반영

---

## 우선순위

1. 전략 선택 로직 개선 ⭐⭐⭐⭐⭐
2. AMM 풀 기본 구현 (x \* y = k)
3. 트랜잭션 실제 제출 (TransactionPoolService 연동)
4. 가스비 기반 정렬 (BlockService)
5. Sandwich 번들 트랜잭션
6. Price Impact 정확한 계산
7. 실제 수익 검증 시스템
8. MEV 봇 경쟁 시뮬레이션
9. Uniswap V3 concentrated liquidity
10. MEV-Boost 경매 시스템
