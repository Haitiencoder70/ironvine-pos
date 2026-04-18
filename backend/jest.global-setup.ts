import { execSync } from 'child_process';
import path from 'path';

export default async function globalSetup(): Promise<void> {
  const root = path.resolve(__dirname, '..');

  // Start test DB container
  execSync('docker compose -f docker-compose.test.yml up -d --wait', {
    stdio: 'inherit',
    cwd: root,
  });

  // Run migrations against test DB
  process.env['DATABASE_URL'] =
    'postgresql://testuser:testpass@localhost:5433/tshirtpos_test';
  process.env['TEST_DATABASE_URL'] =
    'postgresql://testuser:testpass@localhost:5433/tshirtpos_test';

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    cwd: __dirname,
    env: { ...process.env },
  });
}
