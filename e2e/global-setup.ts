import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export default async function globalSetup() {
  const root = path.dirname(fileURLToPath(import.meta.url))
  execSync('npx supabase db query --local -f scripts/e2e_users.sql', {
    cwd: path.join(root, '..'),
    stdio: 'inherit',
  })
}
