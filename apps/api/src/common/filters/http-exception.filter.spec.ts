import { ArgumentsHost, BadRequestException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { GlobalExceptionFilter } from './http-exception.filter';

function makeHost(): { host: ArgumentsHost; status: jest.Mock; json: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const mockResponse = { status, json };
  const mockHttp = { getResponse: jest.fn().mockReturnValue(mockResponse) };
  const host = { switchToHttp: jest.fn().mockReturnValue(mockHttp) } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
  });

  it('maps HttpException string response to error envelope', () => {
    const { host, status, json } = makeHost();
    filter.catch(new HttpException('Not found', HttpStatus.NOT_FOUND), host);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: { code: 'NOT_FOUND', message: 'Not found' } });
  });

  it('maps NotFoundException to error envelope', () => {
    const { host, status, json } = makeHost();
    filter.catch(new NotFoundException('Resource missing'), host);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: { code: 'NOT_FOUND', message: 'Resource missing' } });
  });

  it('maps class-validator array message to validation envelope with details', () => {
    const { host, status, json } = makeHost();
    filter.catch(new BadRequestException(['field must be a string', 'email must be valid']), host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'BAD_REQUEST',
        message: 'Validation failed',
        details: ['field must be a string', 'email must be valid'],
      },
    });
  });

  it('maps unknown error to 500 envelope', () => {
    const { host, status, json } = makeHost();
    filter.catch(new Error('boom'), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
    });
  });

  it('maps non-Error unknown to 500 envelope', () => {
    const { host, status, json } = makeHost();
    filter.catch('string error', host);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
    });
  });
});
