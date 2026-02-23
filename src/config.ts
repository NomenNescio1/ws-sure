import { logger } from './logger';

/**
 * Validated configuration from environment variables
 */
export interface Config {
  sureBaseUrl: string;
  sureApiKey: string;
  allowedPhoneNumbers: string[];
  logLevel: string;
}

/**
 * Validate and load configuration from environment variables
 */
export function loadConfig(): Config {
  const errors: string[] = [];

  // Validate required environment variables
  const sureBaseUrl = process.env.SURE_BASE_URL?.trim();
  if (!sureBaseUrl) {
    errors.push('SURE_BASE_URL is required');
  }

  const sureApiKey = process.env.SURE_API_KEY?.trim();
  if (!sureApiKey) {
    errors.push('SURE_API_KEY is required');
  }

  const logLevel = process.env.LOG_LEVEL || 'info';
  const validLogLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];
  if (!validLogLevels.includes(logLevel)) {
    errors.push(
      `LOG_LEVEL must be one of: ${validLogLevels.join(', ')}. Got: ${logLevel}`
    );
  }

  // Parse allowed phone numbers
  const allowedPhoneNumbersStr = (process.env.ALLOWED_PHONE_NUMBERS || '')
    .split(',')
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  // Validate phone numbers (digits only)
  const allowedPhoneNumbers: string[] = [];
  for (const num of allowedPhoneNumbersStr) {
    const cleaned = num.replace(/[^0-9]/g, '');
    if (cleaned.length === 0) {
      errors.push(`Invalid phone number format: ${num}`);
    } else {
      allowedPhoneNumbers.push(cleaned);
    }
  }

  if (errors.length > 0) {
    const message = `Configuration validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`;
    logger.error(message);
    throw new Error(message);
  }

  if (allowedPhoneNumbers.length === 0) {
    logger.warn('⚠️  No ALLOWED_PHONE_NUMBERS configured - bot will ignore all messages');
  }

  return {
    sureBaseUrl: sureBaseUrl!,
    sureApiKey: sureApiKey!,
    allowedPhoneNumbers,
    logLevel,
  };
}

/**
 * Log configuration securely (hiding sensitive values)
 */
export function logConfig(config: Config): void {
  logger.info({
    sureBaseUrl: config.sureBaseUrl,
    sureApiKey: `***${config.sureApiKey.slice(-4)}`,
    allowedPhoneNumbers: config.allowedPhoneNumbers,
    logLevel: config.logLevel,
  }, 'Configuration loaded');
}
