# Quiz · Lector de evaluaciones · QUIZ

Aplicación web progresiva (PWA) de **QUIZ** para leer tarjetas de 20 o 30 preguntas, con opciones A–D.

## Funciones

- Abre una cámara guiada dentro de la app o permite elegir una fotografía.
- Detecta los cuatro marcadores en tiempo real y captura automáticamente al reconocerlos de forma estable.
- Muestra una ventana emergente con la nota y prepara la cámara para el siguiente estudiante al pulsar OK.
- Detecta los cuatro marcadores cuadrados, corrige la perspectiva y comprueba cinco capturas consecutivas antes de aceptar la lectura de cámara.
- Permite elegir en **Clave** entre QUIZ de 20 (2 columnas de 10) y QUIZ de 30 (2 columnas de 15).
- Detecta el formato físico de la tarjeta y advierte si no coincide con el seleccionado.
- Lee las 20 o 30 respuestas A–D según el formato activo.
- Analiza la tinta por diferencia de color respecto al papel, por lo que admite marcas negras, azules, rojas y otros colores con contraste suficiente. Señala preguntas sin marca, con doble marca o con marca tenue.
- Compara las cinco lecturas por pregunta; si no hay coincidencia suficiente, no calcula ni guarda automáticamente la nota y solicita revisión manual.
- Mantiene una clave independiente para cada formato.
- Incluye un editor de hoja para escribir libremente asignatura, grado/grupo y nombre de la evaluación.
- Muestra una vista previa del encabezado y descarga la hoja personalizada en PNG (doble resolución), JPG con fondo blanco o SVG vectorial, sin alterar las coordenadas de lectura.
- Centra verticalmente la numeración dentro de las cápsulas de cada fila.
- Calcula la nota sobre 50: en QUIZ 20 cada acierto vale 2,5; en QUIZ 30 aplica 50/30 puntos por acierto.
- Guarda los resultados en el dispositivo y permite exportarlos a CSV.
- Incluye caché para uso sin conexión después de la primera carga.

## Publicación

Este proyecto es estático y se publica mediante GitHub Actions. El flujo de trabajo está en `.github/workflows/pages.yml` y se ejecuta automáticamente cuando hay cambios en `main`.

URL de la aplicación: https://sergiomantilla09-hue.github.io/quiz/

Si GitHub Pages aún no está habilitado, abre **Settings → Pages** en este repositorio y selecciona **GitHub Actions** como fuente de publicación.

## Uso

1. Abre Quiz desde el celular.
2. En **Clave**, selecciona si la evaluación tiene 20 o 30 preguntas y registra la clave correspondiente.
3. En el editor **Personalizar tarjeta**, escribe el área, el grado/grupo y el nombre de la evaluación. La vista previa se actualiza al escribir; elige PNG, JPG o SVG para descargar la hoja.
4. En **Calificar**, puedes dejar nombre y curso en blanco; ambos son opcionales.
5. En el escaneo guiado, alinea los cuatro marcadores y mantén la hoja quieta. QUIZ espera cinco detecciones estables y toma cinco imágenes consecutivas para contrastar cada respuesta.
6. Si las cinco tomas coinciden con suficiente seguridad, la nota aparece y se guarda automáticamente. Si alguna respuesta no coincide, QUIZ muestra la tabla para revisión y no guarda una nota automática. No es necesario ingresar el nombre.
7. Para fotografías cargadas desde la galería, revisa las respuestas detectadas y guarda el resultado manualmente. En **Historial** puedes exportar los registros a CSV.

## Tarjeta compatible

Selecciona el formato correcto en **Clave** y utiliza su plantilla: `assets/plantilla_quiz_20.svg` para 20 preguntas o `assets/plantilla_quiz_30.svg` para 30. Conserva visibles los cuatro marcadores. Si el formato de la tarjeta no coincide, Quiz no calificará y te pedirá cambiar la selección. No cambies la posición de las burbujas sin actualizar las coordenadas de lectura.

La lectura por color y el consenso multiframe son controles adicionales, no una garantía absoluta. Antes de registrar calificaciones oficiales, valida con tarjetas físicas reales y revisa las respuestas señaladas. Una toma inestable o una marca ambigua debe quedar pendiente, nunca resolverse por adivinación. El historial queda en el almacenamiento local del navegador; exporta periódicamente el CSV como respaldo.

## Privacidad

Las fotografías se procesan en el navegador y no se envían a un servidor. Los resultados se guardan localmente en el dispositivo. La aplicación publicada es pública, pero no almacena los registros de los estudiantes en GitHub.
