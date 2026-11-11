import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuration Vite : build statique dans /dist (compatible Netlify)
export default defineConfig({
  plugins: [react()],
});
