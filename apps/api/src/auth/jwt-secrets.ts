const DEV_FALLBACKS = { JWT_SECRET: 'dev-secret', JWT_REFRESH_SECRET: 'dev-refresh-secret' } as const;

/**
 * Reads a JWT secret from the environment. The insecure dev fallback is only
 * allowed when NODE_ENV is explicitly 'development' or 'test'; anywhere else
 * (including unset, as in the Docker deploy) a missing secret fails startup.
 */
export function jwtSecret(name: keyof typeof DEV_FALLBACKS, env: NodeJS.ProcessEnv = process.env): string {
  const value = env[name];
  if (value) return value;
  if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') return DEV_FALLBACKS[name];
  throw new Error(`${name} must be set (refusing to start with an insecure default)`);
}
