import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

const mockContext = {} as ExecutionContext;

function makeHandler(value: unknown): CallHandler {
  return { handle: () => of(value) };
}

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  it('wraps a plain object in { data }', (done) => {
    interceptor.intercept(mockContext, makeHandler({ status: 'ok' })).subscribe((result) => {
      expect(result).toEqual({ data: { status: 'ok' } });
      done();
    });
  });

  it('wraps a primitive string in { data }', (done) => {
    interceptor.intercept(mockContext, makeHandler('hello')).subscribe((result) => {
      expect(result).toEqual({ data: 'hello' });
      done();
    });
  });

  it('wraps null in { data: null }', (done) => {
    interceptor.intercept(mockContext, makeHandler(null)).subscribe((result) => {
      expect(result).toEqual({ data: null });
      done();
    });
  });

  it('passes through a pre-wrapped { data } response unchanged', (done) => {
    const pre = { data: [1, 2, 3] };
    interceptor.intercept(mockContext, makeHandler(pre)).subscribe((result) => {
      expect(result).toBe(pre);
      done();
    });
  });

  it('passes through a { data, meta } response unchanged', (done) => {
    const pre = { data: [1, 2], meta: { total: 2, page: 1 } };
    interceptor.intercept(mockContext, makeHandler(pre)).subscribe((result) => {
      expect(result).toBe(pre);
      done();
    });
  });
});
