# PLIEGO · Generador de exámenes

PWA para preparar versiones aleatorias de evaluaciones tipo selección múltiple y producir documentos imprimibles tamaño carta.

## Funciones
- Importa un banco pegado desde texto.
- Conserva lecturas y materiales compartidos junto a las preguntas asociadas.
- Selecciona aleatoriamente la cantidad configurada (20 o 30) para cada versión; cada versión realiza un sorteo independiente.
- Mezcla el orden de preguntas y opciones sin reescribir sus enunciados.
- Encabezado editable, revisión del material y vista previa.
- Composición en una o dos columnas, sin separación vertical artificial entre preguntas y con texto justificado.
- Integra el SVG original de QUIZ de 20 o 30 preguntas al terminar las preguntas, en la misma columna.
- Guarda el borrador localmente; no envía el banco a un servidor.

## Ejecución y publicación
La carpeta se publica como `/pliego/` dentro del repositorio `sergiomantilla09-hue/quiz`. La URL de GitHub Pages es:

https://sergiomantilla09-hue.github.io/quiz/pliego/

El manifest y el service worker usan rutas relativas para funcionar dentro de esa subcarpeta.

## Validación
Desde la raíz de esta carpeta:

```bash
node tests/validate-pliego.mjs
node --check sw.js
```

## SIGA
La integración aún no está conectada. Consulta [docs/INTEGRACION_SIGA.md](docs/INTEGRACION_SIGA.md). No se incluyen credenciales ni secretos en esta PWA pública.