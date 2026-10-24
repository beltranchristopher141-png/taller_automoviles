# Taller Automotriz - Sistema Full Stack

Proyecto académico basado en las guías 8 a 16: MySQL, Express, Node.js, React, Vite, Axios, CRUD, JOIN, variables de entorno y despliegue.

## Carpetas
- `backend/`: API Express, conexión MySQL, CRUD de clientes, vehículos, servicios y órdenes.
- `frontend/`: aplicación React + Vite.
- `database/taller_automotriz.sql`: estructura y datos de prueba.
- `.gitignore`: evita subir credenciales y `node_modules`.

## Requisitos
Instala Node.js LTS y MySQL (por ejemplo, XAMPP). Para trabajar localmente, inicia MySQL desde XAMPP y abre phpMyAdmin.

## 1. Crear la base de datos
1. Abre `http://localhost/phpmyadmin`.
2. Entra en la pestaña **Importar**.
3. Selecciona `database/taller_automotriz.sql`.
4. Pulsa **Importar / Continuar**.
El script crea la base `taller_automotriz`, cuatro tablas relacionadas y datos de demostración.

## 2. Configurar backend
Abre una terminal en la carpeta `backend`:
```bash
npm install
```
Copia `.env.example` como `.env` y configura tus credenciales MySQL. Para XAMPP normalmente:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=taller_automotriz
DB_PORT=3306
DB_SSL=false
FRONTEND_URL=http://localhost:5173
```
Si tu usuario root tiene contraseña, escribe esa contraseña en `DB_PASSWORD`.
Después ejecuta:
```bash
npm run dev
```
Comprueba `http://localhost:3000` y `http://localhost:3000/api/health`.

## 3. Configurar frontend
Abre una SEGUNDA terminal en `frontend`:
```bash
npm install
```
Crea `frontend/.env` con:
```env
VITE_API_URL=http://localhost:3000
```
Inicia:
```bash
npm run dev
```
Abre la URL que Vite muestre, normalmente `http://localhost:5173`.

## 4. Cómo se conectan
React (frontend) usa Axios para llamar a `VITE_API_URL`; Express recibe la solicitud, consulta MySQL y devuelve JSON. CORS permite el acceso desde el puerto del frontend. No conectes React directamente a MySQL ni pongas la contraseña de MySQL en el frontend.

## 5. Endpoints principales
- `GET/POST /api/clientes`, `PUT/DELETE /api/clientes/:id`
- `GET/POST /api/vehiculos`, `PUT/DELETE /api/vehiculos/:id`
- `GET/POST /api/servicios`, `PUT/DELETE /api/servicios/:id`
- `GET/POST /api/ordenes`, `PUT/DELETE /api/ordenes/:id`
- `GET /api/ordenes` incluye JOIN para mostrar cliente, vehículo y servicio.
- `GET /api/health` verifica que la API está activa.

## 6. Publicar en la nube (resumen)
1. Crea una instancia MySQL en Aiven. Copia host, puerto, usuario, contraseña y base de datos que Aiven te indique.
2. Importa `database/taller_automotriz.sql` en la base de datos de Aiven usando DBeaver o el cliente SQL de tu preferencia. En un servidor ya creado, ejecuta el script sin las líneas `CREATE DATABASE` y `USE`, si el proveedor no permite esas instrucciones.
3. Sube el proyecto a GitHub. No subas `.env` ni contraseñas.
4. En Render crea un **Web Service** desde el repositorio. Root Directory: `backend`; Build Command: `npm install`; Start Command: `npm start`.
5. En Render configura `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `DB_SSL=true`, `FRONTEND_URL` (cuando ya tengas la URL de Vercel) y `NODE_ENV=production`. Usa los valores reales de Aiven. No copies credenciales de ejemplo.
6. En Vercel importa el proyecto desde GitHub. Root Directory: `frontend`; Build Command: `npm run build`; Output Directory: `dist`. Añade `VITE_API_URL` con la URL HTTPS de tu API Render, sin `/` al final.
7. Vuelve a Render y actualiza `FRONTEND_URL` con la URL de Vercel. Si haces cambios a variables Vite, vuelve a desplegar el frontend.
8. Prueba la web publicada y revisa los logs de Render y la consola del navegador si algo falla.

### Importante
Los nombres de variables y la configuración SSL pueden depender del proveedor. Usa exactamente los datos y requisitos que muestre tu panel de Aiven. No publiques secretos en GitHub ni compartas el archivo `.env`.
