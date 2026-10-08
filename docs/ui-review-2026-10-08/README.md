# Revisión de Perfil, Mensajes y Guardados

Análisis aplicado con `.claude/skills/huashu-design/SKILL.md`: propósito de cada pantalla, jerarquía, densidad, coherencia de marca y claridad de la acción principal. Las capturas proceden de la app Expo renderizada a 390 × 844 px con una cuenta de demostración local; no son maquetas.

| Pantalla | Antes | Rediseño |
| --- | --- | --- |
| Perfil | La portada y tres bloques de metadatos ocupaban gran parte de la primera vista; las acciones y la edición quedaban más abajo. | Identidad, correo y estado de verificación se leen primero; teléfono y antigüedad pasan a una fila secundaria. Las acciones aparecen completas y la edición empieza a entrar en la primera vista. |
| Mensajes | Una conversación aislada en una tarjeta grande, con una cabecera descriptiva sin estructura de lista. | Cabecera con contexto de seguridad, sección «Recientes» y filas de conversación más fáciles de recorrer; nombre, vista previa, hora y no leídos mantienen su prioridad. |
| Guardados | El estado vacío reutilizaba una tarjeta centrada genérica con mucho espacio interior. | Estado de colección específico, alineado a la izquierda, con explicación breve y acceso directo a explorar. La cuadrícula de propiedades guardadas se conserva para la colección con contenido. |

El rediseño usa la tipografía, los iconos y los tokens de color del proyecto. Se comprobó con el tema oscuro y con el tema claro del dispositivo. Las capturas «antes/después» muestran Perfil con un cliente demo, Mensajes con una conversación demo y Guardados sin propiedades guardadas.

Comparativas: [Perfil](perfil-comparativa.png), [Mensajes](mensajes-comparativa.png), [Guardados](guardados-comparativa.png).
