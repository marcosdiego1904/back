# 🚀 Guía de Migraciones Automatizadas con Knex.js

## ¿Qué es esto?

En lugar de ejecutar SQL manualmente en Railway o MySQL Workbench, ahora tu aplicación **gestiona automáticamente** la estructura de la base de datos usando **migraciones**.

### Beneficios

✅ **Automatizado**: Las migraciones se ejecutan automáticamente en cada deploy
✅ **Versionado**: Todos los cambios de esquema están en Git
✅ **Reproducible**: Cualquier desarrollador puede recrear la DB exacta
✅ **Reversible**: Puedes hacer rollback si algo sale mal
✅ **Historial completo**: Sabes exactamente qué cambios se hicieron y cuándo

---

## 🎯 Cómo Funciona

### El Flujo de Trabajo

```
1. Escribes código → 2. Creas migración → 3. Git push → 4. Railway ejecuta migración automáticamente
```

**Antes (Antiguo):**
```bash
1. Modificas código backend
2. Abres Railway dashboard
3. Copias SQL manualmente
4. Lo pegas en el Query tab
5. Ejecutas
6. Cruzas los dedos 🤞
```

**Ahora (Nuevo):**
```bash
1. Modificas código backend
2. git add . && git commit -m "..."
3. git push
4. ✨ Railway ejecuta migraciones automáticamente
5. ✨ Todo funciona
```

---

## 📁 Estructura de Archivos

```
back/
├── knexfile.js                          # Configuración de Knex
├── scripts/
│   └── run-migrations.js                # Script que ejecuta migraciones
├── migrations/
│   ├── 001_add_ranking_system.sql      # Migración SQL antigua (referencia)
│   └── knex/                            # Migraciones Knex (ACTIVAS)
│       └── 20251116_add_ranking_system.js
└── package.json                         # Scripts npm
```

---

## 🔧 Comandos Disponibles

### Comandos de Producción (Railway)

```bash
# Iniciar servidor (corre migraciones automáticamente)
npm start

# Solo ejecutar migraciones
npm run migrate

# Ver estado de migraciones
npm run migrate:status

# Revertir última migración
npm run migrate:rollback
```

### Comandos de Desarrollo Local

```bash
# Crear nueva migración
npm run migrate:make nombre_de_la_migracion

# Ejecutar migraciones en desarrollo
npm run migrate:dev
```

---

## 🚀 Cómo Railway Ejecuta las Migraciones

### Configuración Automática

En `package.json`, el script `start` es:

```json
{
  "scripts": {
    "start": "node scripts/run-migrations.js && node server.js"
  }
}
```

**Esto significa:**
1. Railway ejecuta `npm start`
2. Primero corre `node scripts/run-migrations.js` (ejecuta migraciones pendientes)
3. Si las migraciones tienen éxito → Inicia el servidor (`node server.js`)
4. Si las migraciones fallan → El deploy falla (no inicia servidor roto)

### ¿Qué Pasa en Cada Deploy?

```
Railway Deploy → npm start → Ejecuta migraciones → Inicia servidor
                                    ↓
                    Verifica si hay migraciones pendientes
                                    ↓
                    Si hay pendientes → Las ejecuta
                                    ↓
                    Si no hay pendientes → Salta al servidor
```

---

## 📝 Cómo Crear una Nueva Migración

### Ejemplo: Agregar una columna "avatar_url" a usuarios

**Paso 1: Crear el archivo de migración**

```bash
npm run migrate:make add_avatar_to_users
```

Esto crea un archivo en `migrations/knex/` con timestamp:
```
migrations/knex/20251116120000_add_avatar_to_users.js
```

**Paso 2: Editar el archivo de migración**

```javascript
exports.up = async function(knex) {
  console.log('📝 Adding avatar_url column to users...');

  await knex.schema.alterTable('users', (table) => {
    table.string('avatar_url', 500).nullable();
  });

  console.log('✅ Column added successfully!');
};

exports.down = async function(knex) {
  console.log('📝 Removing avatar_url column from users...');

  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('avatar_url');
  });

  console.log('✅ Column removed successfully!');
};
```

**Paso 3: Commit y push**

```bash
git add migrations/
git commit -m "Add avatar_url column to users"
git push
```

**Paso 4: Railway ejecuta automáticamente**

Railway detecta el push → Ejecuta `npm start` → Corre migraciones → Inicia servidor

---

## 🎓 Anatomía de una Migración Knex

```javascript
// 20251116_ejemplo.js

// ⬆️ UP: Aplicar cambios (cuando haces deploy)
exports.up = async function(knex) {
  // Aquí defines QUÉ cambiar
  await knex.schema.createTable('nueva_tabla', (table) => {
    table.increments('id').primary();
    table.string('nombre');
  });
};

// ⬇️ DOWN: Revertir cambios (si haces rollback)
exports.down = async function(knex) {
  // Aquí defines cómo DESHACER los cambios
  await knex.schema.dropTableIfExists('nueva_tabla');
};

// ⚙️ CONFIG: Configuración opcional
exports.config = {
  transaction: true  // Ejecuta en una transacción (todo o nada)
};
```

---

## 📚 Ejemplos Comunes de Migraciones

### Crear una tabla

```javascript
exports.up = async function(knex) {
  await knex.schema.createTable('posts', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.string('title', 255).notNullable();
    table.text('content');
    table.timestamps(true, true);

    table.foreign('user_id').references('id').inTable('users');
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('posts');
};
```

### Agregar columnas

```javascript
exports.up = async function(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.string('phone_number', 20);
    table.boolean('email_verified').defaultTo(false);
  });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('phone_number');
    table.dropColumn('email_verified');
  });
};
```

