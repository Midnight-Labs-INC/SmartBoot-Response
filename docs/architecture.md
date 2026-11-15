# SmartBoot Response — Discord/PBX branch

This branch contains the Discord bot and alert API only. It is deployed on its own VPS; FreePBX remains on a separate server.

## Runtime
- Node.js 22 in Docker Compose.
- SQLite data persisted in a named Docker volume.
- ElevenLabs generates speech audio over HTTPS.
- FFmpeg converts generated audio to 8 kHz mono PCM WAV.
- SFTP transfers WAV files to the FreePBX sounds directory.
- Asterisk Manager Interface (AMI) connects directly to the FreePBX public IP and configured port. No VPN or SSH tunnel is used for AMI.
- The API is published through Pangolin at `https://response.midnightlabs.tech`.

## Call flow
1. Receive an alert or TTS request.
2. Generate speech using ElevenLabs.
3. Convert to WAV for Asterisk.
4. Upload WAV to `PBX_AUDIO_PATH` over SFTP.
5. Send AMI Originate to `Local/<number>@from-internal`, entering the `roblox,s,1` dialplan with `AUDIO_FILE=smartboot/<filename>`.

The FreePBX dialplan must read `AUDIO_FILE` and play that recording. Confirm this dialplan before placing real calls.

## Network security
Allow AMI and SFTP only from the SmartBoot VPS public IP. Use a dedicated AMI manager and SFTP account, strong credentials, and TLS for AMI where configured. Plain AMI on TCP 5038 is unencrypted. Keep all secrets outside Git.
