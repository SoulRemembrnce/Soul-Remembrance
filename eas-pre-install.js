const fs = require('fs');

const workspace = `packages:
  - artifacts/mobile
  - lib/*
  - lib/integrations/*
  - scripts

catalog:
  '@tanstack/react-query': ^5.90.21
  react: 19.1.0
  react-dom: 19.1.0
  zod: ^3.25.76
  tsx: ^4.21.0
  drizzle-orm: ^0.45.2

autoInstallPeers: false
`;

fs.writeFileSync('pnpm-workspace.yaml', workspace);
console.log('Wrote clean pnpm-workspace.yaml for EAS build');
