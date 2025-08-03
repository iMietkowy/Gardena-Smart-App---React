import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Path to main folder
 */
const exercisePath = 'Gardena Smart System';

/**
 * Don't change those lines below
 */
export default defineConfig({
	root: exercisePath,
	server: {
		port: 3000,
		proxy: {
			'/api': {
				target: 'http://localhost:3001',
				changeOrigin: true,
			},
		},
	},
	plugins: [react()],
});
