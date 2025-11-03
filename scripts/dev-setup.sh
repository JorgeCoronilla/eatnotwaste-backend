#!/bin/bash

# Script para configurar el entorno de desarrollo local con Docker

set -e

echo "🚀 Configurando entorno de desarrollo FreshKeeper..."

# Verificar que Docker esté instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado. Por favor instala Docker Desktop."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está instalado."
    exit 1
fi

# Crear red de Docker si no existe
echo "🌐 Creando red de Docker..."
docker network create freshkeeper-network 2>/dev/null || echo "Red ya existe"

# Copiar archivo de entorno si no existe
if [ ! -f .env ]; then
    echo "📝 Copiando archivo de entorno..."
    cp .env.docker .env
    echo "⚠️  Recuerda configurar tus claves de API en el archivo .env"
fi

# Levantar servicios de base de datos
echo "🗄️  Iniciando servicios de base de datos..."
docker-compose up -d mongodb postgresql redis

# Esperar a que las bases de datos estén listas
echo "⏳ Esperando a que las bases de datos estén listas..."
sleep 10

# Verificar conexiones
echo "🔍 Verificando conexiones..."

# MongoDB
if docker exec freshkeeper-mongodb mongosh --eval "db.runCommand('ping')" > /dev/null 2>&1; then
    echo "✅ MongoDB está funcionando"
else
    echo "❌ MongoDB no responde"
fi

# PostgreSQL
if docker exec freshkeeper-postgresql pg_isready -U freshkeeper > /dev/null 2>&1; then
    echo "✅ PostgreSQL está funcionando"
else
    echo "❌ PostgreSQL no responde"
fi

# Redis
if docker exec freshkeeper-redis redis-cli -a freshkeeper123 ping > /dev/null 2>&1; then
    echo "✅ Redis está funcionando"
else
    echo "❌ Redis no responde"
fi

# Levantar interfaces de administración
echo "🖥️  Iniciando interfaces de administración..."
docker-compose up -d adminer mongo-express

echo ""
echo "🎉 ¡Entorno de desarrollo configurado!"
echo ""
echo "📊 Interfaces disponibles:"
echo "   • Mongo Express: http://localhost:8081 (admin/freshkeeper123)"
echo "   • Adminer (PostgreSQL): http://localhost:8080"
echo "   • Servidor: http://localhost:3001"
echo ""
echo "🗄️  Conexiones de base de datos:"
echo "   • MongoDB: mongodb://freshkeeper_app:freshkeeper123@localhost:27017/freshkeeper"
echo "   • PostgreSQL: postgresql://freshkeeper:freshkeeper123@localhost:5432/freshkeeper"
echo "   • Redis: redis://:freshkeeper123@localhost:6379"
echo ""
echo "🚀 Para iniciar el servidor:"
echo "   npm run dev"
echo ""
echo "🛑 Para detener todo:"
echo "   ./scripts/dev-stop.sh"