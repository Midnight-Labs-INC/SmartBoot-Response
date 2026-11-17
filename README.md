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
| `/alerts` | View your 10 most recent delivered alerts. |
| `/admin` | View account totals and recent system activity (administrators only). |
| `/lookup` | Search by account ID, Discord ID, or phone number (administrators only). |
| `/status` | Check Discord, API, database, and FreePBX AMI connectivity. |

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

- Node.js 22+
- Discord.js
- SQLite
- Express and WebSocket
- FreePBX / Asterisk
- Piper TTS
- FFmpeg
- OpenSSH/SFTP

## Native deployment

This branch runs directly on Linux and does **not** require Docker.

### Requirements

- Linux server
- Node.js 22+
- npm
- Python 3 and `venv`
- FFmpeg
- OpenSSH client
- FreePBX/Asterisk with AMI and SFTP access

### Install

Clone the repository and switch to this branch:

```bash
git clone https://github.com/MidnightLabsUS/Response-Dev.git
cd Response-Dev
git checkout no-docker
```

Install system packages:

```bash
sudo apt update
sudo apt install -y ffmpeg openssh-client python3 python3-venv build-essential
```

Install Node dependencies:

```bash
npm ci --omit=dev
```

Install Piper and the voice model:

```bash
sudo python3 -m venv /opt/piper
sudo /opt/piper/bin/pip install --no-cache-dir piper-tts
sudo mkdir -p /opt/smartboot-response/models
sudo /opt/piper/bin/python -m piper.download_voices en_US-lessac-medium
sudo cp /opt/piper/lib/python*/site-packages/piper/voices/en_US-lessac-medium.onnx /opt/smartboot-response/models/
sudo cp /opt/piper/lib/python*/site-packages/piper/voices/en_US-lessac-medium.onnx.json /opt/smartboot-response/models/
```

If the voice files are installed somewhere else, set `PIPER_MODEL` in `.env` to their actual path.

### Configure

```bash
cp .env.example .env
nano .env
```

Set the Discord, PBX, SFTP, and administrator values.

Create the secrets directory and install the PBX SSH key:

```bash
mkdir -p secrets
chmod 700 secrets
chmod 600 secrets/pbx_ed25519
```

The public key can be stored beside it as `secrets/pbx_ed25519.pub`.

Keep `.env` and `secrets/` out of Git.

### Test

Run the service directly:

```bash
npm start
```

Check the native installation:

```bash
npm run check
```

### systemd

Copy the included service:

```bash
sudo useradd --system --home-dir /opt/smartboot-response --shell /usr/sbin/nologin smartboot 2>/dev/null || true
sudo chown -R smartboot:smartboot /opt/smartboot-response
sudo cp smartboot-response.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now smartboot-response
```

View logs:

```bash
sudo journalctl -u smartboot-response -f
```

Restart:

```bash
sudo systemctl restart smartboot-response
```

Status:

```bash
sudo systemctl status smartboot-response
```

### FreePBX requirements

- Create a dedicated AMI manager account with only the permissions required by the service.
- Restrict AMI and SSH/SFTP access to the SmartBoot host's public IP.
- Do not expose AMI broadly to the internet.
- Configure the dialplan to play the generated audio file supplied by the service.
- Set `PBX_AUDIO_PATH` to the path visible inside the SFTP user's chroot.

The application uploads generated WAV files through SFTP, then originates the call through AMI.

### Data

SQLite data is stored in `data/database.db`.

Back up the `data/` directory when migrating the service.

### Security

- Use dedicated, least-privilege PBX credentials.
- Restrict AMI and SFTP access by source IP.
- Use HTTPS for public API traffic.
- Never commit secrets, tokens, webhook URLs, or private keys.
- Back up the SQLite database.

## License

SmartBoot Response is licensed under the GNU General Public License v3.0 or later. See [LICENSE](LICENSE).
