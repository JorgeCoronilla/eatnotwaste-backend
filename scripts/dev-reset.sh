#!/bin/bash

# Script para resetear completamente el entorno de desarrollo

echo "🔄 Reseteando entorno de desarrollo FreshKeeper..."

# Confirmar acción
read -p "⚠️  Esto eliminará TODOS los datos. ¿Continuar? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Operación cancelada"
    exit 1
fi

# Detener y eliminar todo
echo "🛑 Deteniendo servicios..."
docker-compose down -v --remove-orphans

# Eliminar volúmenes específicos
echo "🗑️  Eliminando volúmenes..."

docker volume rm freshkeeper-backend_postgresql_data 2>/dev/null || true
docker volume rm freshkeeper-backend_redis_data 2>/dev/null || true

# Limpiar imágenes no utilizadas
echo "🧹 Limpiando imágenes no utilizadas..."
docker system prune -f

echo "✅ Entorno completamente reseteado"
echo ""
echo "🚀 Para volver a configurar:"
echo "   ./scripts/dev-setup.sh"