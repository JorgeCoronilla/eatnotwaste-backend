#!/bin/bash

# Script para detener el entorno de desarrollo

echo "🛑 Deteniendo entorno de desarrollo FreshKeeper..."

# Detener todos los contenedores
docker-compose down

echo "✅ Todos los servicios han sido detenidos"
echo ""
echo "💡 Para eliminar también los volúmenes (datos):"
echo "   docker-compose down -v"
echo ""
echo "🗑️  Para limpiar completamente:"
echo "   docker-compose down -v --remove-orphans"
echo "   docker system prune -f"