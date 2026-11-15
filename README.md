# SmartBoot Response

**SmartBoot Response** is a Discord-connected alerting and phone notification service for SmartBoot systems. It connects Discord account management with a FreePBX telephony backend, allowing registered users to receive automated voice alerts.

Built by **Midnight Labs**.

## Features

- **Phone verification** — Register a phone number or PBX extension and verify it with an automated call.
- **Voice alerts** — Receive system alerts through automated phone calls.
- **Text-to-speech** — Alert messages are generated locally using Piper TTS.
- **Account management** — Register, update, view, and remove verified destinations.
- **Alert forwarding** — Link accounts so alerts can be delivered to another registered destination.
- **Configurable voices** — Choose the voice used for spoken alerts.
- **HTTP API and WebSocket** — Integrate supported systems with the alert service.
- **Demo alerts** — Send demonstration alerts to a configured Discord webhook.

## Discord commands

| Command | Description |
|---|---|
| `/setup` | Register a phone number or PBX extension. |
| `/verify` | Verify a destination using the code from the automated call. |
| `/resend-code` | Resend a verification call. |
| `/cancel-setup` | Cancel a pending registration. |
| `/accounts` | View your registered accounts. |
| `/update-account` | Change and re-verify a destination. |
| `/remove-account` | Remove one of your accounts. |
| `/link-account` | Forward alerts between accounts you own. |
| `/unlink-account` | Remove an alert-forwarding link. |
| `/account-links` | View your forwarding links. |
| `/set-voice` | Choose your alert voice. |

## How it works

1. A user registers a phone number or PBX extension through Discord.
2. SmartBoot Response generates a verification message and places an automated call through FreePBX.
3. Once verified, supported SmartBoot integrations can submit alerts to the API.
4. The service generates spoken alert audio with Piper and delivers the call through the configured PBX.

## Integrations

The service exposes an HTTP API and WebSocket interface for compatible systems.

### HTTP endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/healthcheck` | Basic application health check. |
| `POST /api/v1/alert` | Submit an alert using the legacy alert endpoint. |
| `POST /api/v1/webhook/:brand/:accountNumber` | Submit a brand-specific alert. |
| `POST /api/v1/tts` | Request a text-to-speech phone message. |
| `/api/v1/websocket/:accountNumber` | Connect an account to the WebSocket interface. |

The API listens on port `3000` by default. Place it behind a reverse proxy with HTTPS before exposing it publicly.

## Technology

- Node.js
- Discord.js
- SQLite
- Express and WebSocket
- FreePBX / Asterisk
- Piper TTS
- Docker

## Deployment

This repository contains the application and Docker configuration. Deployment requires a Discord application/bot, a configured FreePBX server, and the required AMI and SFTP access.

1. Clone the repository and check out the `dev-discordbot` branch.
2. Copy `.env.example` to `.env` and configure the Discord and PBX settings.
3. Configure the dedicated FreePBX AMI account and SFTP user.
4. Place the PBX SSH private key at `./secrets/pbx_ed25519` and restrict its permissions.
5. Configure the PBX dialplan and audio directory as described below.
6. Start the service:

```bash
docker compose up -d --build
```

### FreePBX requirements

- Create a dedicated AMI manager account with only the permissions required by the service.
- Restrict AMI and SSH/SFTP access to the SmartBoot host's public IP.
- Do not expose AMI broadly to the internet.
- Configure the dialplan to play the generated audio file supplied by the service.
- Set `PBX_AUDIO_PATH` to the path visible inside the SFTP user's chroot.

See `.env.example` for the available environment variables. Keep `.env`, webhook URLs, AMI credentials, and private SSH keys out of source control.

## Data and operations

SQLite data is stored in the `smartboot-data` Docker volume.

Useful commands:

```bash
docker compose logs -f
docker compose restart smartboot-discordbot
docker compose up -d --build
docker compose down
```

**Do not run `docker compose down -v` unless you intend to delete the persistent database volume.**

## Security

- Use dedicated, least-privilege PBX credentials.
- Restrict AMI and SFTP access by source IP.
- Use HTTPS for public API traffic.
- Never commit secrets, tokens, webhook URLs, or private keys.
- Back up the persistent database volume.

## Roadmap

Planned improvements include:

- Personal alert history through `/alerts`.
- An administrator dashboard through `/admin`.
- Account search by Discord ID, phone number, or account ID.
- Expanded service health reporting through `/status`, including Discord, API, database, and FreePBX connectivity.

Roadmap items are not necessarily available in the current release.

## License

SmartBoot Response is licensed under the GNU General Public License v3.0 or later. See [LICENSE](LICENSE).
