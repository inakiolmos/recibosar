import 'dotenv/config'
import postgres from 'postgres'
import fs from 'fs'
import path from 'path'

const sql = postgres(process.env.DATABASE_URL!)

async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS migrations (
      id       SERIAL PRIMARY KEY,
      name     TEXT NOT NULL UNIQUE,
      run_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  const migrationsDir = path.join(__dirname, '../../migrations')
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  const ran = await sql<{ name: string }[]>`SELECT name FROM migrations`
  const ranNames = new Set(ran.map((r) => r.name))

  for (const file of files) {
    if (ranNames.has(file)) {
      console.log(`skip: ${file}`)
      continue
    }
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    console.log(`running: ${file}`)
    await sql.unsafe(content)
    await sql`INSERT INTO migrations (name) VALUES (${file})`
    console.log(`done: ${file}`)
  }

  await sql.end()
  console.log('Migrations complete.')
}

migrate().catch((err) => {
  console.error(err)
  process.exit(1)
})
