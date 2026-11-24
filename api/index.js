// Vercel Serverless Function Gateway for Express Backend
process.env.VERCEL = process.env.VERCEL || '1';

const path = require('path');
const fs = require('fs');

// Ensure writable SQLite location and directory exist for Vercel Serverless environment
try {
  const tmpDbPath = '/tmp/dev.db';
  const tmpDir = path.dirname(tmpDbPath);
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  if (!fs.existsSync(tmpDbPath)) {
    const candidateTemplates = [
      path.join(__dirname, '..', 'backend', 'prisma', 'template.db'),
      path.join(__dirname, '..', 'prisma', 'template.db'),
      path.join(process.cwd(), 'backend', 'prisma', 'template.db'),
      path.join(process.cwd(), 'prisma', 'template.db'),
    ];
    for (const t of candidateTemplates) {
      if (fs.existsSync(t)) {
        fs.copyFileSync(t, tmpDbPath);
        console.log(`[Vercel Serverless] Initialized /tmp/dev.db from ${t}`);
        break;
      }
    }
  }
} catch (e) {
  console.warn('[Vercel Serverless] Template copy notice:', e.message);
}

const appModule = require('../backend/dist/index.js');
const app = appModule.default || appModule;

module.exports = app;
