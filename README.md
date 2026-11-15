# SmartBoot Discord Bot

Discord bot and legacy alert service for SmartBoot Response.

## Requirements
- Node.js 22+
- Discord bot token
- SQLite
- Asterisk CLI available at `/var/lib/asterisk/bin/originate`
- Configured TTS engines and `ffmpeg`

## Setup
1. Copy `.env.example` to `.env` and set `DISCORD_TOKEN`.
2. Install dependencies with `npm install`.
3. Configure `bot/config/tts.json` and `bot/config/tts-message.json`.
4. Run `npm start`.

Runtime data is stored in `data/database.db`. Existing SQL migrations remain in `migrations/` and are applied on startup.

This branch contains the Discord bot/legacy alert runtime; the separate dashboard/API stack is not required to run it.
