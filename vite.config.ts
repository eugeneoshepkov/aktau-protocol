import { execFileSync } from 'node:child_process';
import { defineConfig } from 'vite';

let revision = 'unknown';
try {
  revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
} catch {
  // A downloaded source archive can still build without Git metadata.
}

export default defineConfig({
  define: { 'import.meta.env.VITE_GAME_REVISION': JSON.stringify(revision) }
});
