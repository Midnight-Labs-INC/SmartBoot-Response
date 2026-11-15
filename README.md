# SmartBoot Response — Discord/PBX service

Discord bot and alert API. This branch connects to a separate FreePBX server using direct AMI TCP/TLS and SFTP audio delivery. TTS is generated locally with Piper; no ElevenLabs API key or paid voice access is required.

## Configure
1. Clone this branch and copy `.env.example` to `.env`.
2. Set `DISCORD_TOKEN` and the FreePBX AMI host, port, username, and secret. Piper and its US English voice are installed in the container.
3. Create a dedicated SSH key for the SmartBoot VPS and add its public key to the FreePBX SFTP user's `authorized_keys`.
4. Put the private key at `./secrets/pbx_ed25519` and run `chmod 600 secrets/pbx_ed25519`.
5. Create the audio directory on FreePBX: `/var/lib/asterisk/sounds/smartboot`, owned/writable by the SFTP account. Ensure Asterisk can read the uploaded files.
6. Create the matching directory under Asterisk sounds if needed and ensure the `roblox,s,1` dialplan uses `AUDIO_FILE` with Playback (without the file extension).
7. Start: `docker compose up -d --build`.

The private key and `.env` are ignored by Git. Never commit API keys, AMI secrets, or SSH private keys.

## PBX extension and phone verification
Registration accepts 2–6 digit PBX extensions as well as supported external phone-number formats. SmartBoot generates the verification prompt locally with Piper, uploads the WAV to FreePBX over SFTP, and originates a call to the saved destination. The existing `roblox,s,1` dialplan must play the `AUDIO_FILE` variable for the caller.

## FreePBX AMI
Create a dedicated AMI manager account (example username: `smartboot`) with only the permissions required for Originate. In `manager.conf`/FreePBX manager settings, permit the SmartBoot VPS public IP only. Do not expose AMI to the whole internet. The default AMI port is 5038; use TLS only if you have configured AMI TLS on FreePBX and set `PBX_AMI_TLS=true`. Plain AMI TCP is not encrypted.

SFTP is a separate direct connection used only to upload generated WAV files. It is not an AMI tunnel. Restrict SSH/SFTP access to the SmartBoot VPS IP as well.

## API / Pangolin
The API listens on port 3000. Point `response.midnightlabs.tech` through Pangolin/reverse proxy to the SmartBoot VPS on port 3000, using HTTPS at the public hostname. Health endpoint: `GET /api/healthcheck`.

Existing endpoints are retained:
- `POST /api/v1/alert`
- `POST /api/v1/webhook/:brand/:accountNumber`
- `POST /api/v1/tts`
- `/api/v1/websocket/:accountNumber`

## Commands
- Logs: `docker compose logs -f`
- Rebuild: `docker compose up -d --build`
- Stop: `docker compose down`

SQLite is persisted in the `smartboot-data` Docker volume. Do not run `docker compose down -v` unless you intend to delete it.
