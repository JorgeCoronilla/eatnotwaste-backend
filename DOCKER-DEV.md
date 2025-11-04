# 🐳 Desarrollo con Docker - FreshKeeper Backend

Este documento explica cómo configurar y usar el entorno de desarrollo local con Docker.

## 🚀 Configuración Inicial

### Prerrequisitos
- Docker Desktop instalado y ejecutándose
- Docker Compose (incluido con Docker Desktop)

### Configuración Rápida

```bash
# 1. Configurar entorno completo
npm run docker:setup

# 2. Iniciar el servidor (en otra terminal)
npm run dev:docker
```

## 📋 Servicios Disponibles

| Servicio | Puerto | URL | Credenciales |
|----------|--------|-----|--------------|
| **PostgreSQL** | 5432 | `postgresql://freshkeeper:freshkeeper123@localhost:5432/freshkeeper` | `freshkeeper:freshkeeper123` |
| **Redis** | 6379 | `redis://localhost:6379` | Sin contraseña |
| **Adminer** | 8080 | http://localhost:8080 | Ver credenciales DB |

## 🛠️ Scripts Disponibles

```bash
# Configuración y gestión
npm run docker:setup    # Configurar entorno completo
npm run docker:stop     # Detener todos los servicios
npm run docker:reset    # Resetear completamente (elimina datos)

# Desarrollo
npm run dev:docker      # Iniciar servidor con configuración Docker
npm run docker:logs     # Ver logs de todos los servicios

# Acceso a bases de datos
npm run docker:postgres # Conectar a PostgreSQL CLI
```

## 🗄️ Bases de Datos



### PostgreSQL
- **Base de datos**: `freshkeeper`
- **Usuario**: `freshkeeper`
- **Contraseña**: `freshkeeper123`
- **Esquema**: Tablas con validación JSON y triggers

## 🔧 Configuración de Entorno

El archivo `.env.docker` contiene todas las variables necesarias:

```env
# Base de datos (PostgreSQL)
POSTGRES_URI=postgresql://freshkeeper:freshkeeper123@localhost:5432/freshkeeper

# APIs externas
OPENFOODFACTS_API_URL=https://world.openfoodfacts.org/api/v0
USDA_API_KEY=your_usda_api_key_here

# Desarrollo
NODE_ENV=development
PORT=3000
```

## 🔄 Flujo de Desarrollo

### Primer uso
```bash
# 1. Configurar Docker
npm run docker:setup

# 2. Esperar a que todos los servicios estén listos
# 3. En otra terminal, iniciar el servidor
npm run dev:docker
```

### Uso diario
```bash
# Iniciar servicios (si están detenidos)
docker-compose up -d

# Iniciar servidor
npm run dev:docker
```

### Al terminar
```bash
# Detener servicios (mantiene datos)
npm run docker:stop

# O detener solo el servidor (Ctrl+C)
```

## 🐛 Solución de Problemas

### Error: Puerto ocupado
```bash
# Ver qué proceso usa el puerto
lsof -i :5432   # PostgreSQL

# Detener servicios Docker
npm run docker:stop
```

### Error: Volúmenes corruptos
```bash
# Resetear completamente
npm run docker:reset
npm run docker:setup
```

### Error: Docker no responde
```bash
# Reiniciar Docker Desktop
# O usar comandos directos:
docker-compose down
docker-compose up -d
```

## 📊 Herramientas de Administración



### Adminer (PostgreSQL)
- URL: http://localhost:8080
- Sistema: `PostgreSQL`
- Servidor: `freshkeeper-postgresql`
- Usuario: `freshkeeper`
- Contraseña: `freshkeeper123`
- Base de datos: `freshkeeper`



## 📝 Notas Importantes

- Los datos persisten entre reinicios (volúmenes Docker)
- Use `npm run docker:reset` solo si quiere eliminar TODOS los datos
- Los scripts de inicialización se ejecutan solo en el primer arranque
- Para producción, use PostgreSQL por rendimiento y consistencia