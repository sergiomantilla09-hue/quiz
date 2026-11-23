# Quiz · Lector de evaluaciones · QUIZ

Aplicación web progresiva (PWA) de **QUIZ** para leer tarjetas de 20 o 30 preguntas, con opciones A–D.

## Funciones

- Abre una cámara guiada dentro de la app o permite elegir una fotografía.
- Detecta los cuatro marcadores en tiempo real y captura automáticamente al reconocerlos de forma estable.
- Muestra una ventana emergente con la nota y prepara la cámara para el siguiente estudiante al pulsar OK.
- Detecta los cuatro marcadores cuadrados y corrige la perspectiva.
- Permite elegir en **Clave** entre QUIZ de 20 (2 columnas de 10) y QUIZ de 30 (2 columnas de 15).
- Detecta el formato físico de la tarjeta y advierte si no coincide con el seleccionado.
- Lee las 20 o 30 respuestas A–D según el formato activo.
- Señala preguntas sin marca, con doble marca o con marca tenue.
- Permite corregir manualmente las lecturas dudosas.
- Mantiene una clave independiente para cada formato.
- Incluye un editor de hoja para personalizar asignatura, grado (1.º a 11.º) y tipo de evaluación (Recuperación, Evaluación 1, Evaluación 2, Nivelación u otra denominación).
- Muestra una vista previa del encabezado y descarga un SVG personalizado con los datos elegidos, sin alterar las coordenadas de lectura.
- Centra verticalmente la numeración dentro de las cápsulas de cada fila.
- Calcula la nota sobre 50: en QUIZ 20 cada acierto vale 2,5; en QUIZ 30 aplica 50/30 puntos por acierto.
- Guarda los resultados en el dispositivo y permite exportarlos a CSV.
- Incluye caché para uso sin conexión después de la primera carga.
- **Montar examen** abre PLIEGO con encabezado, material base, revisión y generación en cuatro apartados superiores.
- PLIEGO compone cinco versiones con preguntas abiertas al final, permite editar la clave original y descargar el examen y las cinco tablas QUIZ en PDF.
- **Preparar claves en QUIZ** traslada las claves A–E y selecciona automáticamente el formato de 20 o 30 preguntas para calificar con cámara o fotografía.

## Publicación

Este proyecto es estático y se publica mediante GitHub Actions. El flujo de trabajo está en `.github/workflows/pages.yml` y se ejecuta automáticamente cuando hay cambios en `main`.

URL de la aplicación: https://sergiomantilla09-hue.github.io/quiz/

Si GitHub Pages aún no está habilitado, abre **Settings → Pages** en este repositorio y selecciona **GitHub Actions** como fuente de publicación.

## Uso

1. Abre Quiz desde el celular.
2. Para un examen nuevo, pulsa **Montar examen**, analiza el banco, genera las versiones y registra la clave original. Pulsa **Preparar claves en QUIZ** para volver al lector con las cinco claves. También puedes configurar una clave manualmente en **Clave**.
3. En el editor **Personalizar tarjeta**, escribe el área, elige el grado y el tipo de evaluación. La vista previa se actualiza al cambiar los datos; pulsa **Descargar hoja personalizada** para generar la tarjeta lista para imprimir.
4. En **Calificar**, puedes dejar nombre y curso en blanco; ambos son opcionales.
5. En el escaneo guiado, alinea los cuatro marcadores. Quiz toma la fotografía automáticamente cuando los reconoce.
6. La nota aparece en una ventana emergente y se guarda automáticamente en el historial. Pulsa **OK · Siguiente estudiante** y presenta la nueva tarjeta. No es necesario ingresar el nombre.
7. Para fotografías cargadas desde la galería, revisa las respuestas detectadas y guarda el resultado manualmente. En **Historial** puedes exportar los registros a CSV.

## Tarjeta compatible

Selecciona el formato correcto en **Clave** y utiliza su plantilla: `assets/plantilla_quiz_20.svg` para 20 preguntas o `assets/plantilla_quiz_30.svg` para 30. Conserva visibles los cuatro marcadores. Si el formato de la tarjeta no coincide, Quiz no calificará y te pedirá cambiar la selección. No cambies la posición de las burbujas sin actualizar las coordenadas de lectura.

La lectura automática debe validarse con tarjetas físicas reales antes de registrar calificaciones oficiales. El historial queda en el almacenamiento local del navegador; exporta periódicamente el CSV como respaldo.

## Privacidad

Las fotografías se procesan en el navegador y no se envían a un servidor. Los resultados se guardan localmente en el dispositivo. La aplicación publicada es pública, pero no almacena los registros de los estudiantes en GitHub.

## PLIEGO · Generador de exámenes

PLIEGO vive en la subcarpeta `/pliego/` y complementa al lector óptico QUIZ sin reemplazar sus archivos ni alterar sus coordenadas.

- Aplicación: https://sergiomantilla09-hue.github.io/quiz/pliego/
- Carpeta del proyecto: [`/pliego`](./pliego/)
- Documentación para integración futura con SIGA: [`pliego/docs/INTEGRACION_SIGA.md`](./pliego/docs/INTEGRACION_SIGA.md)

PLIEGO prepara versiones aleatorias de exámenes, compone la impresión en columnas, justifica el texto e integra la tarjeta SVG original de QUIZ al final del contenido, en la misma columna. Los bancos y borradores se procesan localmente en el navegador. La integración con SIGA todavía no está conectada; su arquitectura y criterios están documentados en el subproyecto.
