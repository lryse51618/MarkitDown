import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Vite 기본 차단 목록 + DB 파일 (개발 서버가 maeum5.db를 내보내지 않게)
  server: { fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '*.db'] } },
});
