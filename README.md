# GPS-2025-2026

Estructura carpetas:
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
│   ├── /middleware      # Funciones intermedias (autenticación, validación)
│   └── app.js           # Configuración de Express
│
├── /tests               # Pruebas unitarias y de integración
├── .env                 # Variables de entorno (claves privadas, puertos)
├── .gitignore           # Archivos que Git debe ignorar (node_modules, .env)
├── package.json         # Dependencias y scripts del proyecto
├── server.js            # Punto de entrada de la aplicación (arranque)
└── README.md            # Documentación del proyecto