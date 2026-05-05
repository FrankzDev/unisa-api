# 🏠 Unisa API Proxy

Backend proxy serverless construido en Vercel para conectar Webflow con la API de Domus de forma segura, escalable y optimizada.

Este proyecto actúa como una capa intermedia que protege credenciales, normaliza datos y expone endpoints listos para consumo desde frontend (Webflow).

---

# 🌐 Base URL

```
https://tu-proyecto.vercel.app/api
```

---

# 📦 Arquitectura

```
Webflow → Vercel API Proxy → Domus API → Response → Webflow
```

---

# 🚀 Tecnologías

- Node.js (Serverless Functions)
- Vercel
- Fetch API
- dotenv (local development)
- GitHub (version control)

---

# 📡 Endpoints

---

## 🏠 1. Properties

### Endpoint

```
GET /api/properties
```

### Descripción

Devuelve un listado de propiedades con soporte de paginación y filtros dinámicos.

---

### Query Params

| Param | Tipo | Default | Descripción |
|------|------|--------|-------------|
| page | number | 1 | Página actual |
| filters | string | - | Filtros dinámicos (city, type, price, etc.) |

---

### Headers

| Header | Tipo | Descripción |
|--------|------|-------------|
| perpage | number | Cantidad de elementos por página |
| Authorization | string | API key de Domus |
| inmobiliaria | string | ID de inmobiliaria |

---

### Ejemplo

```
/api/properties?page=1&city=san-salvador&type=house
```

---

### Ejemplo de uso en frontend

```js
fetch("https://tu-proyecto.vercel.app/api/properties?page=1", {
  headers: {
    perpage: 9
  }
})
  .then(res => res.json())
  .then(data => console.log(data));
```

---

### Response

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "perpage": 9,
    "total": 120
  }
}
```

---

## 📍 2. Neighborhoods

### Endpoint

```
GET /api/neighborhoods
```

### Descripción

Devuelve lista de zonas o barrios disponibles para filtros.

---

## 🏷 3. Types

### Endpoint

```
GET /api/types
```

### Descripción

Devuelve tipos de propiedades disponibles (house, apartment, land, etc.).

---

## 🏡 4. Property Detail

### Endpoint

```
GET /api/property-detail/:codpro
```

### Descripción

Devuelve información detallada de una propiedad específica.

---

### Params

| Param | Tipo | Descripción |
|------|------|-------------|
| codpro | string | Código único de la propiedad |

---

### Ejemplo

```
/api/property-detail/ABC123
```

---

# ⚙️ Variables de entorno

Estas variables deben configurarse en Vercel (NO en GitHub):

```
DOMUS_BASE_URL=https://api.tu-dominio.com
DOMUS_API_KEY=xxxxx
INMOBILIARIA=xxxxx
```

---

# 🔐 Seguridad

- API keys nunca expuestas al frontend
- Todas las requests pasan por proxy en Vercel
- CORS controlado desde serverless functions
- Headers sensibles manejados solo en backend

---

# ⚙️ Estructura del proyecto

```
/api
  ├── properties.js
  ├── neighborhoods.js
  ├── types.js
  └── property-detail
        └── [codpro].js

package.json
package-lock.json
```

---

# 🚀 Estado del proyecto

✔ Backend funcional  
✔ Integración lista con Webflow  
✔ Deploy listo en Vercel  
✔ API estructurada y escalable  

---

# 🧠 Notas técnicas

- `perpage` se maneja vía headers (no query params)
- `page` y filtros se manejan vía query string
- rutas dinámicas soportadas con `[codpro]`
- arquitectura preparada para escalar a SaaS

---

# 🚀 Futuras mejoras posibles

- caching en Vercel (mejor performance)
- endpoint de search tipo Airbnb
- versionado `/v1/`
- rate limiting
- logging de requests
- multi-inmobiliaria (SaaS)

---

# 👨‍💻 Autor

Proyecto construido como backend proxy para integración Webflow + Domus API.