### Agregar índice

```javascript
exports.up = async function(knex) {
  await knex.raw('CREATE INDEX idx_users_email ON users(email)');
};

exports.down = async function(knex) {
  await knex.raw('DROP INDEX idx_users_email ON users');
};
```

### Modificar datos

```javascript
exports.up = async function(knex) {
  // Actualizar datos existentes
  await knex('users')
    .where('role', null)
    .update({ role: 'user' });
};

exports.down = async function(knex) {
  // Revertir cambios
  await knex('users')
    .where('role', 'user')
    .update({ role: null });
};
```

---

## 🔍 Verificar Estado de Migraciones

### En Railway

Puedes ver los logs del deploy para ver qué migraciones se ejecutaron:

```
🚀 Database Migration Runner
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Environment: production
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Completed migrations (2):
   - 20251116_add_ranking_system.js
   - 20251117_add_avatar.js

⏳ Pending migrations (0):

✨ No pending migrations. Database is up to date!
```

### Verificar en la Base de Datos

Knex crea una tabla `knex_migrations` que registra qué migraciones se han ejecutado:

```sql
SELECT * FROM knex_migrations;
```

Resultado:
```
| id | name                          | batch | migration_time          |
|----|-------------------------------|-------|-------------------------|
| 1  | 20251116_add_ranking_system.js| 1     | 2025-11-16 14:30:00     |
| 2  | 20251117_add_avatar.js        | 2     | 2025-11-17 09:15:00     |
```

---

## 🚨 Solución de Problemas

### Error: "Migration failed!"

**Causa:** La migración tiene un error de sintaxis o la conexión a DB falló

**Solución:**
1. Revisa los logs de Railway
2. Verifica que la sintaxis de la migración sea correcta
3. Prueba la migración localmente primero (si tienes acceso a una DB de desarrollo)

### Error: "Table already exists"

**Causa:** Intentas crear una tabla que ya existe

**Solución:**
Usa `createTableIfNotExists` en lugar de `createTable`:

```javascript
await knex.schema.createTableIfNotExists('tabla', ...);
```

O verifica primero:

```javascript
const exists = await knex.schema.hasTable('tabla');
if (!exists) {
  await knex.schema.createTable('tabla', ...);
}
```

### Necesito hacer rollback

```bash
# En Railway, via Railway CLI
railway run npm run migrate:rollback

# O conectándote directamente
npm run migrate:rollback
```

⚠️ **CUIDADO:** Hacer rollback en producción puede causar pérdida de datos.

### Migración quedó a medias (partially completed)

Si una migración falla a mitad de camino:

1. Revisa la tabla `knex_migrations_lock`
2. Si está bloqueada, ejecuta:
```sql
DELETE FROM knex_migrations_lock;
```
3. Luego ejecuta la migración de nuevo

---

## ✅ Mejores Prácticas

### 1. **Siempre escribe el `down()`**
Aunque no planees hacer rollback, siempre implementa la función `down()`. Es tu red de seguridad.

### 2. **Una migración = un cambio lógico**
No mezcles cambios no relacionados:

❌ **Mal:**
```javascript
// 20251116_mixed_changes.js
exports.up = async function(knex) {
  await knex.schema.alterTable('users', ...);
  await knex.schema.createTable('posts', ...);
  await knex.schema.alterTable('comments', ...);
};
```

✅ **Bien:**
```javascript
// 20251116_add_avatar_to_users.js
// 20251116_create_posts_table.js
// 20251116_update_comments_structure.js
```

### 3. **Usa transacciones**
Asegúrate de que las migraciones sean atómicas:

```javascript
exports.config = {
  transaction: true
};
```

### 4. **Nunca edites migraciones ya ejecutadas**
Si una migración ya se ejecutó en producción, **NUNCA** la edites. Crea una nueva migración para hacer cambios adicionales.

### 5. **Prueba localmente primero**
Si tienes acceso a una DB local, prueba ahí primero:

```bash
npm run migrate:dev
```

### 6. **Nombres descriptivos**
Usa nombres claros para tus migraciones:

✅ Bien:
- `20251116_add_ranking_system.js`
- `20251117_create_posts_table.js`
- `20251118_add_email_verification.js`

❌ Mal:
- `migration1.js`
- `update.js`
- `fix.js`

---

## 🎯 Resumen para Ti

### Para Aplicar la Migración del Ranking System

**Ya está todo listo. Solo necesitas:**

```bash
git push
```

Eso es todo. Railway ejecutará automáticamente la migración cuando hagas deploy.

### Para Crear Futuras Migraciones

```bash
# 1. Crea la migración
npm run migrate:make nombre_descriptivo

# 2. Edita el archivo generado en migrations/knex/

# 3. Commit y push
git add migrations/
git commit -m "Add nueva funcionalidad"
git push

# 4. Railway ejecuta automáticamente ✨
```

---

## 📖 Documentación Adicional

- [Knex.js Documentation](http://knexjs.org/)
- [Knex Schema Builder](http://knexjs.org/#Schema)
- [Knex Migrations Guide](http://knexjs.org/#Migrations)

---

## 🎉 ¡Listo!

Ahora tienes un sistema profesional de migraciones que:

✅ Se ejecuta automáticamente en cada deploy
✅ Mantiene tu esquema de DB versionado en Git
✅ Es reversible y reproducible
✅ No requiere acceso manual a Railway
✅ Es la forma estándar de la industria

**¡Nunca más tendrás que copiar SQL manualmente en Railway!** 🚀
