import * as pino from 'pino';

/**
 * Structured logger instance with support for different log levels
 */
export const logger = pino.pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'production'
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Log levels:
 * - fatal: Server errors that may require shutdown
 * - error: Error conditions
 * - warn: Warning conditions
 * - info: Informational messages
 * - debug: Debug messages
 * - trace: Trace messages (very verbose)
 */

export const logActivity = {
  /**
   * Log a message from a user
   */
  messageReceived: (phoneNumber: string, text: string, msgId: string) => {
    logger.info(
      { phoneNumber, msgLength: text.length, msgId },
      'Message received'
    );
  },

  /**
   * Log a sent response
   */
  messageSent: (phoneNumber: string, text: string) => {
    logger.info(
      { phoneNumber, msgLength: text.length },
      'Message sent'
    );
  },

  /**
   * Log API call
   */
  apiCall: (method: string, endpoint: string, duration: number, status?: number) => {
    logger.debug(
      { method, endpoint, duration, status },
      'API call completed'
    );
  },

  /**
   * Log API error
   */
  apiError: (method: string, endpoint: string, error: string, status?: number) => {
    logger.error(
      { method, endpoint, status },
      `API error: ${error}`
    );
  },

  /**
   * Log transaction processing
   */
  transactionProcessing: (phoneNumber: string, amount: number, name: string) => {
    logger.info(
      { phoneNumber, amount, name },
      'Processing transaction'
    );
  },

  /**
   * Log transaction error
   */
  transactionError: (phoneNumber: string, error: string) => {
    logger.error({ phoneNumber }, `Transaction error: ${error}`);
  },
};
