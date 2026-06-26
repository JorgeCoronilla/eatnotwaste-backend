# Plan de mejora del proceso de búsqueda

> Basado en la auditoría del flujo `ProductSearchService` / `ProductAPIService`.
> Orden por dependencia e impacto: rendimiento → calidad → robustez/coste → limpieza → observabilidad.

## Resumen de fases

| Fase | Objetivo | Riesgo | Impacto |
|---|---|---|---|
| 0 | Baseline y medición | Nulo | — |
| 1 | Índices y rendimiento (crítico) | Bajo | Altísimo |
| 2 | Calidad de resultados (ranking, dedup, forma única) | Medio | Alto |
| 3 | Robustez y coste (rate-limit, cache, genéricos i18n) | Medio | Alto |
| 4 | Paginación y limpieza de esquema multilingüe | Bajo | Medio |
| 5 | Observabilidad y tests | Bajo | Medio |

---

## Fase 0 — Baseline y medición

Objetivo: tener números antes/después y evitar regresiones.

- [ ] 0.1 Confirmar en BD de producción/staging qué índices existen hoy:
  `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'products';`
- [ ] 0.2 Medir latencia actual de los 3 escenarios con `EXPLAIN ANALYZE`:
  - exacto: `WHERE unaccent(lower(name)) = 'leche entera'`
  - fuzzy: `WHERE name ILIKE '%leche%'`
  - conteo de filas `source = 'llm'` (estimar polución).
- [ ] 0.3 Anotar nº total de productos y % LLM como métrica de partida.
- [ ] 0.4 Crear rama `feat/search-overhaul` y entorno de pruebas con datos representativos.

---

## Fase 1 — Índices y rendimiento (CRÍTICO)

Objetivo: eliminar los sequential scans y blindar los índices contra el schema drift de Prisma.

### Tareas

