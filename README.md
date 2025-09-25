# DEX Simulator

DEX 풀, LP, 트레이더 시뮬레이션을 위한 NestJS 기반 API 서버입니다.

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

- http://localhost:3000/api

## 비즈니스 프로세스

![DEX Simulator Business Process](asset/process.png)

## 주요 기능

### 1. Market Module (시장 모듈)

- **가격 시뮬레이션**: ETH/BTC 가격 변동 시뮬레이션
- **변동성 계산**: 표준편차 기반 변동성 계산
- **아비트라지 기회 탐지**: 풀과 시장 가격 차이 기반 아비트라지 기회 계산
- **시장 상태 조회**: 현재 가격, 변동성, 아비트라지 기회 정보 제공

### 2. LP Module (유동성 공급자 모듈)

- **풀 생성**: ETH/BTC 유동성 풀 생성 및 관리
- **유동성 공급**: LP 토큰 발행 및 유동성 추가
- **유동성 제거**: LP 토큰 소각 및 유동성 회수
- **수수료 계산**: 거래 수수료 및 LP 수익 계산
- **풀 상태 조회**: 풀 정보, 유동성, 수수료 현황 조회

### 3. Trader Module (트레이더 모듈)

- **랜덤 거래**: ETH ↔ BTC 랜덤 거래 실행
- **아비트라지 거래**: 가격 차이를 이용한 수익 거래

## 프로젝트 구조

```
src/
├── common/           # 공통 모듈
│   ├── events/       # 이벤트 정의
│   └── filters/      # 예외 필터
├── lp/              # 유동성 공급자 모듈
├── market/          # 시장 모듈
├── trader/          # 트레이더 모듈
└── main.ts          # 애플리케이션 진입점
```

## 이벤트 시스템

- **market.price.changed**: 가격 변동 이벤트
- **arbitrage.opportunity**: 아비트라지 기회 발견 이벤트
- **trade.executed**: 거래 실행 이벤트

## 테스트 커버리지

현재 프로젝트의 테스트 커버리지:

- **market.service.ts**: 100% 커버리지 달성
- 전체 프로젝트 테스트 구조 개선 및 TypeScript 기반 설정
