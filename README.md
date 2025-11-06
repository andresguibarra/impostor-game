# impostor-game

Mobile-first impostor game built with Vue 3, Vite, Tailwind CSS, and Supabase.

## 🎮 Features

- **Private Sessions**: Create and join game sessions with short codes
- **QR Code Deep Links**: Share sessions easily via QR code
- **Host Controls**: Set impostor count, see all players, and start rounds
- **Player Experience**: Pick custom names or get funny Argentine-themed random names
- **Multiple Rounds**: Host can re-roll secret words and impostors
- **Word Bank**: Large collection of Argentine folklore words
- **Real-time Updates**: Using Supabase Realtime
- **Mobile-First Design**: Responsive UI with Tailwind CSS

## 🚀 Setup

### Prerequisites

- Node.js 18+
- Yarn
- Supabase account

### Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Run these SQL commands in your Supabase SQL editor:

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

3. Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Local Development

```bash
# Install dependencies
yarn

# Run development server
yarn dev

# Build for production
yarn build

# Preview production build
yarn preview
```

## 📦 Deployment to GitHub Pages

1. Update the `base` in `vite.config.ts` to match your repository name:

```typescript
export default defineConfig({
  base: '/your-repo-name/',
  // ...
})
```

2. Build the project:

```bash
yarn deploy
```

3. Deploy the `dist` folder to GitHub Pages using GitHub Actions or manually.

### GitHub Actions Deployment (Recommended)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: yarn
      - run: yarn build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## 🎯 How to Play

1. **Host creates a session**: Host clicks "Crear Sesión" and shares the code or QR code
2. **Players join**: Scan QR or enter the session code
3. **Host starts game**: Set impostor count and click "Iniciar Juego"
4. **Round begins**: Each player reveals their word privately
5. **Discussion**: Players discuss and try to find the impostor (outside the app)
6. **New round**: Host can start a new round with a different word

## 🛠️ Tech Stack

- Vue 3 (Composition API)
- Vite 
- TypeScript
- Tailwind CSS
- Supabase (Database + Realtime)
- QRCode library

## 📱 Mobile-First

The app is designed mobile-first and works great on phones, tablets, and desktops.

## 🔒 Privacy

- Sessions use short codes for easy joining
- No authentication required
- All data stored in Supabase
- Sessions can be cleaned up manually from Supabase dashboard

## 📝 License

MIT
