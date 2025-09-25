import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpExceptionFilter } from '../../../../src/common/filters/http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HttpExceptionFilter],
    }).compile();

    filter = module.get<HttpExceptionFilter>(HttpExceptionFilter);

    // Mock Response 객체 생성
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Mock Request 객체 생성
    mockRequest = {
      url: '/test-url',
      method: 'GET',
    };

    // Mock ArgumentsHost 생성
    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any;
  });

  it('HTTP 예외를 올바르게 처리해야 합니다', () => {
    // Given: HTTP 예외 생성
    const httpException = new HttpException(
      '테스트 에러 메시지',
      HttpStatus.BAD_REQUEST,
    );

    // When: 필터 실행
    filter.catch(httpException, mockArgumentsHost);

    // Then: 올바른 응답이 반환되어야 함
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      timestamp: expect.any(String),
      path: '/test-url',
      method: 'GET',
      message: '테스트 에러 메시지',
    });
  });

  it('일반 Error 객체를 BAD_REQUEST로 처리해야 합니다', () => {
    // Given: 일반 Error 객체 생성
    const error = new Error('일반 에러 메시지');

    // When: 필터 실행
    filter.catch(error, mockArgumentsHost);

    // Then: BAD_REQUEST 상태로 처리되어야 함
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      timestamp: expect.any(String),
      path: '/test-url',
      method: 'GET',
      message: '일반 에러 메시지',
    });
  });

  it('알 수 없는 예외를 INTERNAL_SERVER_ERROR로 처리해야 합니다', () => {
    // Given: 알 수 없는 예외 객체
    const unknownException = { someProperty: 'value' };

    // When: 필터 실행
    filter.catch(unknownException, mockArgumentsHost);

    // Then: INTERNAL_SERVER_ERROR로 처리되어야 함
    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: expect.any(String),
      path: '/test-url',
      method: 'GET',
      message: 'Internal server error',
    });
  });

  it('null 예외를 INTERNAL_SERVER_ERROR로 처리해야 합니다', () => {
    // Given: null 예외
    const nullException = null;

    // When: 필터 실행
    filter.catch(nullException, mockArgumentsHost);

    // Then: INTERNAL_SERVER_ERROR로 처리되어야 함
    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: expect.any(String),
      path: '/test-url',
      method: 'GET',
      message: 'Internal server error',
    });
  });

  it('undefined 예외를 INTERNAL_SERVER_ERROR로 처리해야 합니다', () => {
    // Given: undefined 예외
    const undefinedException = undefined;

    // When: 필터 실행
    filter.catch(undefinedException, mockArgumentsHost);

    // Then: INTERNAL_SERVER_ERROR로 처리되어야 함
    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: expect.any(String),
      path: '/test-url',
      method: 'GET',
      message: 'Internal server error',
    });
  });

  it('응답에 올바른 타임스탬프가 포함되어야 합니다', () => {
    // Given: HTTP 예외
    const httpException = new HttpException(
      '타임스탬프 테스트',
      HttpStatus.NOT_FOUND,
    );
    const beforeTime = new Date().toISOString();

    // When: 필터 실행
    filter.catch(httpException, mockArgumentsHost);

    // Then: 타임스탬프가 올바르게 설정되어야 함
    const afterTime = new Date().toISOString();
    const responseCall = mockResponse.json.mock.calls[0][0];

    expect(responseCall.timestamp).toBeDefined();
    expect(new Date(responseCall.timestamp).getTime()).toBeGreaterThanOrEqual(
      new Date(beforeTime).getTime(),
    );
    expect(new Date(responseCall.timestamp).getTime()).toBeLessThanOrEqual(
      new Date(afterTime).getTime(),
    );
  });

  it('다양한 HTTP 상태 코드를 올바르게 처리해야 합니다', () => {
    // Given: 다양한 HTTP 상태 코드들
    const statusCodes = [
      HttpStatus.OK,
      HttpStatus.CREATED,
      HttpStatus.NO_CONTENT,
      HttpStatus.UNAUTHORIZED,
      HttpStatus.FORBIDDEN,
      HttpStatus.NOT_FOUND,
      HttpStatus.CONFLICT,
      HttpStatus.UNPROCESSABLE_ENTITY,
      HttpStatus.TOO_MANY_REQUESTS,
    ];

    statusCodes.forEach((statusCode) => {
      // Given: 해당 상태 코드의 예외
      const exception = new HttpException(
        `상태 코드 ${statusCode} 테스트`,
        statusCode,
      );

      // When: 필터 실행
      filter.catch(exception, mockArgumentsHost);

      // Then: 올바른 상태 코드로 응답해야 함
      expect(mockResponse.status).toHaveBeenCalledWith(statusCode);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode,
        timestamp: expect.any(String),
        path: '/test-url',
        method: 'GET',
        message: `상태 코드 ${statusCode} 테스트`,
      });
    });
  });

  it('Error 객체의 message가 없을 때 기본 메시지를 사용해야 합니다', () => {
    // Given: message가 없는 Error 객체
    const errorWithoutMessage = new Error();
    errorWithoutMessage.message = '';

    // When: 필터 실행
    filter.catch(errorWithoutMessage, mockArgumentsHost);

    // Then: 빈 메시지로 처리되어야 함
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      timestamp: expect.any(String),
      path: '/test-url',
      method: 'GET',
      message: '',
    });
  });
});
