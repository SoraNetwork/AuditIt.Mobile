import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { execSync } from 'child_process';

// Get the latest git commit hash
const gitSha = execSync('git rev-parse HEAD').toString().trim();

// https://vite.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_GIT_SHA': JSON.stringify(gitSha),
  },
  plugins: [vue()],
  server: {
    host: '0.0.0.0'
  }
})
