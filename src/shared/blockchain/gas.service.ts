import { Injectable } from '@nestjs/common';
import { TransactionType } from './types/transaction.interface';

/**
 * GasService
 *
 * 가스 가격 계산 및 가스 사용량 추정을 담당합니다.
 * MEV 공격에서 가스 가격이 트랜잭션 우선순위를 결정하는 핵심 요소입니다.
 */
@Injectable()
export class GasService {
  // 가스 가격 상수
  private readonly BASE_GAS_PRICE = 100;
  private readonly MIN_GAS_PRICE = 50;
  private readonly MAX_GAS_PRICE = 10000;

  // 트랜잭션 타입별 가스 사용량 (추정치)
  private readonly GAS_ESTIMATES = {
    [TransactionType.SWAP]: 300000, // 200,000-400,000 범위
    [TransactionType.ADD_LIQUIDITY]: 400000, // 300,000-500,000 범위
    [TransactionType.REMOVE_LIQUIDITY]: 350000, // 250,000-450,000 범위
    [TransactionType.TRANSFER]: 21000, // 17,000-25,000 범위
    [TransactionType.MEV_FRONTRUN]: 300000, // 200,000-400,000 범위
    [TransactionType.MEV_BACKRUN]: 300000, // 200,000-400,000 범위
    [TransactionType.MEV_SANDWICH]: 500000, // 400,000-600,000 범위
  };

  /**
   * 우선순위에 따른 가스 가격 계산
   *
   * @param priority 우선순위 레벨 (low, medium, high)
   * @returns 계산된 가스 가격
   */
  calculateGasPrice(priority: 'low' | 'medium' | 'high' | 'urgent'): number {
    const multipliers = {
      low: 1,
      medium: 2,
      high: 5,
      urgent: 10, // MEV 봇이 사용
    };

    const gasPrice = this.BASE_GAS_PRICE * multipliers[priority];
    return Math.min(gasPrice, this.MAX_GAS_PRICE);
  }

  /**
   * 트랜잭션 타입별 가스 사용량 추정
   *
   * @param transactionType 트랜잭션 타입
   * @returns 예상 가스 사용량
   */
  estimateGas(transactionType: TransactionType): number {
    const baseGas = this.GAS_ESTIMATES[transactionType] || 200000;

    // 가스 사용량에 랜덤 변동성 추가 (실제 이더리움과 유사하게)
    const variation = 0.2; // 20% 변동
    const randomFactor = 1 + (Math.random() - 0.5) * variation;

    return Math.floor(baseGas * randomFactor);
  }

  /**
   * 총 가스 비용 계산
   *
   * @param gasUsed 사용된 가스
   * @param gasPrice 가스 가격
   * @returns 총 비용 (가스 * 가격)
   */
  calculateTotalCost(gasUsed: number, gasPrice: number): number {
    return gasUsed * gasPrice;
  }

  /**
   * 현재 네트워크 가스 가격 조회
   *
   * 실제 네트워크에서는 최근 블록들의 평균 가스 가격을 반환하지만,
   * 시뮬레이션에서는 기본 가스 가격을 반환합니다.
   *
   * @returns 현재 가스 가격
   */
  getCurrentGasPrice(): number {
    return this.BASE_GAS_PRICE;
  }

  /**
   * 긴급도에 따른 가스 가격 제안
   *
   * MEV 봇이 프론트런/백런 시 사용할 가스 가격을 제안합니다.
   *
   * @param urgency 긴급도 (0~1, 1이 가장 긴급)
   * @returns 제안된 가스 가격
   */
  suggestGasPrice(urgency: number): number {
    const urgencyMultiplier = 1 + urgency * 9; // 1~10배
    const suggestedPrice = this.BASE_GAS_PRICE * urgencyMultiplier;
    return Math.min(suggestedPrice, this.MAX_GAS_PRICE);
  }

  /**
   * 가스 가격 검증
   *
   * @param gasPrice 검증할 가스 가격
   * @returns 유효 여부
   */
  validateGasPrice(gasPrice: number): boolean {
    return gasPrice >= this.MIN_GAS_PRICE && gasPrice <= this.MAX_GAS_PRICE;
  }
}
