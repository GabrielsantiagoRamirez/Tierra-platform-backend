# Guía de Despliegue en Vercel - Construction API

## 📋 Requisitos Previos

1. Cuenta en [Vercel](https://vercel.com) (gratis)
2. Proyecto en GitHub, GitLab o Bitbucket (recomendado)
3. MongoDB Atlas configurado

---

## 🚀 Paso 1: Preparar el Proyecto

### 1.1 Verificar archivos creados

Asegúrate de tener estos archivos:
- ✅ `api/index.js` - Serverless function para Vercel
- ✅ `vercel.json` - Configuración de Vercel
- ✅ `.gitignore` - Con `.env` incluido

### 1.2 Subir a Git (si aún no lo has hecho)

```bash
# Inicializar Git (si no está inicializado)
git init

# Agregar todos los archivos
git add .

# Hacer commit
git commit -m "Initial commit - Construction API"

# Crear repositorio en GitHub y conectar
# Luego hacer push
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git branch -M main
git push -u origin main
```

---

## 🔧 Paso 2: Desplegar en Vercel

### Opción A: Desde el Dashboard de Vercel (Recomendado)

1. **Ir a Vercel**
   - Ve a [vercel.com](https://vercel.com)
   - Inicia sesión con GitHub/GitLab/Bitbucket

2. **Importar Proyecto**
   - Click en "Add New..." → "Project"
   - Selecciona tu repositorio de GitHub
   - Click en "Import"

3. **Configurar Proyecto**
   - **Framework Preset:** Otros (o deja en blanco)
   - **Root Directory:** `./` (raíz del proyecto)
   - **Build Command:** (dejar vacío, no necesitamos build)
   - **Output Directory:** (dejar vacío)
   - **Install Command:** `npm install`

4. **Configurar Variables de Entorno**
   - Click en "Environment Variables"
   - Agrega las siguientes variables:

   ```
   MONGODB_USER=pablomelo0420
   MONGODB_PASSWORD=TU_CONTRASEÑA_REAL
   MONGODB_CLUSTER=tierradb.beaz9os.mongodb.net
   MONGODB_DATABASE=construction
   MONGODB_APP_NAME=TierraDB
   ```

   O si prefieres usar la URI completa:

   ```
   MONGODB_URI=mongodb+srv://pablomelo0420:TU_CONTRASEÑA@tierradb.beaz9os.mongodb.net/construction?appName=TierraDB
   ```

5. **Desplegar**
   - Click en "Deploy"
   - Espera a que termine el despliegue (2-3 minutos)

### Opción B: Desde la Terminal (CLI)

1. **Instalar Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Iniciar sesión**
   ```bash
   vercel login
   ```

3. **Desplegar**
   ```bash
   vercel
   ```

4. **Configurar Variables de Entorno**
   ```bash
   vercel env add MONGODB_USER
   vercel env add MONGODB_PASSWORD
   vercel env add MONGODB_CLUSTER
   vercel env add MONGODB_DATABASE
   vercel env add MONGODB_APP_NAME
   ```

5. **Desplegar a Producción**
   ```bash
   vercel --prod
   ```

---

## 🔐 Paso 3: Configurar Variables de Entorno en Vercel

### Desde el Dashboard:

1. Ve a tu proyecto en Vercel
2. Click en "Settings" → "Environment Variables"
3. Agrega cada variable:

   | Variable | Valor | Entornos |
   |----------|-------|----------|
   | `MONGODB_USER` | `pablomelo0420` | Production, Preview, Development |
   | `MONGODB_PASSWORD` | `tu_contraseña_real` | Production, Preview, Development |
   | `MONGODB_CLUSTER` | `tierradb.beaz9os.mongodb.net` | Production, Preview, Development |
   | `MONGODB_DATABASE` | `construction` | Production, Preview, Development |
   | `MONGODB_APP_NAME` | `TierraDB` | Production, Preview, Development |

   **O usa la URI completa:**
   
   | Variable | Valor | Entornos |
   |----------|-------|----------|
   | `MONGODB_URI` | `mongodb+srv://pablomelo0420:CONTRASEÑA@tierradb.beaz9os.mongodb.net/construction?appName=TierraDB` | Production, Preview, Development |

4. **IMPORTANTE:** Después de agregar variables, necesitas hacer un nuevo despliegue:
   - Ve a "Deployments"
   - Click en los 3 puntos del último deployment
   - Click en "Redeploy"

---

## 🌐 Paso 4: Verificar el Despliegue

Una vez desplegado, Vercel te dará una URL como:
```
https://tu-proyecto.vercel.app
```

### Probar los Endpoints:

1. **Test:**
   ```
   https://tu-proyecto.vercel.app/test
   ```

2. **Listar Presupuestos:**
   ```
   https://tu-proyecto.vercel.app/api/budget/list
   ```

3. **Crear Presupuesto:**
   ```bash
   curl -X POST https://tu-proyecto.vercel.app/api/budget/create \
     -H "Content-Type: application/json" \
     -d '{"client_name":"Test","client_email":"test@example.com","project_name":"Proyecto Test","work_type":"construction"}'
   ```

---

## 🔍 Paso 5: Verificar MongoDB Atlas

### Whitelist de IPs en MongoDB Atlas:

1. Ve a MongoDB Atlas → Network Access
2. Agrega la IP de Vercel:
   - Click en "Add IP Address"
   - Selecciona "Allow Access from Anywhere" (`0.0.0.0/0`)
   - O agrega las IPs específicas de Vercel (menos seguro pero más restrictivo)

---

## 📝 Paso 6: Configurar Dominio Personalizado (Opcional)

1. Ve a tu proyecto en Vercel
2. Click en "Settings" → "Domains"
3. Agrega tu dominio personalizado
4. Sigue las instrucciones para configurar DNS

---

## 🐛 Solución de Problemas

### Error: "Cannot find module"
- Verifica que `package.json` tenga todas las dependencias
- Asegúrate de que `node_modules` esté en `.gitignore`

### Error: "MongoDB connection failed"
- Verifica las variables de entorno en Vercel
- Verifica que la IP de Vercel esté en la whitelist de MongoDB Atlas
- Revisa los logs en Vercel: "Deployments" → Click en el deployment → "Logs"

### Error: "Function timeout"
- Vercel tiene un límite de tiempo para funciones serverless (10s en plan gratuito)
- La conexión a MongoDB puede tardar, pero Mongoose maneja conexiones persistentes

### Ver Logs:
1. Ve a tu proyecto en Vercel
2. Click en "Deployments"
3. Click en el deployment más reciente
4. Click en "Functions" → Selecciona la función → Ver logs

---

## ✅ Checklist Final

- [ ] Proyecto subido a Git (GitHub/GitLab/Bitbucket)
- [ ] Archivo `api/index.js` creado
- [ ] Archivo `vercel.json` creado
- [ ] Variables de entorno configuradas en Vercel
- [ ] MongoDB Atlas whitelist configurada (0.0.0.0/0 o IPs de Vercel)
- [ ] Despliegue exitoso
- [ ] Endpoint `/test` funciona
- [ ] Endpoint `/api/budget/list` funciona

---

## 🎉 ¡Listo!

Tu API debería estar funcionando en:
```
https://tu-proyecto.vercel.app
```

Cada vez que hagas `git push`, Vercel desplegará automáticamente una nueva versión.

