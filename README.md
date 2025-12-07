# Git Profiles Manager

⚠️ **EN DESARROLLO** - Esta extensión está siendo simplificada para soportar solo multi-cuenta GitHub con tokens.

## Funcionalidad Planeada

**Vista: Git Profiles**
- Crear/editar/eliminar perfiles
- Multi-cuenta GitHub con tokens
- Activar perfil para push/pull automático

**Perfil contiene:**
- Nombre del perfil
- Email
- Username GitHub
- GitHub Personal Access Token

**Autenticación:**
- Solo Personal Access Token (HTTPS)
- Configuración automática de git config por repositorio

## Estado Actual

La extensión está en proceso de simplificación. Funcionalidad actual:
- Crear perfiles con nombre, email, username y token
- Editar perfiles existentes
- Eliminar perfiles
- Activar perfil (marca como activo)

## Configurar Repositorio

**Desde SCM:** Click ⚙️ en Source Control → Seleccionar perfil para repo actual

Esto configurará:
- `git config user.name`
- `git config user.email`
- `git config credential.helper` con el token

## Comandos

**Perfiles:**
- **Crear Perfil** - Nombre, email, username, token
- **Editar Perfil** - Modificar datos del perfil
- **Eliminar Perfil** - Borrar perfil
- **Activar Perfil** - Marcar como perfil activo
- **Refrescar** - Actualizar vista

**Repositorio:**
- **Configurar Repositorio** - Asignar perfil al repo actual

## ¿Cómo funciona?

Cada perfil almacena:
1. Token GitHub de forma segura
2. Configura automáticamente el repositorio con HTTPS
3. Al hacer push/pull, Git usa el token del perfil activo
4. Configura `user.name` y `user.email` por repositorio

## Autor

**Remi Aguilar**
- Website: [remiaguilar.com](https://remiaguilar.com)
- GitHub: [@remiaguilar](https://github.com/remiaguilar)

## Licencia

MIT License - Ver [LICENSE](LICENSE) para más detalles.

## Contribuciones

Este proyecto es open source. Contribuciones, issues y sugerencias son bienvenidas.

Si encuentras un bug o tienes una idea para mejorar la extensión, por favor abre un [issue](https://github.com/remiaguilar/vs-notes/issues).
