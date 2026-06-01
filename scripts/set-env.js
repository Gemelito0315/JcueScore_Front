const fs = require('fs');
const path = require('path');

// Leer variables de entorno con valores por defecto
const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
const wsUrl = process.env.WS_URL || 'ws://localhost:3000/ws';
const isProduction = process.env.NODE_ENV === 'production' || true;

const envFileContent = `export const environment = {
  production: ${isProduction},
  apiBaseUrl: '${apiBaseUrl}',
  wsUrl: '${wsUrl}'
};
`;

const dirPath = path.join(__dirname, '../src/environments');

// Asegurar que el directorio de environments exista
if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath, { recursive: true });
}

// Escribir en ambos archivos para mayor compatibilidad
const filesToReplace = ['environment.ts', 'environment.prod.ts'];

filesToReplace.forEach(file => {
  const filePath = path.join(dirPath, file);
  fs.writeFileSync(filePath, envFileContent, { encoding: 'utf-8' });
  console.log(`✅ Archivo de entorno escrito con éxito en: ${filePath}`);
  console.log(`   - apiBaseUrl: ${apiBaseUrl}`);
  console.log(`   - wsUrl: ${wsUrl}`);
});
