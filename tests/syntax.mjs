// Fails if any JS file has a syntax error.
import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const files = readdirSync(new URL('../js', import.meta.url)).filter(f => f.endsWith('.js'));
for (const f of files) execFileSync(process.execPath, ['--check', new URL(`../js/${f}`, import.meta.url).pathname], { stdio: 'inherit' });
console.log(`syntax ok (${files.length} files)`);
