# IT WebPlay v2

Hosted, multi-user web launcher for Immortal Taoist. Replaces the localStorage-based single-user setup with cloud accounts, encrypted credential storage, and an admin dashboard.

## Architecture

```
Browser (index.html)          Cloudflare Pages Functions          Supabase
   │                              │                                  │
   ├─ Auth (signup/login) ───────►│──────────────────────────────────►│ Auth
   │                              │                                  │
   ├─ Load accounts ─────────────►│ (via Supabase client + RLS) ────►│ PostgreSQL
   │                              │                                  │
   ├─ Add/Edit account ──────────►│ /api/accounts                    │
   │   (plaintext creds)          │   ├─ AES-256-GCM encrypt ──────►│ game_accounts
   │                              │   └─ store encrypted             │
   │                              │                                  │
   ├─ Launch game ───────────────►│ /api/game-launch                 │
   │                              │   ├─ decrypt creds               │
   │                              │   ├─ call game API ─────────────►│ hkpctimes.com
   │   ◄── game URL ─────────────│   └─ return game URL             │
   │   └─ window.open(game)       │                                  │
   │                              │                                  │
   ├─ Admin panel ───────────────►│ /api/admin/*                     │
   │                              │   └─ verify role server-side     │
```

## Security

- **Game passwords** are encrypted with AES-256-GCM before storage. The encryption key lives only in Cloudflare environment variables — never in the browser.
- **Game login flow** is proxied through Cloudflare Functions. Plaintext credentials exist only briefly in server memory during the API call, and are never sent to the browser.
- **Row Level Security** on all tables. Users can only read/write their own game accounts.
- **Admin role** is enforced server-side. The admin endpoints verify the caller's role from the database on every request.
- **Supabase service role key** is only used in Cloudflare Functions (server-side). The browser only sees the public anon key.

## Setup

### 1. Supabase Project

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `migrations/001_initial_schema.sql`
3. Note your project's:
   - **URL** (Settings → API → Project URL)
   - **Anon Key** (Settings → API → `anon` `public`)
   - **Service Role Key** (Settings → API → `service_role` `secret`)

### 2. Configure the Frontend

Edit `index.html` and replace the placeholder values near the top of the `<script>`:

```js
const SUPABASE_URL  = 'https://your-project.supabase.co';
const SUPABASE_ANON = 'eyJ...your-anon-key...';
```

These are **public** keys and safe to commit.

### 3. Deploy to Cloudflare Pages

```bash
# Install dependencies (needed for Functions bundling)
npm install

# Option A: Deploy via CLI
npx wrangler pages deploy . --project-name it-webplay

# Option B: Connect to GitHub
# Cloudflare Dashboard → Pages → Create → Connect to Git
# Build command: npm install
# Output directory: . (root)
```

### 4. Set Environment Variables

In **Cloudflare Dashboard → Pages → your project → Settings → Environment Variables**, add:

| Variable | Value | Encrypted? |
|---|---|---|
| `SUPABASE_URL` | `https://your-project.supabase.co` | No |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...service-role-key...` | **Yes** |
| `ENCRYPTION_KEY` | 64-char hex string | **Yes** |

Generate the encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Make Yourself Admin

After signing up on the deployed site, run this in Supabase SQL Editor:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

## Migration from v1

When you sign in, if your browser still has the old localStorage `auths` data, a banner appears offering to import those accounts into your cloud account. The import:

1. Reads the `auths` array from localStorage
2. Sends each account's credentials to `/api/migrate`
3. Encrypts and stores them server-side
4. Clears the old localStorage data

## Project Structure

```
├── index.html                    # Single-page application
├── functions/
│   ├── _middleware.js            # Auth: extracts JWT, attaches user/role
│   └── api/
│       ├── _crypto.js            # AES-256-GCM encrypt/decrypt helpers
│       ├── _helpers.js           # Response helpers, auth guards
│       ├── accounts.js           # CRUD game accounts (POST/PUT/DELETE)
│       ├── accounts-reorder.js   # Batch update sort order
│       ├── game-launch.js        # Proxy: decrypt creds → game API → game URL
│       ├── migrate.js            # Import from localStorage format
│       └── admin/
│           ├── users.js          # List users, change roles
│           ├── accounts.js       # Admin: view/delete any account
│           └── logs.js           # Audit log viewer
├── migrations/
│   └── 001_initial_schema.sql    # Database schema + RLS policies
├── site/                         # Legacy v1 files (preserved for reference)
├── package.json
├── wrangler.toml
├── .env.example
└── .gitignore
```

## API Endpoints

All endpoints require `Authorization: Bearer <supabase-jwt>`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/accounts` | User | Create game account (encrypts credentials) |
| PUT | `/api/accounts` | User | Update game account |
| DELETE | `/api/accounts?id=X` | User | Delete own game account |
| POST | `/api/accounts-reorder` | User | Batch update sort order |
| POST | `/api/game-launch` | User | Decrypt + proxy game login → return game URL |
| POST | `/api/migrate` | User | Import accounts from localStorage format |
| GET | `/api/admin/users` | Admin | List all users with account counts |
| POST | `/api/admin/users` | Admin | Change user role |
| GET | `/api/admin/accounts` | Admin | List game accounts (any user) |
| DELETE | `/api/admin/accounts?id=X` | Admin | Delete any game account |
| GET | `/api/admin/logs` | Admin | View audit logs |
