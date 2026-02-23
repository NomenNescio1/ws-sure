import { makeWASocket, DisconnectReason, useMultiFileAuthState, BaileysEventMap, WAMessage } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as pino from 'pino';
import * as dotenv from 'dotenv';
import * as qrcode from 'qrcode-terminal';
import { SureAPI } from './sure-api';
import { Bot } from './bot';
import { loadConfig, logConfig } from './config';
import { logger, logActivity } from './logger';
import { RateLimiter } from './rate-limiter';
import { SessionManager } from './types';

dotenv.config();

// Load and validate configuration
let config: ReturnType<typeof loadConfig>;
try {
  config = loadConfig();
  logConfig(config);
} catch (error: any) {
  console.error('💥 Failed to start bot:', error.message);
  process.exit(1);
}

const sentMessageIds = new Set<string>();
const rateLimiter = new RateLimiter(30, 60000); // 10 messages per minute per user
const sessionManager = new SessionManager();

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_state');

  const logger_baileysPrivate = pino.pino({ level: 'silent' });

  const socket = makeWASocket({
    auth: state,
    logger: logger_baileysPrivate,
    browser: ['whatsapp-sure-bot', 'Chrome', '1.0.0'],
  });

  const sureApi = new SureAPI(config.sureBaseUrl, config.sureApiKey);

  const bot = new Bot(sureApi);
  let botReady = false;

  // Start cleanup intervals
  sessionManager.startCleanupInterval();

  try {
    await bot.initialize();
    botReady = true;
    logger.info('✅ Bot initialized successfully');
  } catch (error: any) {
    logger.warn('⚠️  Failed to initialize Sure.am connection: ' + error.message);
    logger.warn('⚠️  WhatsApp will work, but transactions will fail until .env is configured.');
  }

  socket.ev.on('creds.update', saveCreds);

  socket.ev.on('connection.update', async (update: Partial<BaileysEventMap['connection.update']>) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info('📱 Scan this QR code with WhatsApp:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      logger.warn({ shouldReconnect }, 'Connection closed');

      if (shouldReconnect) {
        setTimeout(() => start(), 3000);
      }
    } else if (connection === 'open') {
      logger.info('✅ Connected to WhatsApp!');
    }
  });

  socket.ev.on('messages.upsert', async ({ messages, type }: BaileysEventMap['messages.upsert']) => {
    for (const msg of messages) {
      if (!msg.message) continue;

      try {
        const msgId = msg.key.id;
        if (msgId && sentMessageIds.has(msgId)) {
          logActivity.messageReceived('bot', 'own-message', msgId);
          sentMessageIds.delete(msgId);
          continue;
        }

        const sender = msg.key.remoteJid;
        if (!sender) {
          logger.warn('Message received without valid JID');
          continue;
        }

        const phoneNumber = sender.split('@')[0].replace(/[^0-9]/g, '');

        // Validate phone number format
        if (phoneNumber.length === 0) {
          logger.warn({ sender }, 'Invalid phone number format');
          continue;
        }

        // Check allowed numbers
        if (config.allowedPhoneNumbers.length > 0 && !config.allowedPhoneNumbers.includes(phoneNumber)) {
          logger.debug(`Ignoring message from unauthorized number: ${phoneNumber}`);
          continue;
        }

        // Rate limiting
        if (!rateLimiter.isAllowed(phoneNumber)) {
          logger.warn(`Rate limit exceeded for ${phoneNumber}`);
          const remaining = rateLimiter.getRemaining(phoneNumber);
          const sent = await socket.sendMessage(sender, {
            text: `⚠️ Too many requests. Please wait a moment. (Remaining: ${remaining} messages in next minute)`,
          });
          if (sent?.key?.id) sentMessageIds.add(sent.key.id);
          continue;
        }

        const text = 
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          '';

        if (!text) continue;

        logActivity.messageReceived(phoneNumber, text, msgId || '');

        if (!botReady) {
          const sent = await socket.sendMessage(sender, {
            text: '⚠️ Sure.am not configured. Please check .env file.',
          });
          if (sent?.key?.id) sentMessageIds.add(sent.key.id);
          continue;
        }

        const response = await bot.handleMessage(sender, text);
        const sent = await socket.sendMessage(sender, { text: response });
        if (sent?.key?.id) sentMessageIds.add(sent.key.id);

        logActivity.messageSent(phoneNumber, response);
      } catch (error: any) {
        logger.error(error, 'Error processing message');
        try {
          const sender = msg.key.remoteJid;
          if (sender) {
            const sent = await socket.sendMessage(sender, {
              text: '❌ An error occurred. Please try again.',
            });
            if (sent?.key?.id) sentMessageIds.add(sent.key.id);
          }
        } catch (sendError: any) {
          logger.error(sendError, 'Failed to send error message');
        }
      }
    }
  });
}

process.on('uncaughtException', (error) => {
  logger.fatal(error, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal(reason, 'Unhandled rejection');
  process.exit(1);
});

process.on('SIGINT', () => {
  logger.info('Shutting down gracefully...');
  sessionManager.destroy();
  rateLimiter.destroy();
  process.exit(0);
});

start();
