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
- **Auto-Versioning**: Automatic version management with update notifications

## 🚀 Setup

### Prerequisites

- Node.js 18+
- Yarn
- Supabase account

### Supabase Setup

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create players table
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE players;

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

# Run development server with dev credentials (.env.dev)
yarn dev

# Run dev server but pointing to production Supabase (.env.prod)
yarn dev:prod

# Build for production (uses .env.prod)
yarn build

# Optional build against dev env
yarn build:dev

# Preview production build
yarn preview

# Preview build using dev env
yarn preview:dev
```

## 📦 Deployment to Firebase Hosting

The project is configured to deploy automatically to Firebase Hosting via GitHub Actions for both `master` (prod) and `dev` branches.

| Branch | Build Script | Firebase Project | Secrets Required |
| ------ | ------------ | ---------------- | ---------------- |
| `master` | `yarn build` | `impostor-game-c70dd` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `FIREBASE_SERVICE_ACCOUNT` |
| `dev` | `yarn build:dev` | `impostor-game-dev` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `FIREBASE_SERVICE_ACCOUNT` *(definidos en el environment `dev` de GitHub)* |

### Automatic Deployment (Recommended)

1. Create a Firebase project at https://firebase.google.com/
2. Install Firebase CLI locally: `npm install -g firebase-tools`
3. Login to Firebase: `firebase login`
4. Initialize Firebase in your project (already configured):
   - `firebase.json` and `.firebaserc` are already set up
5. Generate a Firebase service account key:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file securely
6. Add the service account JSON como secreto de GitHub llamado `FIREBASE_SERVICE_ACCOUNT`. Si usás environments (recomendado), definí el mismo nombre en cada environment (`prod`, `dev`, etc.) con el JSON correspondiente.
7. Definí también los secretos de Supabase usando siempre los nombres `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Cargá los valores específicos de cada ambiente en los environment secrets que correspondan.
8. Hacé push a la branch correspondiente y GitHub Actions construirá y desplegará al proyecto indicado

The deployment workflow is defined in `.github/workflows/deploy.yml` and will:
- Build the project with the Supabase environment variables del entorno actual
- Deploy to Firebase Hosting automatically on every push to `master` (prod) o `dev` (sandbox)

### Manual Deployment

If you want to deploy manually:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Build the project
yarn build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### Configuration

The Firebase configuration is in `firebase.json`:
- Public directory: `dist`
- Single Page App: All routes redirect to `index.html`
- Cache control headers for static assets

## 🔄 Version Management

The app includes an automatic versioning system:

### How It Works

1. **Automatic Version Bumping**: On each deployment to master, the GitHub Actions workflow automatically:
   - Increments the patch version (e.g., 1.0.0 → 1.0.1)
   - Updates `package.json` with the new version
   - Generates a `public/version.json` file with version and build date

2. **Version Display**: A small footer at the bottom of every page displays the current version (e.g., "v1.0.0")

3. **Auto-Update Notification**: The app checks for new versions every 5 minutes:
   - When a new version is detected, a prominent notification banner appears
   - Users can click the banner to reload and get the latest version
   - This ensures users always have the most up-to-date features and fixes

### Manual Version Bump

To manually bump the version:

```bash
node scripts/bump-version.js
```

This will increment the patch version and update both `package.json` and `public/version.json`.

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
