const fs = require('fs');
const path = require('path');

const catalog = {
  '@tanstack/react-query': '^5.90.21',
  'react': '19.1.0',
  'react-dom': '19.1.0',
  'zod': '^3.25.76',
  'tsx': '^4.21.0',
  'drizzle-orm': '^0.45.2',
  '@replit/vite-plugin-cartographer': '^0.5.1',
  '@replit/vite-plugin-dev-banner': '^0.1.1',
  '@replit/vite-plugin-runtime-error-modal': '^0.0.6',
  '@tailwindcss/vite': '^4.1.14',
  '@types/node': '^25.3.3',
  '@types/react': '^19.2.0',
  '@types/react-dom': '^19.2.0',
  '@vitejs/plugin-react': '^5.0.4',
  'class-variance-authority': '^0.7.1',
  'clsx': '^2.1.1',
  'framer-motion': '^12.23.24',
  'lucide-react': '^0.545.0',
  'tailwind-merge': '^3.3.1',
  'tailwindcss': '^4.1.14',
  'vite': '^7.3.2',
  'wouter': '^3.3.5',
};

function resolveCatalogRefs(pkgPath) {
  if (!fs.existsSync(pkgPath)) return;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  let changed = false;
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) {
    if (!pkg[section]) continue;
    for (const [name, version] of Object.entries(pkg[section])) {
      if (version === 'catalog:' || version.startsWith('catalog:')) {
        const resolved = catalog[name];
        if (resolved) {
          pkg[section][name] = resolved;
          changed = true;
          console.log(`  Resolved ${name}@catalog: -> ${resolved}`);
        } else {
          console.warn(`  WARNING: No catalog entry for ${name}`);
        }
      }
    }
  }
  if (changed) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }
}

const workspace = `packages:
  - artifacts/mobile
  - lib/*
  - lib/integrations/*
  - scripts

autoInstallPeers: false
`;

fs.writeFileSync('pnpm-workspace.yaml', workspace);
console.log('Wrote clean pnpm-workspace.yaml for EAS build');

const dirs = [
  'artifacts/mobile',
  ...fs.readdirSync('lib').map(d => `lib/${d}`).filter(d => fs.existsSync(`${d}/package.json`)),
  'scripts',
];

for (const dir of dirs) {
  const pkgPath = path.join(dir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    console.log(`Resolving catalog refs in ${pkgPath}`);
    resolveCatalogRefs(pkgPath);
  }
}

console.log('Done — ready for pnpm install');
