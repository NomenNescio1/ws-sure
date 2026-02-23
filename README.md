# WhatsApp Sure.am Bot

A WhatsApp bot for tracking transactions in [Sure.am](https://sure.am), a self-hosted personal finance app.

## Features

- Add transactions via WhatsApp
- Select account for each transaction
- Choose from your Sure.am categories
- View recent transactions
- List all accounts
- Phone number whitelist for security

## Prerequisites

- Node.js 18+
- A running [Sure.am](https://github.com/we-promise/sure) instance
- A phone with WhatsApp

## Installation

```bash
git clone <repo-url>
cd whatsapp-sure-bot
npm install
```

## Configuration

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Edit `.env` with your settings:

```env
# Your Sure.am instance URL
SURE_BASE_URL=https://sure-am.your-domain.com/

# API key from your Sure.am settings
SURE_API_KEY=your_api_key_here

# Allowed phone numbers (comma-separated, digits only)
ALLOWED_PHONE_NUMBERS=15551234567,447911123456

# Optional: Logging level (debug, info, warn, error)
LOG_LEVEL=info
```

### Getting Your API Key

1. Log in to your Sure.am instance
2. Go to Settings → API Keys
3. Create a new API key

## Usage

### Start the bot

```bash
npm run dev
```

### Connect WhatsApp

1. A QR code will appear in the terminal
2. Open WhatsApp on your phone
3. Go to Settings → Linked Devices → Link a device
4. Scan the QR code

### Commands

| Command | Description |
|---------|-------------|
| `new` | Start adding a new transaction |
| `/recent` | View your last 5 transactions |
| `/accounts` | List all your accounts |
| `/back` | Return to main menu |
| `/cancel` | Cancel current operation |
| `/help` | Show help message |

### Adding a Transaction

1. Send `new`
2. Reply `1` for Expense or `2` for Income
3. Select an account by number
4. Enter amount and name (e.g., `25.50 Trader Joe's`)
5. Select a category by number

### Message Formats for Amount

The bot accepts various formats:

- `25.50 Store Name`
- `$25.50 Store Name`
- `Store Name 25.50`
- `Store Name $25.50`

## Deployment

### AWS Lightsail / VPS

1. Build the project:
   ```bash
   npm run build
   ```

2. Use PM2 to keep it running:
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name whatsapp-sure-bot
   pm2 save
   pm2 startup
   ```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

## Development

```bash
# Run in development mode with auto-reload
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Troubleshooting

### Bot not responding to messages

1. Check your phone number in `ALLOWED_PHONE_NUMBERS` matches exactly (no `+` or spaces)
2. Check the console logs for the detected phone number format
3. Ensure you're messaging yourself (the linked WhatsApp account)

### Categories not loading

1. Verify `SURE_API_KEY` is correct
2. Verify `SURE_BASE_URL` is accessible
3. Check you have categories created in Sure.am

### QR code not appearing

1. Delete the auth state and reconnect:
   ```bash
   rm -rf auth_state
   npm run dev
   ```

### Session errors / Closing session logs

The auth state may be corrupted. Clear it and reconnect:

```bash
rm -rf auth_state
npm run dev
```

## Security

- Only whitelisted phone numbers can use the bot
- API key is stored locally in `.env`
- WhatsApp session is stored locally in `auth_state/`

## License

MIT
