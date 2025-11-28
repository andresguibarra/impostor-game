# Copilot Instructions

## Package Manager

This project uses **yarn** as the package manager. Do not use npm.

### Commands to use:

- Install dependencies: `yarn install`
- Add a dependency: `yarn add <package>`
- Add a dev dependency: `yarn add -D <package>`
- Remove a dependency: `yarn remove <package>`
- Run scripts: `yarn <script>` (e.g., `yarn dev`, `yarn build`)
- Run dev server: `yarn dev`
- Build for production: `yarn build`
- Preview build: `yarn preview`
- Deploy: `yarn deploy`

### Do NOT use:

- `npm install`
- `npm run`
- `npm add`
- Any npm commands

### Lock file

Only `yarn.lock` should be committed. Do not commit `package-lock.json`.

## Testing Guidelines

### Element Selection with data-automation-id

When adding new interactive elements or elements that need to be tested, always include a `data-automation-id` attribute. This is the preferred method for selecting elements in E2E tests.

#### Rules:
- **Always** add `data-automation-id` to elements that will be interacted with in tests (buttons, inputs, links, etc.)
- **Always** add `data-automation-id` to elements whose content needs to be verified (titles, status displays, counters, etc.)
- Use kebab-case for naming (e.g., `data-automation-id="new-game-button"`)
- Make IDs descriptive and unique within the component context
- Never select elements by text content in tests - always use `data-automation-id`

#### Examples:
```vue
<!-- Good: Using data-automation-id -->
<button data-automation-id="new-game-button" @click="createGame">
  Nueva Partida
</button>

<h1 data-automation-id="app-title">IMPOSTOR</h1>

<input data-automation-id="player-name-input" v-model="playerName" />

<p data-automation-id="player-count">{{ players.length }}</p>
```

```typescript
// Good: Selecting by data-automation-id in tests
await page.locator('[data-automation-id="new-game-button"]').click()
await expect(page.locator('[data-automation-id="app-title"]')).toBeVisible()

// Bad: Selecting by text content (avoid this)
await page.click('button:has-text("Nueva Partida")') // ❌
await expect(page.locator('text=IMPOSTOR')).toBeVisible() // ❌
```

#### Naming conventions:
- Buttons: `{action}-button` (e.g., `new-game-button`, `submit-join-button`)
- Inputs: `{field}-input` (e.g., `player-name-input`, `join-code-input`)
- Displays: `{content}-display` or just the content name (e.g., `player-count`, `session-code`)
- Cards/Sections: `{name}-card` or `{name}-section` (e.g., `session-card`, `waiting-message`)
- Modals: `{name}-modal` (e.g., `countdown-modal`)

## Database Migrations

This project uses Supabase as the database. All database schema changes must be done through migrations.

### Migration files location

All migrations are stored in `supabase/migrations/` directory.

### Creating a new migration

1. Create a new SQL file in `supabase/migrations/` with the next sequential number:
   - Format: `NNN_description.sql` (e.g., `002_add_user_preferences.sql`)
   - Always use the next available number in sequence
2. Write **idempotent SQL** - migrations should be safe to run multiple times:
   - Use `CREATE TABLE IF NOT EXISTS` instead of `CREATE TABLE`
   - Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for new columns
   - Use `DO $$ BEGIN ... END $$;` blocks with `IF NOT EXISTS` checks for policies and other objects
3. Include comments explaining what the migration does

### Example migration

```sql
-- 002_add_user_preferences.sql: Add user preferences table

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  theme TEXT DEFAULT 'light',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policy (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow all operations on user_preferences' AND tablename = 'user_preferences'
  ) THEN
    CREATE POLICY "Allow all operations on user_preferences" ON user_preferences FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
```

### Running migrations locally

```bash
export DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
yarn db:migrate
```

### How migrations work

- Migrations run automatically on each deploy to `dev` or `master` branches
- A `_migrations` table tracks which migrations have been applied
- Each migration runs only once and in order
- Migrations run inside transactions for safety

### Do NOT:

- Modify existing migration files that have already been applied
- Delete migration files
- Skip sequence numbers
- Write non-idempotent SQL
## UI/UX Guidelines

### Clickable Elements

All clickable elements must have `cursor: pointer`. This is already handled globally in `src/style.css` for standard elements (buttons, links, selects, etc.), but when adding custom clickable elements:

- Add the `cursor-pointer` class from Tailwind CSS
- Or ensure the element is a button/link/etc. that gets the global style

### Modals

All modals must:

- Close when pressing the Escape key
- Close when clicking outside the modal (on the backdrop)
