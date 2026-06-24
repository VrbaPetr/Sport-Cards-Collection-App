export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const required = [
    'DATABASE_URL',
    'FRONTEND_URL',
    'JWT_SECRET',
    'JWT_EXPIRES_IN',
    'JWT_REFRESH_SECRET',
    'JWT_REFRESH_EXPIRES_IN',
    'RESEND_API_KEY',
    'EMAIL_FROM',
    'STORAGE_PROVIDER',
    'S3_BUCKET',
    'S3_REGION',
    'S3_ACCESS_KEY_ID',
    'S3_SECRET_ACCESS_KEY',
  ];

  const missing = required.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (config['STORAGE_PROVIDER'] === 'r2' && !config['S3_ENDPOINT']) {
    throw new Error('S3_ENDPOINT is required when STORAGE_PROVIDER=r2');
  }

  return config;
}
