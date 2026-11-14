# SmartBoot Response

SmartBoot-only response platform. The dashboard is hosted at `smartboot.midnightlabs.tech`; panel/device traffic uses `response.devices.midnightlabs.tech`.

## Decisions
- Discord OAuth2 is the only sign-in method. Access is invitation-only by Discord user ID.
- Organizations contain members and sites. Sites contain locations; locations can contain multiple panels.
- Site contacts inherit into locations. A location can add, override, or exclude inherited contacts.
- Incident acknowledgment is supported by both dashboard and phone. Acknowledgment stops escalation; resolution is a separate action.
- Discord notifications are an optional integration, separate from mandatory Discord sign-in.

## Start everything with Docker

1. Copy the root environment template: `cp .env.example .env`.
2. Set a strong `POSTGRES_PASSWORD` and `SESSION_SECRET`, then add your Discord OAuth application credentials.
3. Run `docker compose up -d --build`.

Compose starts PostgreSQL, waits for its health check, builds and starts the API, and applies pending SQL migrations automatically. No host Node.js, npm install, or manual database commands are required.

- API: `http://localhost:3100`
- Health check: `http://localhost:3100/health`
- Discord callback: `http://localhost:3100/auth/discord/callback`

Set the Discord application's redirect URI to exactly match `DISCORD_REDIRECT_URI` in `.env`. For deployment, set the public HTTPS callback and dashboard URL before starting the stack. The API port can be changed with `API_PORT`.

Useful commands:
- Logs: `docker compose logs -f`
- Stop: `docker compose down`
- Stop and preserve database: `docker compose down`
- Rebuild after code changes: `docker compose up -d --build`

The named PostgreSQL volume persists database data. Do not use `docker compose down -v` unless you intend to delete it.

Create an organization and a row in `organization_invitations` for each allowed Discord user before sign-in. No public signup is provided.

## Initial API
- `GET /health`
- `GET /auth/discord`
- `GET /auth/discord/callback`
- `GET /api/v1/me`
- `POST /auth/logout`

## Security notes
Panel credentials are separate from human Discord sessions. Store only hashes of panel credentials. Device endpoints must validate signatures, timestamps, replay protection, and idempotency before creating incidents. Never pass event data into shell commands.