- [x] 1.1 **Crear migración** `restore_search_indexes` con SQL crudo idempotente:
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE EXTENSION IF NOT EXISTS unaccent;

  -- Wrapper IMMUTABLE: unaccent() no es indexable directamente
  CREATE OR REPLACE FUNCTION immutable_unaccent(text)
  RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent', $1) $$;

  -- Índice funcional para el match exacto
  CREATE INDEX IF NOT EXISTS products_name_unaccent_lower_idx
    ON products (immutable_unaccent(lower(name)));

  -- Trigram para fuzzy / ILIKE / similarity()
  CREATE INDEX IF NOT EXISTS products_name_trgm_idx  ON products USING gin (name gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS products_brand_trgm_idx ON products USING gin (brand gin_trgm_ops);
  ```
- [x] 1.2 **Actualizar `searchLocal`** para usar `immutable_unaccent(lower(name))` en el query exacto (mismo nombre de función que en el índice) para que el planner use el índice.
- [x] 1.3 **Declarar los índices trgm en `schema.prisma`** para que Prisma no los vuelva a borrar:
  ```prisma
  @@index([name(ops: raw("gin_trgm_ops"))], type: Gin)
  @@index([brand(ops: raw("gin_trgm_ops"))], type: Gin)
  ```
  (El índice funcional + `immutable_unaccent` quedan en SQL crudo; documentar en `schema.prisma` con comentario que advierta de no borrarlos con `migrate dev`.)
- [ ] 1.4 Verificar con `EXPLAIN ANALYZE` que ahora se usan `Bitmap Index Scan` / `Index Scan` en los 3 escenarios.
- [ ] 1.5 Documentar en `DEVELOPER_GUIDE.md` el procedimiento para añadir índices crudos sin que `migrate dev` los revierta.

**Criterio de aceptación:** los tres queries de la Fase 0 usan índice; latencia p95 < 50 ms en tabla con ≥50k productos.

---

## Fase 2 — Calidad de resultados

Objetivo: mejores rankings, sin duplicados ni basura LLM, y una forma de respuesta única.

### 2.1 Ranking por similitud

- [x] 2.1.1 Reescribir el paso fuzzy de `searchLocal` como `$queryRaw` con ordenación en BD por `similarity() DESC`. Re-sort en JS eliminado.
- [ ] 2.1.2 Ajustar `pg_trgm.similarity_threshold` o usar `set_limit()` si los resultados son demasiado laxos/estrictos. *(validar con datos reales)*
- [x] 2.1.3 Mantener fallback `startsWith` para queries de < 3 caracteres (trgm rinde mal en strings cortos).

### 2.2 Dedup y filtrado de productos LLM

- [x] 2.2.1 Antes de `prisma.product.create` en la rama LLM, `findFirst` por `immutable_unaccent(lower(name))` + `source = 'llm'` antes de crear.
- [x] 2.2.2 Índice único parcial `products_llm_name_unique_idx` añadido a la migración de Fase 1.
- [x] 2.2.3 Filtro `isLowQualityLlm` aplicado también en el path fuzzy (extraído como helper de módulo).
- [ ] 2.2.4 Decidir política persistencia LLM (ver Fase 3 rate-limit).

### 2.3 Forma de respuesta unificada

- [x] 2.3.1 Creado `src/types/ProductDTO.ts` con interfaz `ProductDTO` y función `toProductDTO()`.
- [x] 2.3.2 Aplicado en todos los puntos de retorno de `searchLocal` y `searchByName`.
- [x] 2.3.3 `SearchResult.product` y `.products` tipados como `ProductDTO` / `ProductDTO[]`.
- [ ] 2.3.4 Coordinar con frontend (`fresh-kitchen-harmony`) que consuma la forma única. *(pendiente: cambio breaking en respuesta)*

**Criterio de aceptación:** un `decision:'list'` mixto (local + OFF) devuelve objetos con el mismo shape; no aparecen filas LLM sin imagen/descripción.

---

## Fase 3 — Robustez y control de coste

Objetivo: proteger la rama LLM, cachear más y arreglar la detección de genéricos.

### 3.1 Control de la rama LLM

- [x] 3.1.1 Gate LLM: si `!userId` (anónimo) → skip LLM, devuelve `none` con mensaje informativo.
- [x] 3.1.2 Rate-limit 60 req/15min por IP en `/search/name` vía `searchNameLimiter`.
- [x] 3.1.3 Telemetría: `aiFallbackTriggered` ya loguea `{ query, userId }`.
- [x] 3.1.4 Timeout LLM 8s correcto; comportamiento ante fallo devuelve `none`. Sin cambios.

### 3.2 Cacheo ampliado

- [x] 3.2.1 Cache top-level en `searchByName` (modo `smart`): clave `search|smart|${q}|${lang}`. TTL 120s para local, 3600s para OFF.
- [ ] 3.2.2 Invalidación activa de caché al crear/editar producto. *(pendiente; TTL corto mitiga el problema)*

### 3.3 Detección de genéricos multi-idioma

- [x] 3.3.1 `looksGenericOrFresh` usa `normalizeTokens` — "tomates" → ["tomate"] → match correcto.
- [x] 3.3.2 Nuevo `src/utils/genericKeywords.ts` con diccionario por idioma (es/en/fr/pt). Lógica: todos los tokens deben ser genéricos ("huevo kinder" → "kinder" no lo es → false).
- [ ] 3.3.3 Tests unitarios de clasificación. *(pendiente Fase 5)*

### 3.4 Escaneo por código de barras

- [x] 3.4.1 OFF y Chomp se lanzan en paralelo (race a primera respuesta exitosa). Local queda como fallback.
- [x] 3.4.2 Timeout axios: 25s → 7s por fuente.
- [x] 3.4.3 Todos los `console.*` de `ProductAPIService` reemplazados por `logger.*` con nivel apropiado (debug/info/warn/error).

---

## Fase 4 — Paginación y limpieza de esquema

### 4.1 Paginación real

- [x] 4.1.1 Nuevo método `searchLocalPaginated(q, limit, offset)` en `ProductSearchService`. Corre COUNT y SELECT en paralelo para no añadir latencia.
- [x] 4.1.2 `searchProducts` usa `searchLocalPaginated`; `pagination.total` es el COUNT real; añadido `totalPages`.

### 4.2 Columnas multilingües

- [x] 4.2.1 Columnas registradas en `schema.prisma` con comentario TODO. Solución conservadora: resuelve el drift sin destruir datos. Pendiente decisión: ¿cablearlas para búsqueda multilingüe o dropearlas?
- [x] 4.2.2 `prisma validate` pasa sin advertencias de drift.

### 4.3 Limpieza de tipos y params

- [x] 4.3.1 Tipo `'all'` eliminado en Fase 2. `searchType` ahora es `'fast' | 'external' | 'smart' | 'ai'`.
- [x] 4.3.2 `validateProductSearch` valida `type` con `isIn(['fast','external','smart','ai'])` y añade validación de `lang` y `offset`.
- [x] 4.3.3 `limit` fluye desde query string → controller → `searchByName` → `searchLocal`. Ya no está hardcoded a 20.
- [x] `console.info` en `manualSearchByName` reemplazado por `logger.info`.

---

## Fase 5 — Observabilidad y tests

- [ ] 5.1 Tests unitarios de `searchByName` mockeando OFF y LLM: cubrir found/list/clarify/generated/none.
- [ ] 5.2 Tests de `searchLocal`: exacto, fuzzy, short query, filtrado LLM.
- [ ] 5.3 Test de regresión de rendimiento (seed N productos, asertar uso de índice / latencia).
- [ ] 5.4 Métricas: tasa de hit local vs OFF vs LLM, latencias por nivel, coste LLM/día.
- [ ] 5.5 Dashboard/log estructurado de decisiones de búsqueda.

---

## Orden de ejecución recomendado

1. **Fase 1** primero y de forma aislada (PR pequeño, alto impacto, bajo riesgo) → desplegar.
2. **Fase 2** (calidad) sobre los índices ya restaurados.
3. **Fase 3** (coste/robustez) en paralelo con frontend para la forma de respuesta.
4. **Fase 4 + 5** como cierre y mantenimiento.

## Riesgos y notas

- La creación de índices GIN en tablas grandes puede bloquear; usar `CREATE INDEX CONCURRENTLY` en producción (fuera de transacción de migración Prisma → ejecutar como script de mantenimiento separado).
- `immutable_unaccent` debe llamarse **igual** en query e índice o el planner no lo usará.
- Cambiar la forma de respuesta es breaking para el frontend → versionar o coordinar despliegue.
