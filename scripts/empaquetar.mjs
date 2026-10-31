#!/usr/bin/env node
// Arma la carpeta lista para llevar a Invicar:  release/invicar-inventario/
// Uso:  npm run build && npm run empaquetar
import fs from 'node:fs';
import path from 'node:path';

const raiz = process.cwd();
const salida = path.join(raiz, 'release', 'invicar-inventario');
const standalone = path.join(raiz, '.next', 'standalone');

if (!fs.existsSync(path.join(standalone, 'server.js'))) {
  console.error('Primero ejecuta "npm run build".');
  process.exit(1);
}

fs.rmSync(salida, { recursive: true, force: true });
fs.mkdirSync(salida, { recursive: true });

const copiar = (de, a) => fs.cpSync(de, a, { recursive: true, filter: (f) => !/\.(db|db-wal|db-shm)$/.test(f) });

copiar(standalone, path.join(salida, 'app'));
copiar(path.join(raiz, '.next', 'static'), path.join(salida, 'app', '.next', 'static'));
if (fs.existsSync(path.join(raiz, 'public'))) copiar(path.join(raiz, 'public'), path.join(salida, 'app', 'public'));
// Esta app no usa optimización de imágenes ni TypeScript en producción: se quitan para que el paquete pese menos
// (y no lleve binarios de Linux que no sirven en Windows).
for (const sobra of ['typescript', 'sharp', '@img']) {
  fs.rmSync(path.join(salida, 'app', 'node_modules', sobra), { recursive: true, force: true });
}
copiar(path.join(raiz, 'core'), path.join(salida, 'core'));
fs.mkdirSync(path.join(salida, 'scripts'));
for (const f of ['seed.mjs', 'backup.mjs', 'restaurar.mjs', 'reset-password.mjs']) {
  fs.copyFileSync(path.join(raiz, 'scripts', f), path.join(salida, 'scripts', f));
}
for (const f of fs.readdirSync(path.join(raiz, 'deploy'))) {
  fs.copyFileSync(path.join(raiz, 'deploy', f), path.join(salida, f));
}
fs.copyFileSync(path.join(raiz, 'README.md'), path.join(salida, 'LEEME.md'));

console.log('✔ Paquete listo en: ' + salida);
