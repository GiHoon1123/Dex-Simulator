import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { BlockService } from '../blockchain/block.service';
import { TransactionGeneratorService } from '../blockchain/transaction-generator.service';

/**
 * MevPrerequisitesGuard
 *
 * MEV API 호출 전에 필요한 전제조건들을 확인합니다:
 * 1. 블록 자동생성이 활성화되어 있어야 함
 * 2. 트랜잭션 자동생성이 활성화되어 있어야 함
 */
@Injectable()
export class MevPrerequisitesGuard implements CanActivate {
  constructor(
    private readonly blockService: BlockService,
    private readonly transactionGeneratorService: TransactionGeneratorService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const endpoint = request.route?.path || request.url;

    // 1. 블록 자동생성 확인
    if (!this.blockService.isAutoProduction()) {
      throw new BadRequestException({
        message:
          'MEV 시뮬레이션을 위해서는 블록 자동생성이 활성화되어야 합니다',
        required: {
          blockAutoProduction: false,
          txAutoGeneration: this.transactionGeneratorService.isActive(),
        },
        solution: 'POST /blockchain/auto-production/start 를 먼저 호출하세요',
      });
    }

    // 2. 트랜잭션 자동생성 확인
    if (!this.transactionGeneratorService.isActive()) {
      throw new BadRequestException({
        message:
          'MEV 시뮬레이션을 위해서는 트랜잭션 자동생성이 활성화되어야 합니다',
        required: {
          blockAutoProduction: true,
          txAutoGeneration: false,
        },
        solution: 'POST /blockchain/tx-generator/start 를 먼저 호출하세요',
      });
    }

    return true;
  }
}
