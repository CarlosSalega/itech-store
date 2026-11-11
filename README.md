# iTech Store

Aplicación web/ecommerce para gestionar y publicar un catálogo online de productos.

El proyecto tendrá una experiencia pública para visitantes y un panel privado para la administración del sitio.

## Stack

- Next.js 16
- React
- TypeScript
- Prisma 7
- PostgreSQL / Prisma Postgres
- Better Auth
- Cloudinary
- Tailwind CSS
- shadcn/ui (solo para el dashboard administrativo de la web, osea la parte privada no pública)

## Rutas

### Públicas

- `/` — Landing
- `/catalogo` — Catálogo de productos
- `/catalogo/[slug]` — Detalle de producto
- `/contacto` — Información de contacto
- `/login` — Autenticación

(escucho sugerencias de nomanclaturas y paths)

### Privadas

- `/admin`
- `/dashboard`

Las rutas privadas requieren autenticación mediante email y password better auth.

## Arquitectura

Se priorizará una arquitectura **feature-based**, organizando el código alrededor de funcionalidades y dominios del producto.

Se busca mantener una arquitectura simple, modular y mantenible, evitando abstracciones y complejidad innecesarias.

## Objetivo

El proyecto
