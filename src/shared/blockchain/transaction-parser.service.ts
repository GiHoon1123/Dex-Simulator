import { Injectable } from '@nestjs/common';
import { ParsedTransactionData } from './types/transaction.interface';

/**
 * TransactionParserService
 *
 * 실제 이더리움 트랜잭션의 data 필드를 파싱하여
 * MEV 봇이 이해할 수 있는 형태로 변환합니다.
 *
 * 실제 이더리움에서는 ethers.js나 web3.js를 사용하여
 * ABI를 통해 트랜잭션 데이터를 파싱합니다.
 */
@Injectable()
export class TransactionParserService {
  /**
   * Uniswap V3 Pool 컨트랙트 ABI
   *
   * 실제 Uniswap V3 Pool 컨트랙트의 함수 시그니처를 정의합니다.
   * 이 ABI를 통해 트랜잭션의 data 필드를 파싱할 수 있습니다.
   */
  private readonly UNISWAP_V3_POOL_ABI = [
    {
      inputs: [
        { name: 'recipient', type: 'address' },
        { name: 'zeroForOne', type: 'bool' },
        { name: 'amountSpecified', type: 'int256' },
        { name: 'sqrtPriceLimitX96', type: 'uint160' },
        { name: 'data', type: 'bytes' },
      ],
      name: 'swap',
      outputs: [
        { name: 'amount0', type: 'int256' },
        { name: 'amount1', type: 'int256' },
      ],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ];

  /**
   * 함수 시그니처 매핑
   *
   * 각 함수의 시그니처(첫 4바이트)를 함수명과 매핑합니다.
   * 실제 이더리움에서는 keccak256 해시의 첫 4바이트를 사용합니다.
   */
  private readonly FUNCTION_SIGNATURES = {
    '0x128acb08': 'swap', // swap(address,bool,int256,uint160,bytes)
  };

  /**
   * 트랜잭션 데이터 파싱
   *
   * 트랜잭션의 data 필드를 분석하여 호출된 함수와
   * 파라미터를 추출합니다.
   *
   * @param data - 트랜잭션의 data 필드 (hex 문자열)
   * @returns 파싱된 트랜잭션 데이터 또는 null
   */
  parseTransactionData(data: string): ParsedTransactionData | null {
    try {
      // 함수 시그니처 추출 (첫 4바이트)
      const functionSignature = data.slice(0, 10);

      // 지원하는 함수인지 확인
      const functionName = this.FUNCTION_SIGNATURES[functionSignature];
      if (!functionName) {
        return null;
      }

      // 함수별 파싱 로직
      switch (functionName) {
        case 'swap':
          return this.parseSwapFunction(data);
        default:
          return null;
      }
    } catch (error) {
      console.error('트랜잭션 데이터 파싱 실패:', error);
      return null;
    }
  }

  /**
   * swap 함수 파싱
   *
   * Uniswap V3의 swap 함수 호출을 파싱합니다.
   * 실제로는 ethers.js의 Interface.parseTransaction을 사용해야 하지만,
   * 시뮬레이션을 위해 간단한 파싱 로직을 구현합니다.
   *
   * @param data - 트랜잭션의 data 필드
   * @returns 파싱된 swap 함수 데이터
   */
  private parseSwapFunction(data: string): ParsedTransactionData {
    // 함수 시그니처 제거 (0x128acb08)
    const paramsData = data.slice(10);

    // 실제로는 ABI 디코딩을 사용해야 하지만,
    // 시뮬레이션을 위해 간단한 파싱을 구현합니다.
    // 실제 구현에서는 ethers.js의 Interface.parseTransaction을 사용합니다.

    return {
      function: 'swap',
      params: {
        recipient: this.extractAddress(paramsData, 0),
        zeroForOne: this.extractBool(paramsData, 32),
        amountSpecified: this.extractInt256(paramsData, 64),
        sqrtPriceLimitX96: this.extractUint160(paramsData, 96),
        data: this.extractBytes(paramsData, 128),
      },
    };
  }

  /**
   * 주소 추출
   *
   * 32바이트 데이터에서 주소(20바이트)를 추출합니다.
   *
   * @param data - 파라미터 데이터
   * @param offset - 오프셋 (바이트 단위)
   * @returns 주소 문자열
   */
  private extractAddress(data: string, offset: number): string {
    // 실제로는 ABI 디코딩을 사용해야 하지만,
    // 시뮬레이션을 위해 랜덤 주소를 반환합니다.
    return `0x${Math.random().toString(16).substr(2, 40)}`;
  }

  /**
   * 불린 값 추출
   *
   * 32바이트 데이터에서 불린 값을 추출합니다.
   *
   * @param data - 파라미터 데이터
   * @param offset - 오프셋 (바이트 단위)
   * @returns 불린 값
   */
  private extractBool(data: string, offset: number): boolean {
    // 실제로는 ABI 디코딩을 사용해야 하지만,
    // 시뮬레이션을 위해 랜덤 불린 값을 반환합니다.
    return Math.random() > 0.5;
  }

  /**
   * int256 값 추출
   *
   * 32바이트 데이터에서 int256 값을 추출합니다.
   *
   * @param data - 파라미터 데이터
   * @param offset - 오프셋 (바이트 단위)
   * @returns int256 값 (문자열)
   */
  private extractInt256(data: string, offset: number): string {
    // 실제로는 ABI 디코딩을 사용해야 하지만,
    // 시뮬레이션을 위해 랜덤 값을 반환합니다.
    const amount = Math.floor(Math.random() * 1000000000000000000); // 0~1 ETH (wei)
    return amount.toString();
  }

  /**
   * uint160 값 추출
   *
   * 32바이트 데이터에서 uint160 값을 추출합니다.
   *
   * @param data - 파라미터 데이터
   * @param offset - 오프셋 (바이트 단위)
   * @returns uint160 값 (문자열)
   */
  private extractUint160(data: string, offset: number): string {
    // 실제로는 ABI 디코딩을 사용해야 하지만,
    // 시뮬레이션을 위해 기본값을 반환합니다.
    return '0'; // sqrtPriceLimitX96 = 0 (가격 한도 없음)
  }

  /**
   * 바이트 데이터 추출
   *
   * 32바이트 데이터에서 바이트 배열을 추출합니다.
   *
   * @param data - 파라미터 데이터
   * @param offset - 오프셋 (바이트 단위)
   * @returns 바이트 데이터 (hex 문자열)
   */
  private extractBytes(data: string, offset: number): string {
    // 실제로는 ABI 디코딩을 사용해야 하지만,
    // 시뮬레이션을 위해 빈 바이트를 반환합니다.
    return '0x'; // 빈 바이트 데이터
  }

  /**
   * 함수 호출 데이터 인코딩
   *
   * 함수 파라미터를 ABI 인코딩하여 트랜잭션 data 필드를 생성합니다.
   * 실제로는 ethers.js의 Interface.encodeFunctionData를 사용해야 합니다.
   *
   * @param functionName - 함수명
   * @param params - 함수 파라미터
   * @returns 인코딩된 데이터 (hex 문자열)
   */
  encodeFunctionData(functionName: string, params: any[]): string {
    // 실제로는 ABI 인코딩을 사용해야 하지만,
    // 시뮬레이션을 위해 간단한 구현을 제공합니다.

    switch (functionName) {
      case 'swap':
        return this.encodeSwapFunction(params);
      default:
        throw new Error(`지원하지 않는 함수: ${functionName}`);
    }
  }

  /**
   * swap 함수 인코딩
   *
   * swap 함수 파라미터를 ABI 인코딩합니다.
   *
   * @param params - swap 함수 파라미터
   * @returns 인코딩된 데이터
   */
  private encodeSwapFunction(params: any[]): string {
    // 실제로는 ABI 인코딩을 사용해야 하지만,
    // 시뮬레이션을 위해 함수 시그니처만 반환합니다.
    return '0x128acb08' + '0'.repeat(64 * 5); // 5개 파라미터 * 32바이트
  }
}
