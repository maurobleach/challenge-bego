# Challenge Bego API

## 1. Objetivo y alcance
API REST desarrollada con NestJS para gestionar un flujo de logística básico:

1. Registro y login de usuarios.
2. Gestión de camiones (`trucks`) asociados al usuario autenticado.
3. Gestión de ubicaciones (`locations`) a partir de `place_id` de Google Places.
4. Gestión de órdenes (`orders`) vinculando camión, origen y destino.
5. Cambio de estado de orden hasta su finalización.

## 2. Stack y arquitectura por dominios
- Runtime: Node.js + NestJS.
- Base de datos: MongoDB + Mongoose.
- Auth: JWT (`@nestjs/jwt`, `passport-jwt`).
- Validación: `class-validator` + `ValidationPipe` global.
- Integración externa: Google Places API (New).

Estructura modular (dominios):
- `users`
- `trucks`
- `locations`
- `orders`
- `auth` (módulo transversal de autenticación JWT)

## 3. Instalación y ejecución
### Requisitos
- Node.js 20+
- npm
- MongoDB local o Docker

### Instalar dependencias
```bash
npm install
```

### Ejecutar en local
1. Crear `.env` desde `.env.example`.
2. Levantar MongoDB.
3. Ejecutar:
```bash
npm run start:dev
```

### Docker Compose
Perfiles disponibles:

1. Solo Mongo:
```bash
docker compose --profile mongo up -d
```

2. App + Mongo:
```bash
docker compose --profile full up --build -d
```

## 4. Variables de entorno
Variables requeridas:

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/challenge-bego
JWT_SECRET=change-this-secret
JWT_EXPIRES_IN=1h
GOOGLE_MAPS_API_KEY=TU-APIKEY
GOOGLE_PLACES_BASE_URL=https://places.googleapis.com/v1/places
```

Notas:
- Si corres Nest en local y Mongo en Docker, usa `127.0.0.1` en `MONGODB_URI`.
- Si corres app+mongo dentro de Docker Compose, el host de Mongo es `mongo`.

## 5. Flujo funcional recomendado
1. `POST /users/register`
2. `POST /users/login` (obtener `accessToken`)
3. `POST /trucks` con token
4. `POST /locations` (origen) con token y `place_id`
5. `POST /locations` (destino) con token y `place_id`
6. `POST /orders` con `truck`, `pickup`, `dropoff`
7. `PATCH /orders/:id/status` para avanzar estado:
   - `created -> in transit -> completed`

## 6. Endpoints por dominio
### Users
- `POST /users/register`
- `POST /users/login`
- `POST /users`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `DELETE /users/:id`

### Trucks
- `POST /trucks` (JWT)
- `GET /trucks`
- `GET /trucks/:id`
- `PATCH /trucks/:id` (JWT + ownership)
- `DELETE /trucks/:id` (JWT + ownership)

### Locations
- `POST /locations` (JWT)
- `GET /locations` (JWT)
- `GET /locations/:id` (JWT + ownership)
- `PATCH /locations/:id` (JWT + ownership)
- `DELETE /locations/:id` (JWT + ownership)

### Orders
- `POST /orders` (JWT)
- `GET /orders` (JWT)
- `GET /orders/:id` (JWT + ownership)
- `PATCH /orders/:id/status` (JWT + ownership)
- `DELETE /orders/:id` (JWT + ownership)

## 7. Reglas de negocio y validaciones clave
- Registro de usuario: no permite email duplicado.
- Password se guarda hasheado.
- En `trucks`, `plates` es único.
- En `locations`, se crea desde Google Places (New) y no permite duplicado por usuario (`user + place_id`).
- En `orders`, `truck`, `pickup` y `dropoff` deben pertenecer al usuario autenticado.
- `pickup` y `dropoff` deben ser diferentes.
- Transición de estado de órdenes restringida a:
  - `created -> in transit`
  - `in transit -> completed`

## Enfoque de desarrollo
El desarrollo se abordó por iteraciones verticales por dominio, priorizando:

1. Modelo + DTOs + validación.
2. Servicio con reglas de negocio y ownership.
3. Controlador con endpoints y guards JWT.
4. Integración y build para verificar wiring entre módulos.
5. Ajustes de entorno (Docker, variables y APIs externas).
