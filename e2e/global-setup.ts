import { execSync } from 'child_process';
import path from 'path';

export default async function globalSetup(): Promise<void> {
  const root    = path.resolve(__dirname, '..');
  const backend = path.join(root, 'backend');

  // Start test DB container
  execSync('docker compose -f docker-compose.test.yml up -d --wait', {
    stdio: 'inherit',
    cwd:   root,
  });

  // Run seed for E2E demo orgs
  execSync('npx tsx src/scripts/seed-multi-tenant.ts', {
    stdio: 'inherit',
    cwd:   backend,
    env: {
      ...process.env,
      DATABASE_URL:      'postgresql://testuser:testpass@localhost:5433/tshirtpos_test',
      TEST_DATABASE_URL: 'postgresql://testuser:testpass@localhost:5433/tshirtpos_test',
    },
  });
}
