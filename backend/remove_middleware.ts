import fs from 'fs';
import path from 'path';

const routesDir = path.join(__dirname, 'src', 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('.use(requireAuth, injectTenant);')) {
    content = content.replace(/\w+Router\.use\(requireAuth,\s*injectTenant\);/g, '// removed redundant middleware');
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
}
