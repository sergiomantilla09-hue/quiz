# PLIEGO integrado en QUIZ

Abre **Montar examen** desde la PWA QUIZ. Los cuatro apartados superiores permiten editar el encabezado, analizar el material, revisar las preguntas y generar las versiones.

Las preguntas abiertas se agregan después de las 20 o 30 de selección múltiple. **Claves de respuesta · Original** permite registrar la clave antes o después de generar. **Preparar claves en QUIZ** transfiere las cinco versiones al lector y activa el formato correcto para la cámara.

El proyecto se guarda en este navegador y puede exportarse o importarse como archivo. Los PDF del examen y de las tablas se descargan por separado. El lector y PLIEGO quedan disponibles sin conexión después de la primera carga de la PWA.

La PWA se publica en [GitHub Pages](https://sergiomantilla09-hue.github.io/quiz/) desde la rama `main`. Los bancos y resultados permanecen en el dispositivo; no se envían a GitHub.

Para comprobar esta integración desde la raíz del repositorio: `node tests/validate-quiz.js`, `node pliego/tests/validate-pliego.mjs` y `node tests/verify-pwa.cjs` con Playwright instalado.
