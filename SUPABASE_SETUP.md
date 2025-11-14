# Supabase Database Setup Guide

## Step 1: Create a Supabase Project

1. Go to https://supabase.com
2. Sign up or log in
3. Click "New Project"
4. Fill in the project details:
   - Name: impostor-game (or your preferred name)
   - Database Password: (create a secure password)
   - Region: (choose closest to your users)
5. Click "Create new project"

## Step 2: Create Database Tables

Once your project is ready, go to the SQL Editor and run this SQL:

```sql
-- Create sessions table
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  host_id TEXT NOT NULL,
  impostor_count INTEGER DEFAULT 1,
  current_word TEXT,
  impostors JSONB,
  round_number INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create players table
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  session_id TEXT NOT NULL REFERENCES sessions(code) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE players;

-- Enable row level security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access
CREATE POLICY "Allow all operations on sessions" ON sessions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on players" ON players
  FOR ALL USING (true) WITH CHECK (true);
```

## Step 3: Get Your Project Credentials

1. In your Supabase project dashboard, go to Settings → API
2. Copy these values:
   - **Project URL** (looks like: https://xxxxx.supabase.co)
   - **anon/public key** (long string starting with "eyJ...")

## Step 4: Configure Your Local Project

1. Duplicá `.env.example` en los archivos según el entorno:

```
.env.dev    # credenciales de desarrollo (usadas por `yarn dev`)
.env.prod   # credenciales de producción (usadas por `yarn build`, `yarn preview`, `yarn dev:prod`)
```

2. Si necesitás overrides locales, también podés crear `.env.dev.local` o `.env.prod.local` (los `.local` quedan fuera del control de versiones por defecto).

3. Cada archivo debe contener:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

4. Reemplazá los placeholders con tus credenciales reales desde el panel de Supabase.

## Step 5: Test Locally

```bash
# Usa las credenciales de .env.dev
yarn dev

# Opcional: correr el dev server con credenciales de producción (.env.prod)
yarn dev:prod
```

Open http://localhost:5173/impostor-game/ and try:
1. Creating a session
2. Opening another browser window/tab
3. Joining the session with the code
4. Starting the game as host
5. Revealing words

## Step 6: Deploy to GitHub Pages

### Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Add the following secrets for each environment that deploys via GitHub Actions (using the **same names** in cada environment):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `FIREBASE_SERVICE_ACCOUNT` (si también desplegás con Firebase Hosting)
  Configurá el environment `prod` con los valores de producción y el environment `dev` con los valores de sandbox.

### Enable GitHub Pages

1. Go to Settings → Pages
2. Under "Source", select "GitHub Actions"
3. The workflow will run automatically on push to main branch

### Update Base Path

Make sure the `base` path in `vite.config.ts` matches your repository name:

```typescript
export default defineConfig({
  base: '/impostor-game/', // Change if your repo has a different name
  // ...
})
```

## Troubleshooting

### Sessions not appearing in realtime
- Check that Realtime is enabled for your tables
- Verify the policies allow read/write access
- Check browser console for connection errors

### Build fails on GitHub Actions
- Verify secrets are correctly set in GitHub
- Check that the workflow file is in `.github/workflows/deploy.yml`

### 404 on GitHub Pages
- Ensure GitHub Pages is enabled and set to use GitHub Actions
- Check that the `base` path in vite.config.ts matches your repo name
- Wait a few minutes for the first deployment to complete

## Optional: Clean Up Old Sessions

Since this is a demo app without user authentication, you may want to periodically clean up old sessions:

```sql
-- Delete sessions older than 24 hours
DELETE FROM sessions 
WHERE created_at < NOW() - INTERVAL '24 hours';
```

You can set this up as a Supabase Edge Function or run it manually via the SQL Editor.

## Security Notes

⚠️ This implementation uses anonymous access with permissive RLS policies for simplicity. For a production app, consider:

1. Adding user authentication
2. Implementing proper RLS policies based on user roles
3. Adding rate limiting
4. Validating session codes server-side
5. Adding session expiration
6. Implementing proper error handling and logging

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify Supabase credentials are correct
3. Ensure tables are created correctly
4. Check that Realtime is enabled
5. Review the Supabase logs in your dashboard
