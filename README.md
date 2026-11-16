# Quiz · Lector de evaluaciones del Colegio Balbino García

Aplicación web progresiva (PWA) para leer la tarjeta **BG-LC10-R20-MOBILE-V1** del Colegio Balbino García.

## Funciones

- Captura una fotografía desde la cámara trasera del celular o permite elegir una imagen.
- Detecta los cuatro marcadores cuadrados y corrige la perspectiva.
- Lee las 20 filas de respuestas A–D.
- Señala preguntas sin marca, con doble marca o con marca tenue.
- Permite corregir manualmente las lecturas dudosas.
- Compara las respuestas con una clave editable de 20 ítems.
- Calcula la nota sobre 50: cada acierto vale 2,5 puntos.
- Guarda los resultados en el dispositivo y permite exportarlos a CSV.
- Incluye caché para uso sin conexión después de la primera carga.

## Publicación

Este proyecto es estático y se publica mediante GitHub Actions. El flujo de trabajo está en `.github/workflows/pages.yml` y se ejecuta automáticamente cuando hay cambios en `main`.

URL de la aplicación: https://sergiomantilla09-hue.github.io/quiz/

Si GitHub Pages aún no está habilitado, abre **Settings → Pages** en este repositorio y selecciona **GitHub Actions** como fuente de publicación.

## Uso

1. Abre Quiz desde el celular.
2. En **Clave**, registra el nombre de la evaluación y sus 20 respuestas correctas.
3. En **Calificar**, escribe el nombre y curso del estudiante.
4. Toma una fotografía completa, vertical y bien iluminada de la tarjeta.
5. Revisa las respuestas detectadas, especialmente las señaladas como dudosas o dobles.
6. Guarda el resultado. En **Historial** puedes exportar los registros a CSV.

## Tarjeta compatible

Utiliza la tarjeta incluida en `assets/plantilla_balbinista.svg` y conserva visibles los cuatro marcadores. No cambies la posición de las burbujas sin actualizar las coordenadas de lectura.

La lectura automática debe validarse con tarjetas físicas reales antes de registrar calificaciones oficiales. El historial queda en el almacenamiento local del navegador; exporta periódicamente el CSV como respaldo.

## Privacidad

Las fotografías se procesan en el navegador y no se envían a un servidor. Los resultados se guardan localmente en el dispositivo. La aplicación publicada es pública, pero no almacena los registros de los estudiantes en GitHub.
