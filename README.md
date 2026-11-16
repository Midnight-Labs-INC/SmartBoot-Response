# SmartBoot Response

SmartBoot Response is a Discord-connected alerting and phone notification service for SmartBoot systems. It connects Discord account management with a FreePBX/Asterisk telephony backend.

Built by **Midnight Labs**.

## Features

- Phone registration and verification
- Automated voice alerts through FreePBX
- Local text-to-speech with Piper
- Account management and alert forwarding
- Configurable TTS voices
- HTTP API and WebSocket integrations
- Demo alerts through a configured Discord webhook

## Requirements

- Docker Engine and Docker Compose
- A Discord application and bot token
- A FreePBX/Asterisk server with a dedicated AMI account
- A dedicated SFTP account on the PBX
- Network access from the host to the PBX AMI and SFTP ports

## Quick start

Clone the public branch:

```bash
git clone -b public-discordbot https://github.com/MidnightLabsUS/SmartBoot-Response.git
cd SmartBoot-Response
cp .env.example .env
```

Edit `.env` and configure the Discord and PBX settings. Place your PBX SSH private key at `./secrets/pbx_ed25519`, then restrict its permissions:

```bash
chmod 600 secrets/pbx_ed25519
docker compose up -d --build
```

The API listens on port `3000` inside the container. Configure your reverse proxy and HTTPS before exposing it publicly.

## Configuration

See [`.env.example`](.env.example) for all supported environment variables.

Important settings:

| Variable | Purpose |
|---|---|
| `DISCORD_TOKEN` | Discord bot token |
| `PBX_HOST` | FreePBX server address |
| `PBX_AMI_USERNAME` / `PBX_AMI_SECRET` | Dedicated AMI credentials |
| `PBX_SFTP_USERNAME` | Dedicated SFTP username |
| `PBX_SFTP_PRIVATE_KEY` | Path to the SFTP private key inside the container |
| `PBX_AUDIO_PATH` | Destination directory as seen by the SFTP account |
| `ADMIN_DISCORD_IDS` | Comma-separated administrator Discord user IDs |
| `ADMIN_ROLE_IDS` | Comma-separated administrator role IDs |

The SFTP destination must be writable by the dedicated SFTP account. The path is relative to the SFTP account's visible filesystem; for a chroot exposing an `uploads` directory, use `/uploads`.

## Discord commands

| Command | Description |
|---|---|
| `/setup` | Register a phone number or PBX extension |
| `/verify` | Verify a destination using the call code |
| `/resend-code` | Resend a verification call |
| `/cancel-setup` | Cancel a pending registration |
| `/accounts` | View registered accounts |
| `/update-account` | Change and re-verify a destination |
| `/remove-account` | Remove a registered account |
| `/link-account` | Forward alerts between accounts |
| `/unlink-account` | Remove an alert-forwarding link |
| `/account-links` | View forwarding links |
| `/set-voice` | Choose the alert voice |
| `/alerts` | View recent delivered alerts |
| `/admin` | View administrative statistics (admins only) |
| `/lookup` | Search accounts (admins only) |
| `/status` | Check service connectivity |

## API

| Endpoint | Purpose |
|---|---|
| `GET /api/healthcheck` | Health check |
| `POST /api/v1/alert` | Submit an alert |
| `POST /api/v1/webhook/:brand/:accountNumber` | Submit a brand-specific alert |
| `POST /api/v1/tts` | Request a text-to-speech phone message |
| `/api/v1/websocket/:accountNumber` | WebSocket connection |

Use HTTPS through a reverse proxy for public API access. Keep the PBX AMI and SFTP services private and restrict access to trusted source IPs.

## Data and operations

SQLite data is stored in the persistent `smartboot-data` Docker volume.

```bash
docker compose logs -f
docker compose restart smartboot-discordbot
docker compose up -d --build
docker compose down
```

**Do not run `docker compose down -v` unless you intend to delete the persistent database volume.**

## Security

- Never commit `.env`, tokens, webhook URLs, AMI credentials, or SSH private keys.
- Keep `secrets/` private and restrict private-key permissions.
- Use dedicated, least-privilege PBX credentials.
- Restrict AMI and SFTP access by source IP; do not expose AMI to the public internet.
- Back up the persistent database volume.
- Review your configuration before exposing the API.

## Contributing

Issues and pull requests are welcome. Please avoid including real phone numbers, account identifiers, credentials, webhook URLs, or other private information in issues and logs.

## License

GNU General Public License v3.0 or later. See [LICENSE](LICENSE).
