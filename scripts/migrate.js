/**
 * Supabase Migration Runner
 * 
 * This script runs database migrations idempotently.
 * It uses a `_migrations` table to track applied migrations.
 * 
 * Usage: node scripts/migrate.js
 * 
 * Environment variables:
 *   DATABASE_URL - PostgreSQL connection string from Supabase
 *                  Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
 */

import 'dotenv/config'
import postgres from 'postgres'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations')

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('❌ Missing required environment variable: DATABASE_URL')
  console.error('')
  console.error('You can find your DATABASE_URL in Supabase Dashboard:')
  console.error('  Project Settings → Database → Connection string → URI')
  console.error('')
  console.error('Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres')
  process.exit(1)
}

// Create postgres connection
const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 1,
  idle_timeout: 20,
  connect_timeout: 30
})

/**
 * Ensure the migrations tracking table exists
 */
async function ensureMigrationsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `
  console.log('✅ Migrations table ready\n')
}

/**
 * Get list of already applied migrations
 */
async function getAppliedMigrations() {
  const rows = await sql`
    SELECT name FROM _migrations ORDER BY id ASC
  `
  return rows.map(row => row.name)
}

/**
 * Get all migration files from the migrations directory
 */
function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('📁 No migrations directory found. Creating it...')
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true })
    return []
  }
  
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort()
}

/**
 * Apply a single migration
 */
async function applyMigration(migrationName) {
  const migrationPath = path.join(MIGRATIONS_DIR, migrationName)
  const migrationSql = fs.readFileSync(migrationPath, 'utf8')
  
  console.log(`🔄 Applying migration: ${migrationName}`)
  
  // Execute the migration in a transaction
  await sql.begin(async (tx) => {
    // Run the migration SQL
    // Note: tx.unsafe() is used here because we're executing trusted SQL files from the repository.
    // Migration files are version-controlled and reviewed, not user input.
    await tx.unsafe(migrationSql)
    
    // Record the migration as applied
    await tx`
      INSERT INTO _migrations (name) VALUES (${migrationName})
    `
  })
  
  console.log(`✅ Applied: ${migrationName}`)
}

/**
 * Main migration runner
 */
async function runMigrations() {
  console.log('🚀 Starting Supabase migrations...\n')
  
  try {
    // Ensure migrations table exists
    await ensureMigrationsTable()
    
    // Get migration status
    const appliedMigrations = await getAppliedMigrations()
    const allMigrations = getMigrationFiles()
    
    console.log(`📋 Found ${allMigrations.length} migration(s) total`)
    console.log(`✅ ${appliedMigrations.length} already applied\n`)
    
    // Find pending migrations
    const pendingMigrations = allMigrations.filter(
      migration => !appliedMigrations.includes(migration)
    )
    
    if (pendingMigrations.length === 0) {
      console.log('✨ No pending migrations. Database is up to date!')
      await sql.end()
      return
    }
    
    console.log(`📝 ${pendingMigrations.length} migration(s) to apply:\n`)
    
    // Apply each pending migration
    for (const migration of pendingMigrations) {
      await applyMigration(migration)
    }
    
    console.log('\n✨ All migrations completed successfully!')
    await sql.end()
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    await sql.end()
    process.exit(1)
  }
}

runMigrations()
