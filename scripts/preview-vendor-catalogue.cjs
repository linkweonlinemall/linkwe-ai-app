// Local review only. Intentionally do not inherit application credentials.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const envFiles = fs.readdirSync(root).filter(name => /^\.env(?:\.|$)/.test(name) && name !== '.env.example');
if (envFiles.length) {
  console.error('Preview stopped: use the isolated review worktree without .env files. No application credentials are loaded.');
  process.exit(1);
}
const port = 3091;
const localUrl = `http://127.0.0.1:${port}`;
const databaseUrl = 'postgresql://catalogue_test@127.0.0.1:55471/linkwe_catalogue_test';
const env = {};
for (const name of ['PATH', 'HOME', 'TMPDIR', 'TMP', 'TEMP', 'LANG', 'LC_ALL', 'TERM', 'SystemRoot']) {
  if (process.env[name]) env[name] = process.env[name];
}
Object.assign(env, {
  NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1',
  DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl,
  RESEND_API_KEY: 're_local_preview_placeholder_not_a_real_key',
  NEXT_PUBLIC_BASE_URL: localUrl, NEXT_PUBLIC_APP_URL: localUrl,
});
console.log(`\nLinkWe review: ${localUrl}/dev/catalogue-review\nFictional items only. Saving and shopping are disabled in the preview pages.\nBound to this Mac only. No production credentials or migrations. Press Ctrl+C to stop.\n`);
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: root, env, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 0; });
