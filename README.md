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

URL prevista: https://sergiomantilla09-hue.github.io/quiz/

En GitHub abre **Settings → Pages**, selecciona **Deploy from a branch**, elige **main** y la carpeta **/(root)** y guarda.

La app requiere HTTPS para utilizar la cámara y ofrecer la instalación. Las fotografías se procesan localmente en el dispositivo; no se envían a un servidor.

## Uso

1. Abre Quiz desde el celular.
2. En **Clave**, registra el nombre de la evaluación y sus 20 respuestas correctas.
3. En **Calificar**, escribe el nombre y curso del estudiante.
4. Toma una fotografía completa, vertical y bien iluminada de la tarjeta.
5. Revisa las respuestas detectadas, especialmente las señaladas como dudosas o dobles.
6. Guarda el resultado. En **Historial** puedes exportar los registros a CSV.

## Tarjeta compatible

Utiliza la tarjeta incluida en `assets/plantilla_balbinista.png` y conserva visibles los cuatro marcadores. No cambies la posición de las burbujas sin actualizar las coordenadas de lectura.

La lectura automática debe validarse con tarjetas físicas reales antes de registrar calificaciones oficiales. El historial queda en el almacenamiento local del navegador; exporta periódicamente el CSV como respaldo.
