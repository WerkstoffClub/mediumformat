import { jwtSecret } from './jwt-secrets';

describe('jwtSecret', () => {
  it('returns the configured value', () => {
    expect(jwtSecret('JWT_SECRET', { JWT_SECRET: 'x'.repeat(48) })).toBe('x'.repeat(48));
  });
  it('throws when missing and NODE_ENV is unset or production', () => {
    expect(() => jwtSecret('JWT_SECRET', {})).toThrow('JWT_SECRET must be set');
    expect(() => jwtSecret('JWT_REFRESH_SECRET', { NODE_ENV: 'production' })).toThrow('JWT_REFRESH_SECRET');
  });
  it('falls back to dev secret only in development/test', () => {
    expect(jwtSecret('JWT_SECRET', { NODE_ENV: 'development' })).toBe('dev-secret');
    expect(jwtSecret('JWT_REFRESH_SECRET', { NODE_ENV: 'test' })).toBe('dev-refresh-secret');
  });
});
