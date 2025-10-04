/**
 * MEV 시뮬레이션 컨트롤러
 * MEV 봇 관리 및 MEV 기회 조회 API 제공
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { MevBotService } from '../services/mev-bot.service';
import { MevDetectorService } from '../services/mev-detector.service';
import { MevStrategyService } from '../services/mev-strategy.service';
import { BlockchainPrerequisitesGuard } from '../../common/guards/blockchain-prerequisites.guard';
import {
  MEVBotConfig,
  MEVBotState,
  MEVStats,
  MEVOpportunity,
} from '../types/mev.interface';
import { MEVStrategy } from '../types/strategy.interface';

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
 * MEV 봇 설정 업데이트 DTO
 */
export class UpdateMevBotConfigDto {
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
    private readonly mevStrategyService: MevStrategyService,
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
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'MEV 봇이 시작되었습니다' },
        botState: { $ref: '#/components/schemas/MEVBotState' },
      },
    },
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
    schema: {
      type: 'object',
      properties: {
        botState: { $ref: '#/components/schemas/MEVBotState' },
        queueStatus: {
          type: 'object',
          properties: {
            queueLength: { type: 'number', example: 3 },
            isProcessing: { type: 'boolean', example: true },
          },
        },
      },
    },
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
   * MEV 봇 설정 업데이트
   */
  @Post('bot/config')
  @ApiOperation({
    summary: 'MEV 봇 설정 업데이트',
    description: 'MEV 봇의 설정을 업데이트합니다',
  })
  @ApiBody({
    type: UpdateMevBotConfigDto,
    description: '업데이트할 설정',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '설정이 성공적으로 업데이트되었습니다',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: '설정이 업데이트되었습니다' },
        config: { $ref: '#/components/schemas/MEVBotConfig' },
      },
    },
  })
  updateBotConfig(@Body() config: UpdateMevBotConfigDto) {
    try {
      this.mevBotService.updateConfig(config);
      const updatedConfig = this.mevBotService.getBotState().config;

      return {
        success: true,
        message: '설정이 업데이트되었습니다',
        config: updatedConfig,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: '설정 업데이트에 실패했습니다',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
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
    schema: {
      type: 'object',
      properties: {
        opportunities: {
          type: 'array',
          items: { $ref: '#/components/schemas/MEVOpportunity' },
        },
        total: { type: 'number', example: 25 },
        active: { type: 'number', example: 3 },
      },
    },
  })
  getOpportunities(@Query() query: GetMevOpportunitiesQueryDto) {
    const allOpportunities = this.mevDetectorService.getOpportunities();
    const activeOpportunities = this.mevBotService.getActiveOpportunities();

    // 필터링
    let filteredOpportunities = allOpportunities;

    if (query.status) {
      filteredOpportunities = filteredOpportunities.filter(
        o => o.status === query.status,
      );
    }

    if (query.strategy) {
      filteredOpportunities = filteredOpportunities.filter(
        o => o.strategy === query.strategy,
      );
    }

    if (query.minProfit) {
      filteredOpportunities = filteredOpportunities.filter(
        o => o.estimatedProfit >= query.minProfit!,
      );
    }

    if (query.maxRisk) {
      filteredOpportunities = filteredOpportunities.filter(
        o => o.riskLevel <= query.maxRisk!,
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
   * 특정 MEV 기회 조회
   */
  @Get('opportunities/:id')
  @ApiOperation({
    summary: '특정 MEV 기회 조회',
    description: 'ID로 특정 MEV 기회의 상세 정보를 조회합니다',
  })
  @ApiParam({
    name: 'id',
    description: 'MEV 기회 ID',
    example: 'mev_tx_123_1640995200000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'MEV 기회 상세 정보',
    schema: {
      $ref: '#/components/schemas/MEVOpportunity',
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'MEV 기회를 찾을 수 없습니다',
  })
  getOpportunity(@Param('id') id: string) {
    const opportunity = this.mevDetectorService.getOpportunity(id);

    if (!opportunity) {
      throw new HttpException(
        {
          success: false,
          message: 'MEV 기회를 찾을 수 없습니다',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return opportunity;
  }

  /**
   * 사용 가능한 MEV 전략 목록 조회
   */
  @Get('strategies')
  @ApiOperation({
    summary: 'MEV 전략 목록 조회',
    description: '사용 가능한 MEV 전략 목록을 조회합니다',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'MEV 전략 목록',
    schema: {
      type: 'object',
      properties: {
        strategies: {
          type: 'array',
          items: { $ref: '#/components/schemas/MEVStrategy' },
        },
        count: { type: 'number', example: 3 },
      },
    },
  })
  getStrategies() {
    const strategies = this.mevStrategyService.getAvailableStrategies();

    return {
      strategies,
      count: strategies.length,
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
    schema: {
      $ref: '#/components/schemas/MEVStats',
    },
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

  /**
   * MEV 전제조건 확인
   */
  @Get('prerequisites/check')
  @ApiOperation({
    summary: 'MEV 전제조건 확인',
    description: 'MEV 시뮬레이션 실행을 위한 전제조건을 확인합니다',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '전제조건 확인 결과',
    schema: {
      type: 'object',
      properties: {
        ready: { type: 'boolean', example: true },
        requirements: {
          type: 'object',
          properties: {
            blockchainRunning: { type: 'boolean', example: true },
            autoBlockGeneration: { type: 'boolean', example: true },
            autoTransactionGeneration: { type: 'boolean', example: true },
            poolsInitialized: { type: 'boolean', example: true },
          },
        },
        message: { type: 'string', example: '모든 전제조건이 충족되었습니다' },
      },
    },
  })
  checkPrerequisites() {
    // BlockchainPrerequisitesGuard가 이미 확인하므로 여기서는 성공 응답만 반환
    return {
      ready: true,
      requirements: {
        blockchainRunning: true,
        autoBlockGeneration: true,
        autoTransactionGeneration: true,
        poolsInitialized: true,
      },
      message: '모든 전제조건이 충족되었습니다',
    };
  }

  /**
   * 활성 기회 목록 조회
   */
  @Get('opportunities/active')
  @ApiOperation({
    summary: '활성 MEV 기회 조회',
    description: '현재 처리 중인 활성 MEV 기회 목록을 조회합니다',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '활성 MEV 기회 목록',
    schema: {
      type: 'object',
      properties: {
        activeOpportunities: {
          type: 'array',
          items: { $ref: '#/components/schemas/MEVOpportunity' },
        },
        count: { type: 'number', example: 2 },
      },
    },
  })
  getActiveOpportunities() {
    const activeOpportunities = this.mevBotService.getActiveOpportunities();

    return {
      activeOpportunities,
      count: activeOpportunities.length,
    };
  }
}
