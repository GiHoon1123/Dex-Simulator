# DEX Simulator

DEX 풀, 블록체인 시뮬레이션, MEV 공격 시뮬레이션을 위한 NestJS 기반 API 서버입니다.

## 기술 스택

- **Node.js**: 18.x 이상
- **NestJS**: 11.0.1
- **TypeScript**: 5.7.3
- **Jest**: 29.7.0 (테스트)

## 설치 및 실행

### 의존성 설치

```bash
npm install
```

### 서버 실행

```bash
npm run start:dev
```

### 테스트 실행

```bash
npm run test:cov
```

## API 문서

서버 실행 후 다음 URL에서 Swagger API 문서를 확인할 수 있습니다:

### 전체 API 문서

- **http://localhost:3000/api** - 모든 API 통합 문서

### 모듈별 API 문서

- **http://localhost:3000/api/dex** - DEX 시뮬레이션 API (LP, Trader, Market)
- **http://localhost:3000/api/blockchain** - 블록체인 시뮬레이션 API (트랜잭션 풀, 블록 생성, 가스 시스템)
- **http://localhost:3000/api/mev** - MEV 시뮬레이션 API (Front-run, Back-run, Sandwich Attack)

## 주요 기능

### 1. DEX 시뮬레이션 (DEX Simulation)

#### Market Module (시장 모듈)

- **가격 시뮬레이션**: ETH/BTC 가격 변동 시뮬레이션
- **변동성 계산**: 표준편차 기반 변동성 계산
- **아비트라지 기회 탐지**: 풀과 시장 가격 차이 기반 아비트라지 기회 계산
- **시장 상태 조회**: 현재 가격, 변동성, 아비트라지 기회 정보 제공

#### LP Module (유동성 공급자 모듈)

- **풀 생성**: ETH/BTC 유동성 풀 생성 및 관리
- **유동성 공급**: LP 토큰 발행 및 유동성 추가
- **유동성 제거**: LP 토큰 소각 및 유동성 회수
- **수수료 계산**: 거래 수수료 및 LP 수익 계산
- **풀 상태 조회**: 풀 정보, 유동성, 수수료 현황 조회

#### Trader Module (트레이더 모듈)

- **랜덤 거래**: ETH ↔ BTC 랜덤 거래 실행
- **아비트라지 거래**: 가격 차이를 이용한 수익 거래

### 2. 블록체인 시뮬레이션 (Blockchain Simulation)

#### 트랜잭션 풀 (Transaction Pool)

- **트랜잭션 제출**: 사용자 트랜잭션을 메모리 풀에 제출
- **가스 가격 기반 정렬**: 높은 가스 가격 순으로 트랜잭션 정렬
- **Nonce 검증**: 중복 거래 방지 및 순서 보장
- **풀 상태 조회**: 대기 중인 트랜잭션 수, 평균 가스 가격 등

#### 블록 생성 (Block Production)

- **자동 블록 생성**: 12초 간격으로 블록 자동 생성
- **트랜잭션 선택**: 가스 가격 기반으로 블록에 포함할 트랜잭션 선택
- **블록 실행**: 트랜잭션 순차 실행 및 상태 업데이트
- **블록체인 조회**: 블록 히스토리 및 상태 조회

#### 가스 시스템 (Gas System)

- **가스 가격 계산**: 네트워크 혼잡도 기반 동적 가스 가격
- **가스 추정**: 트랜잭션 타입별 가스 사용량 추정
- **총 비용 계산**: 가스 가격 × 가스 사용량으로 총 비용 계산

#### 트랜잭션 생성기 (Transaction Generator)

- **자동 트랜잭션 생성**: 12초 간격으로 랜덤 트랜잭션 생성
- **다양한 거래 크기**: 소액(70%), 중액(20%), 대액(10%) 분포
- **다양한 가스 가격**: 낮음(50%), 보통(30%), 높음(20%) 분포
- **MEV 기회 생성**: MEV 시뮬레이션을 위한 다양한 거래 패턴

### 3. MEV 시뮬레이션 (MEV Simulation)

#### MEV 기회 탐지 (MEV Opportunity Detection)

- **트랜잭션 분석**: 대기 중인 트랜잭션에서 MEV 기회 탐지
- **가격 임팩트 계산**: 거래가 가격에 미치는 영향 분석
- **수익성 평가**: MEV 전략별 예상 수익 계산

#### MEV 전략 (MEV Strategies)

- **Front-running**: 사용자 거래보다 먼저 실행하여 가격 차이 활용
- **Back-running**: 사용자 거래 후 실행하여 가격 변화 활용
- **Sandwich Attack**: 사용자 거래 앞뒤로 실행하여 가격 조작

#### MEV 봇 (MEV Bot)

- **전략 선택**: 수익성 기반으로 최적 MEV 전략 선택
- **자동 실행**: 탐지된 기회에 대한 자동 거래 실행
- **수익 추적**: MEV 전략별 수익 및 성과 분석

## 빠른 시작 가이드

### 1. DEX 시뮬레이션 시작

```bash
# 서버 실행
npm run start:dev

# 풀 초기화 (필수)
curl -X POST http://localhost:3000/lp/pool/initialize \
  -H "Content-Type: application/json" \
  -d '{"ethAmount": 1000, "btcAmount": 30000}'

# DEX API 문서 확인
# http://localhost:3000/api/dex
```

### 2. 블록체인 시뮬레이션 시작

```bash
# 트랜잭션 자동 생성 시작
curl -X POST http://localhost:3000/blockchain/tx-generator/start

# 블록 자동 생성 시작
curl -X POST http://localhost:3000/blockchain/auto-production/start

# 블록체인 API 문서 확인
# http://localhost:3000/api/blockchain
```

### 3. MEV 시뮬레이션 시작

```bash
# 블록체인 시뮬레이션이 활성화된 후
# MEV API 문서 확인
# http://localhost:3000/api/mev
```
