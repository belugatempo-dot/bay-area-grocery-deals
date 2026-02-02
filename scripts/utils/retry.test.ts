import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry } from './retry';

describe('withRetry', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    const result = await withRetry(fn, { baseDelay: 1, maxDelay: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after maxRetries exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));

    await expect(
      withRetry(fn, { maxRetries: 2, baseDelay: 1, maxDelay: 1 })
    ).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('does not retry 4xx client errors', async () => {
    const error = Object.assign(new Error('Not Found'), { status: 404 });
    const fn = vi.fn().mockRejectedValue(error);

    await expect(withRetry(fn, { maxRetries: 3, baseDelay: 1 })).rejects.toThrow('Not Found');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not retry 400 Bad Request', async () => {
    const error = Object.assign(new Error('Bad Request'), { status: 400 });
    const fn = vi.fn().mockRejectedValue(error);

    await expect(withRetry(fn, { baseDelay: 1 })).rejects.toThrow('Bad Request');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not retry 403 Forbidden', async () => {
    const error = Object.assign(new Error('Forbidden'), { status: 403 });
    const fn = vi.fn().mockRejectedValue(error);

    await expect(withRetry(fn, { baseDelay: 1 })).rejects.toThrow('Forbidden');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not retry 429 Too Many Requests', async () => {
    const error = Object.assign(new Error('Too Many Requests'), { status: 429 });
    const fn = vi.fn().mockRejectedValue(error);

    await expect(withRetry(fn, { baseDelay: 1 })).rejects.toThrow('Too Many Requests');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not retry 499 client error', async () => {
    const error = Object.assign(new Error('Client Closed'), { status: 499 });
    const fn = vi.fn().mockRejectedValue(error);

    await expect(withRetry(fn, { baseDelay: 1 })).rejects.toThrow('Client Closed');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries 500 server errors', async () => {
    const error = Object.assign(new Error('Server Error'), { status: 500 });
    const fn = vi.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('recovered');

    const result = await withRetry(fn, { baseDelay: 1, maxDelay: 1 });
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries 503 Service Unavailable', async () => {
    const error = Object.assign(new Error('Service Unavailable'), { status: 503 });
    const fn = vi.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('back up');

    const result = await withRetry(fn, { baseDelay: 1, maxDelay: 1 });
    expect(result).toBe('back up');
  });

  it('uses default maxRetries of 3', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    await expect(
      withRetry(fn, { baseDelay: 1, maxDelay: 1 })
    ).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  });

  it('respects maxRetries=0 (no retries)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    await expect(
      withRetry(fn, { maxRetries: 0, baseDelay: 1 })
    ).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('respects maxRetries=1', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    await expect(
      withRetry(fn, { maxRetries: 1, baseDelay: 1, maxDelay: 1 })
    ).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries errors without status property', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new TypeError('Network error'))
      .mockResolvedValue('ok');

    const result = await withRetry(fn, { baseDelay: 1, maxDelay: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries with non-Error throws', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce('string error')
      .mockResolvedValue('ok');

    const result = await withRetry(fn, { baseDelay: 1, maxDelay: 1 });
    expect(result).toBe('ok');
  });

  it('passes through generic values', async () => {
    const fn = vi.fn().mockResolvedValue({ data: [1, 2, 3] });
    const result = await withRetry(fn);
    expect(result).toEqual({ data: [1, 2, 3] });
  });

  it('logs retry attempts', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    await withRetry(fn, { baseDelay: 1, maxDelay: 1 });
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Retry 1/3'));
  });

  it('succeeds on last retry attempt', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockRejectedValueOnce(new Error('fail 3'))
      .mockResolvedValue('finally');

    const result = await withRetry(fn, { maxRetries: 3, baseDelay: 1, maxDelay: 1 });
    expect(result).toBe('finally');
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it('throws the last error when all retries fail', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('error 1'))
      .mockRejectedValueOnce(new Error('error 2'))
      .mockRejectedValue(new Error('error 3'));

    await expect(
      withRetry(fn, { maxRetries: 2, baseDelay: 1, maxDelay: 1 })
    ).rejects.toThrow('error 3');
  });
});
