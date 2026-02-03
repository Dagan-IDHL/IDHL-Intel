# PocketBase Setup (Intel / Pulse Insight)

Phase 7 switches Intel from mock/localStorage persistence to PocketBase for:

- Authentication (email/password via PocketBase auth collection)
- Clients list + per-user access
- Custom Analysis graphs (GraphSpec)
- Report layouts
- User preferences
- Connector placeholders (GA4/GSC mapping)

## Environment variables

Set these in your runtime (Railway/local `.env`):

- `POCKETBASE_URL` (required) — e.g. `https://your-pocketbase.up.railway.app`
- `POCKETBASE_AUTH_COLLECTION` (optional) — defaults to `users`

## Required collections + fields

### 1) Auth collection: `users`

Use PocketBaseâ€™s auth collection.

- Add field: `role` (text, optional, default: `standard`)

### 2) `clients`

- `clientName` (text, required)
- `url` (url or text, required)
- `users` (relation, **multiple**, required; relates to `users`)

### 3) `custom_graphs`

- `client` (relation, required; relates to `clients`)
- `spec` (json, required) â€” stores the GraphSpec payload
- `title` (text, optional)
- `createdBy` (relation, optional; relates to `users`)

### 4) `report_layouts`

- `client` (relation, required; relates to `clients`)
- `title` (text, required)
- `items` (json, required) â€” stores the report grid items
- `updatedBy` (relation, optional; relates to `users`)

### 5) `user_preferences`

- `user` (relation, required; relates to `users`)
- `prefs` (json, required)

Recommended shape stored in `prefs`:

```json
{
  "preset": "last_28_days",
  "compareMode": "mom",
  "granularity": "auto"
}
```

### 6) `connectors`

Used as a placeholder for Phase 8/9 (OAuth + mapping).

- `client` (relation, required; relates to `clients`)
- `provider` (select or text, required; e.g. `ga4`, `gsc`)
- `status` (select or text, optional; e.g. `disconnected`, `connected`, `error`)
- `config` (json, optional)

## Suggested API rules (minimum viable)

These rules keep users limited to records linked to their PocketBase auth id.

### `clients`

- **List / View / Update / Delete rule**
  - `@request.auth.id != "" && users.id ?= @request.auth.id`
- **Create rule**
  - `@request.auth.id != ""`

### `custom_graphs`

- **List / View / Update / Delete rule**
  - `@request.auth.id != "" && client.users.id ?= @request.auth.id`
- **Create rule**
  - `@request.auth.id != "" && client.users.id ?= @request.auth.id`

### `report_layouts`

- **List / View / Update / Delete rule**
  - `@request.auth.id != "" && client.users.id ?= @request.auth.id`
- **Create rule**
  - `@request.auth.id != "" && client.users.id ?= @request.auth.id`

### `user_preferences`

- **List / View / Update / Delete rule**
  - `@request.auth.id != "" && user.id = @request.auth.id`
- **Create rule**
  - `@request.auth.id != "" && user.id = @request.auth.id`

### `connectors`

- **List / View / Update / Delete rule**
  - `@request.auth.id != "" && client.users.id ?= @request.auth.id`
- **Create rule**
  - `@request.auth.id != "" && client.users.id ?= @request.auth.id`

## Endpoints Intel uses (for Phase 7)

- `POST /api/auth/login` â€” PocketBase password auth (sets `pb_auth`)
- `POST /api/auth/logout` â€” clears `pb_auth`
- `GET /api/clients` â€” list accessible clients
- `POST /api/clients` â€” create client (auto-assigns current user in `clients.users`)
- `GET /api/clients/:clientId/custom-graphs`
- `POST /api/clients/:clientId/custom-graphs`
- `DELETE /api/clients/:clientId/custom-graphs/:graphId`
- `GET /api/clients/:clientId/report-layout`
- `PUT /api/clients/:clientId/report-layout`
- `GET /api/me/preferences`
- `PUT /api/me/preferences`
- `GET /api/clients/:clientId/connectors`
- `PUT /api/clients/:clientId/connectors`

