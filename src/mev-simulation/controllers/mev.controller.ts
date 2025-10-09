/**
 * MEV 시뮬레이션 컨트롤러
 * MEV 봇 관리 및 MEV 기회 조회 API 제공
 */

import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BlockchainPrerequisitesGuard } from '../../common/guards/blockchain-prerequisites.guard';
import { MevBotService } from '../services/mev-bot.service';
import { MevDetectorService } from '../services/mev-detector.service';

/**
 * MEV 봇 시작 요청 DTO
 */
export class StartMevBotDto {
  minProfit?: number;
  maxRisk?: number;
  gasPriceMultiplier?: number;
  maxOpportunities?: number;
  opportunityTimeout?: number;
  minConfidence?: number;
  enabledStrategies?: any[];
}

/**
 * MEV 기회 조회 쿼리 DTO
 */
export class GetMevOpportunitiesQueryDto {
  status?: string;
  strategy?: string;
  minProfit?: number;
  maxRisk?: number;
  limit?: number;
  offset?: number;
}

@ApiTags('MEV Simulation')
@Controller('mev')
@UseGuards(BlockchainPrerequisitesGuard)
export class MevController {
  constructor(
    private readonly mevBotService: MevBotService,
    private readonly mevDetectorService: MevDetectorService,
  ) {}

  /**
   * MEV 봇 시작
   */
  @Post('bot/start')
  @ApiOperation({
    summary: 'MEV 봇 시작',
    description: 'MEV 기회 감지 및 자동 공격을 시작합니다',
  })
  @ApiBody({
    type: StartMevBotDto,
    description: 'MEV 봇 설정 (선택사항)',
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'MEV 봇이 성공적으로 시작되었습니다',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '잘못된 요청 또는 봇이 이미 실행 중입니다',
  })
  async startBot(@Body() config?: StartMevBotDto) {
    try {
      await this.mevBotService.startBot(config);
      const botState = this.mevBotService.getBotState();

      return {
        success: true,
        message: 'MEV 봇이 시작되었습니다',
        botState,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'MEV 봇 시작에 실패했습니다',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * MEV 봇 중지
   */
  @Post('bot/stop')
  @ApiOperation({
    summary: 'MEV 봇 중지',
    description: '실행 중인 MEV 봇을 중지합니다',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'MEV 봇이 성공적으로 중지되었습니다',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'MEV 봇이 중지되었습니다' },
      },
    },
  })
  async stopBot() {
    try {
      await this.mevBotService.stopBot();

      return {
        success: true,
        message: 'MEV 봇이 중지되었습니다',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'MEV 봇 중지에 실패했습니다',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * MEV 봇 상태 조회
   */
  @Get('bot/status')
  @ApiOperation({
    summary: 'MEV 봇 상태 조회',
    description: '현재 MEV 봇의 상태와 설정을 조회합니다',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'MEV 봇 상태 정보',
  })
  getBotStatus() {
    const botState = this.mevBotService.getBotState();
    const queueStatus = this.mevBotService.getQueueStatus();

    return {
      botState,
      queueStatus,
    };
  }

  /**
   * MEV 기회 목록 조회
   */
  @Get('opportunities')
  @ApiOperation({
    summary: 'MEV 기회 목록 조회',
    description: '감지된 MEV 기회 목록을 조회합니다',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: '기회 상태 필터',
    example: 'DETECTED',
  })
  @ApiQuery({
    name: 'strategy',
    required: false,
    description: '전략 타입 필터',
    example: 'FRONT_RUN',
  })
  @ApiQuery({
    name: 'minProfit',
    required: false,
    description: '최소 수익 필터 (ETH)',
    example: 0.1,
  })
  @ApiQuery({
    name: 'maxRisk',
    required: false,
    description: '최대 리스크 필터',
    example: 5,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '조회할 최대 개수',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: '조회 시작 위치',
    example: 0,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'MEV 기회 목록',
  })
  getOpportunities(@Query() query: GetMevOpportunitiesQueryDto) {
    const allOpportunities = this.mevDetectorService.getOpportunities();
    const activeOpportunities = this.mevBotService.getActiveOpportunities();

    // 필터링
    let filteredOpportunities = allOpportunities;

    if (query.status) {
      filteredOpportunities = filteredOpportunities.filter(
        (o) => o.status === query.status,
      );
    }

    if (query.strategy) {
      filteredOpportunities = filteredOpportunities.filter(
        (o) => o.strategy === query.strategy,
      );
    }

    if (query.minProfit) {
      filteredOpportunities = filteredOpportunities.filter(
        (o) => o.estimatedProfit >= query.minProfit!,
      );
    }

    if (query.maxRisk) {
      filteredOpportunities = filteredOpportunities.filter(
        (o) => o.riskLevel <= query.maxRisk!,
      );
    }

    // 페이징
    const limit = query.limit || 10;
    const offset = query.offset || 0;
    const paginatedOpportunities = filteredOpportunities.slice(
      offset,
      offset + limit,
    );

    return {
      opportunities: paginatedOpportunities,
      total: filteredOpportunities.length,
      active: activeOpportunities.length,
    };
  }

  /**
   * MEV 통계 조회
   */
  @Get('stats')
  @ApiOperation({
    summary: 'MEV 통계 조회',
    description: 'MEV 봇의 실행 통계를 조회합니다',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'MEV 통계 정보',
  })
  getStats() {
    const stats = this.mevBotService.getStats();
    const botState = this.mevBotService.getBotState();

    return {
      ...stats,
      botStatus: botState.status,
      lastActivity: botState.lastActivity,
    };
  }
}
