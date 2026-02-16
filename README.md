<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# CHATVOZ

Aplicación de voz en tiempo real con Gemini + modo chat de texto estilo GPT.

## Run Locally

**Prerequisitos:** Node.js 20+

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Crea `.env.local` con tu API key:
   ```bash
   GEMINI_API_KEY=tu_api_key
   ```
3. Ejecuta en desarrollo:
   ```bash
   npm run dev
   ```

## Deploy en GitHub Pages

Este proyecto **solo** se despliega en GitHub Pages (no usamos Vercel).
El repo incluye workflow automático en `.github/workflows/deploy.yml`.
Este repo incluye workflow automático en `.github/workflows/deploy.yml`.

### Requisitos

1. En GitHub, ve a **Settings → Pages** y selecciona:
   - **Source:** `GitHub Actions`
2. En **Settings → Secrets and variables → Actions**, crea:
   - `GEMINI_API_KEY`

### Publicación

- Se despliega automáticamente en cada push a `main`.
- También puedes lanzar deploy manual desde **Actions → Build and deploy to GitHub Pages → Run workflow**.


### Desplegar la versión estilo GPT (rama `work`)

Si tu versión buena está en `work`, **ya no necesitas mergear a `main` para ver deploy**.

1. Sube la rama `work`:
   ```bash
   git push -u origin work
   ```
2. Ve a **Actions → Build and deploy to GitHub Pages** y verifica ejecución (se dispara también por push a `work`).
3. Alternativa manual: **Run workflow** y selecciona rama `work`.


La URL final suele ser:

```text
https://<tu-usuario>.github.io/CHATVOZ/
```

> El `base path` se calcula automáticamente con el nombre del repositorio durante CI (`VITE_BASE_PATH=/${repo}/`), para evitar rutas rotas en GitHub Pages.
