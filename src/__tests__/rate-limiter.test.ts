import { RateLimiter } from '../rate-limiter'

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(3, 1000); // 3 attempts per second
  });

  afterEach(() => {
    limiter.destroy();
  });

  it('should allow requests within the limit', () => {
    expect(limiter.isAllowed('user1')).toBe(true);
    expect(limiter.isAllowed('user1')).toBe(true);
    expect(limiter.isAllowed('user1')).toBe(true);
  });

  it('should block requests exceeding the limit', () => {
    limiter.isAllowed('user1');
    limiter.isAllowed('user1');
    limiter.isAllowed('user1');
    expect(limiter.isAllowed('user1')).toBe(false);
  });

  it('should return correct remaining attempts', () => {
    limiter.isAllowed('user2');
    expect(limiter.getRemaining('user2')).toBe(2);
    limiter.isAllowed('user2');
    expect(limiter.getRemaining('user2')).toBe(1);
  });

  it('should reset user attempts', () => {
    limiter.isAllowed('user3');
    limiter.isAllowed('user3');
    limiter.isAllowed('user3');
    expect(limiter.isAllowed('user3')).toBe(false);

    limiter.reset('user3');
    expect(limiter.isAllowed('user3')).toBe(true);
  });
});
