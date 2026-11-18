PLIEGO · GENERADOR DE EXÁMENES
================================

CONTENIDO
- index.html: aplicación principal.
- manifest.webmanifest: configuración de instalación PWA.
- sw.js: caché de archivos para funcionamiento sin conexión.
- assets/icon-192.png y assets/icon-512.png: iconos de instalación.
- assets/QUIZ-20-lengua-castellana-recuperacion-10.svg: diseño fuente de la tabla de 20 preguntas proporcionada.
- assets/QUIZ-30-lengua-castellana-recuperacion-10.svg: diseño fuente de la tabla de 30 preguntas proporcionada.
- MUESTRA_MATERIAL_BASE.txt: ejemplo de material para pegar.

USO
1. Descomprime el ZIP y publica todos los archivos en un sitio HTTPS (GitHub Pages, Netlify o un servidor institucional).
2. Abre la dirección en Chrome o Edge y selecciona Instalar aplicación.
3. Configura el encabezado; puedes añadir el escudo institucional.
4. Pega el banco completo. Numera los ítems (1., 2., 3.) y escribe cada opción en una línea como A), B), C) y D). No incluyas claves de respuesta.
5. Para lecturas compartidas, utiliza rótulos como LECTURA 1, TEXTO BASE o FRAGMENTO. PLIEGO conserva juntos los textos y sus preguntas asociadas.
6. En Generación e impresión selecciona 20 o 30 preguntas por examen. La opción predeterminada es 20. Si el banco tiene más preguntas que las seleccionadas, cada versión realiza su propio sorteo independiente.
7. Ajusta la cantidad de versiones y genera. Revisa la vista previa.
8. Selecciona Guardar PDF · Todas o Imprimir versión. En el diálogo del navegador elige Guardar como PDF, papel Carta, escala 100 %, márgenes Ninguno y gráficos de fondo activados.

TABLA DE RESPUESTAS QUIZ
- PLIEGO ofrece dos tamaños: 20 preguntas (predeterminado) y 30 preguntas.
- La tabla se integra debajo de las opciones de la última pregunta, dentro de esa misma columna. No se agrega una hoja separada ni se crea una página adicional exclusivamente para respuestas.
- Conserva dos subcolumnas de numeración y círculos A, B, C y D, además de los campos de nombre y curso y la identificación QUIZ.
- El tamaño está ajustado para lectura e impresión: la versión de 20 preguntas ocupa aproximadamente 2,03 pulgadas de alto (18,5 % de una página carta); la de 30, aproximadamente 2,64 pulgadas (24 %).
- La tabla está en blanco. PLIEGO no solicita claves, no marca respuestas correctas y no genera una clave docente.
- Los SVG proporcionados se conservan en assets como referencia del diseño. La tabla compacta se compone directamente en HTML para que pueda integrarse en la columna del examen.

MEZCLA Y SELECCIÓN
- Cada versión selecciona al azar la cantidad configurada (20 o 30) del banco disponible.
- Las versiones realizan sorteos independientes; las preguntas seleccionadas pueden variar entre versiones.
- También se reorganizan el orden de las preguntas y las opciones A-D, sin reescribir el contenido original.
- El banco debe contener al menos la cantidad elegida. Por ejemplo, si se seleccionan 20 preguntas, un banco de 25 es válido; si se seleccionan 30, se requieren al menos 30.

PRIVACIDAD Y DATOS
El material se procesa en el navegador y se guarda localmente en el dispositivo. No se envía a un servidor. La caché PWA permite volver a abrir la aplicación sin conexión después de la primera carga.

RECOMENDACIÓN DE IMPRESIÓN
Antes de reproducir un lote, imprime una versión de prueba y comprueba que los círculos de la tabla QUIZ sean visibles y que la tabla permanezca debajo de la última pregunta, en la misma columna. Usa papel Carta, escala 100 % y gráficos de fondo activados.