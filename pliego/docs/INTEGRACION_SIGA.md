# PLIEGO · Preparación para integrar con SIGA

## Estado actual

PLIEGO es una PWA estática e independiente que vive en `/pliego/` dentro del repositorio `quiz`. El lector óptico QUIZ permanece en la raíz del mismo repositorio. Esta separación evita que una actualización de PLIEGO reemplace archivos o rutas de la aplicación lectora.

En esta versión:
- El banco de preguntas se procesa localmente en el navegador.
- Las versiones y su selección aleatoria se generan localmente.
- Los borradores se almacenan en `localStorage` del navegador.
- La impresión y el PDF se generan desde el navegador.
- No hay API remota, autenticación SIGA ni transmisión de datos estudiantiles.

## Ruta publicada

`https://sergiomantilla09-hue.github.io/quiz/pliego/`

## Criterios para la integración futura

Antes de conectar PLIEGO con SIGA se debe definir:
1. Qué sistema inicia el flujo y qué usuario institucional está autorizado.
2. Qué datos de encabezado llegan desde SIGA (institución, asignatura, grado, grupo, periodo y evaluación).
3. Si SIGA entrega el banco de preguntas o recibe únicamente los PDF generados.
4. Si los documentos deben guardarse en SIGA, en un repositorio de archivos institucional o descargarse localmente.
5. El mecanismo de autenticación y autorización; nunca se deben incluir tokens o secretos dentro de esta PWA pública.

## Compatibilidad con QUIZ

Los archivos SVG de las tarjetas de 20 y 30 preguntas se conservan sin alteraciones. Sus viewBox, marcadores de registro y centros de burbujas deben permanecer sincronizados con `CONFIG_TARJETA_20.json` y `CONFIG_TARJETA.json` del lector QUIZ. Si se cambia una tarjeta, también debe revisarse y probarse su configuración óptica.

## Principio de separación

La integración debe consumir una interfaz de datos documentada, sin acoplar el código de generación de exámenes a la lógica de captura y lectura OMR. Así SIGA podrá coordinar ambos módulos sin que la impresión cambie las coordenadas del lector.
