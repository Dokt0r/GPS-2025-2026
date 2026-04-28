# GPS-2025-2026

## Requisitos previos

- Node.js 18+
- npm 9+

---

## Instalación

### Backend
```bash
cd backend
npm ci
```

### Frontend
```bash
cd frontend
npm ci
```

---

## Variables de entorno

### Backend

Copia `backend/.env.example` a `backend/.env` y rellena los valores:
```bash
cp backend/.env.example backend/.env
```
```env
MONGODB_URI=mongodb+srv://<usuario>:<password>@cluster.mongodb.net/<db>
PORT=3000
```

### Frontend

Copia `frontend/.env.example` a `frontend/.env` si existe:
```bash
cp frontend/.env.example frontend/.env
```

---

## Ejecución

### Backend
```bash
cd backend
npm start o node server.js (equivalentes)
```

### Frontend
```bash
cd frontend
npm run dev
```

---

## Tests

### Backend
```bash
cd backend
npm test
```

### Frontend
```bash
cd frontend
npx vitest run
```

---

## Endpoints disponibles

- `GET /api/ingredientes` → ingredientes base.
- `GET /api/inventario` → inventario guardado.
- `PUT /api/inventario` → reemplaza inventario con `{ items: [...] }`.
- `GET /api/recetas` → recetas según ingredientes disponibles.

Si `MONGODB_URI` no está definida o falla la conexión, el inventario funciona en memoria temporal (no persistente).

---

## Configuración MongoDB Atlas (Backend)

1. Copia `backend/.env.example` a `backend/.env`.
2. Rellena `MONGODB_URI` con tu cadena de conexión de Atlas.
3. Inicia el backend:
```bash
cd backend
npm start
```

---

## Estructura de carpetas
```
/GPS-2025-2026
│
├── /public              # Archivos estáticos accesibles por el navegador
│   ├── /css             # Hojas de estilo (styles.css)
│   ├── /js              # JavaScript del lado del cliente (main.js)
│   ├── /img             # Imágenes y recursos visuales
│   └── index.html       # Archivo HTML principal
│
├── /src                 # Código fuente del Backend (Node/Express)
│   ├── /controllers     # Lógica de las rutas (qué hace cada endpoint)
│   ├── /models          # Definición de datos (Schemas/Base de datos)
│   ├── /routes          # Definición de los endpoints (URLs)
│   ├── /middleware       # Funciones intermedias (autenticación, validación)
│   └── app.js           # Configuración de Express
│
├── /tests               # Pruebas unitarias y de integración
├── .env                 # Variables de entorno (claves privadas, puertos)
├── .gitignore           # Archivos que Git debe ignorar (node_modules, .env)
├── package.json         # Dependencias y scripts del proyecto
├── server.js            # Punto de entrada de la aplicación (arranque)
└── README.md            # Documentación del proyecto
```