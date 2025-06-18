# 🚂 Railway Database Configuration

## 🎯 PROBLEMA SOLUCIONADO
El error `ETIMEDOUT` se debe a la configuración incorrecta de Railway. Hemos actualizado el código para usar las credenciales correctas.

## 📋 VARIABLES DE ENTORNO NECESARIAS

### Opción 1: Usar MYSQL_URL (Recomendado)
```
MYSQL_URL=mysql://root:cLytbcVXOiloQxifsSqXyvrvyeNvIhSV@mysql.railway.internal:3306/railway
```

### Opción 2: Variables individuales (Fallback)
```
MYSQLHOST=mysql.railway.internal
MYSQLUSER=root
MYSQLPASSWORD=cLytbcVXOiloQxifsSqXyvrvyeNvIhSV
MYSQLDATABASE=railway
MYSQLPORT=3306
```

### Opción 3: Para desarrollo local (External)
```
DB_HOST=crossover.proxy.rlwy.net
DB_PORT=14951
DB_USER=root
DB_PASSWORD=cLytbcVXOiloQxifsSqXyvrvyeNvIhSV
DB_NAME=railway
```

### Configuración de aplicación
```
JWT_SECRET=3ab38dda4c23b0ae1b004bd4ecfdb4fa68c4127085df5fbd797e4301ea61c8cfe1156c3594d21d912adfb3fd4f
PORT=5000
NODE_ENV=production
```

## 🔧 PASOS PARA CONFIGURAR

### 1. Para desarrollo local:
Crea/actualiza tu archivo `.env` con:
```bash
# Copia el contenido de arriba a tu archivo .env
MYSQL_URL=mysql://root:cLytbcVXOiloQxifsSqXyvrvyeNvIhSV@crossover.proxy.rlwy.net:14951/railway
JWT_SECRET=3ab38dda4c23b0ae1b004bd4ecfdb4fa68c4127085df5fbd797e4301ea61c8cfe1156c3594d21d912adfb3fd4f
PORT=5000
```

### 2. Para Railway (Producción):
Ve a tu dashboard de Railway y configura estas variables:
- `MYSQL_URL` (Railway debería tenerla automáticamente)
- `JWT_SECRET`
- `PORT=5000`

## 🚀 CÓMO PROBAR

1. **Reinicia tu servidor local:**
   ```bash
   npm start
   ```

2. **Verifica la conexión:**
   ```bash
   curl http://localhost:5000/api/health
   ```

3. **Probar la base de datos:**
   ```bash
   curl http://localhost:5000/api/categories
   ```

## ✅ CAMBIOS REALIZADOS

1. **db.js actualizado** - Ahora usa `MYSQL_URL` de Railway
2. **Soporte múltiple** - Funciona con URL o variables individuales
3. **Mejor logging** - Diagnósticos más claros
4. **Timeouts optimizados** - Para Railway específicamente
5. **Reintentos inteligentes** - Con backoff exponencial

## 🔍 DIAGNÓSTICO

Si sigues teniendo problemas:
1. Verifica que Railway esté funcionando en tu dashboard
2. Regenera las credenciales si es necesario  
3. Asegúrate que el servicio no esté "dormido"
4. Revisa los logs de Railway para más detalles

## 📞 SIGUIENTE PASO
Una vez configurado el `.env`, ejecuta:
```bash
npm start
```

Y verifica que aparezcan mensajes como:
```
✅ Using MYSQL_URL from Railway
📋 Railway Connection Config: ...
✅ Railway database connection successful
``` 