import { execSync } from 'child_process';
import path from 'path';

export default async function globalTeardown(): Promise<void> {
  const root = path.resolve(__dirname, '..');
  execSync('docker compose -f docker-compose.test.yml down -v', {
    stdio: 'inherit',
    cwd:   root,
  });
}
