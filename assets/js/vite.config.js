import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: '.',
    publicDir: 'assets',  // Картинки отдаются как есть

    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                login: resolve(__dirname, 'pages/login.html'),
                register: resolve(__dirname, 'pages/register.html'),
                client: resolve(__dirname, 'pages/client.html'),
                dashboard: resolve(__dirname, 'pages/dashboard.html'),
                admin: resolve(__dirname, 'pages/admin.html'),
                psychologist: resolve(__dirname, 'pages/psychologist.html'),
                becomePsychologist: resolve(__dirname, 'pages/become-psychologist.html'),
                applicationHistory: resolve(__dirname, 'pages/application-history.html'),
                room: resolve(__dirname, 'pages/room.html'),
                rulesCancel: resolve(__dirname, 'pages/rules-cancel.html')
            }
        }
    },

    server: {
        port: 5500,
        open: '/pages/login.html'
    }
});