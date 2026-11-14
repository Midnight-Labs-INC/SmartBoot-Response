# SmartBoot Response

SmartBoot-only response platform. The dashboard is hosted at `smartboot.midnightlabs.tech`; panel/device traffic uses `response.devices.midnightlabs.tech`.

## Decisions
- Discord OAuth2 is the only sign-in method. Access is invitation-only by Discord user ID.
- Organizations contain members and sites. Sites contain locations; locations can contain multiple panels.
- Site contacts inherit into locations. A location can add, override, or exclude inherited contacts.
- Incident acknowledgment is supported by both dashboard and phone. Acknowledgment stops escalation; resolution is a separate action.
- Discord notifications are an optional integration, separate from mandatory Discord sign-in.

## Initial API
- `GET /health`
- `GET /auth/discord`
- `GET /auth/discord/callback`
- `GET /api/v1/me`
- `POST /auth/logout`

## Local setup
1. Copy `apps/api/.env.example` to `apps/api/.env` and fill in Discord OAuth credentials.
2. Set a strong `SESSION_SECRET` and database URL.
3. Start PostgreSQL with `docker compose up -d db`.
4. Apply `apps/api/migrations/001_initial.sql` using psql.
5. Run `cd apps/api && npm install && npm start`.

Create an organization and a row in `organization_invitations` for each allowed Discord user before sign-in. No public signup is provided.

## Security notes
Panel credentials are separate from human Discord sessions. Store only hashes of panel credentials. Device endpoints must validate signatures, timestamps, replay protection, and idempotency before creating incidents. Never pass event data into shell commands.
