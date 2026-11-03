# Mapa vivo de Tierra Bomba

Componente de cartografía digital del programa Tierra Bomba, Aula Ambiental (sección 10 del programa marco, `assets/programa-marco-v01.pdf`). Pensado para que la gente de Bocachica y de la isla vea lo que se sabe del territorio, de dónde viene cada dato y lo que falta por contar.

Promotor académico: Arq. Alejandro Serrano Sierra, Programa de Arquitectura, Pontificia Universidad Javeriana. Desarrollo del mapa: Alejandra Gómez y Ana Casas.

## Secciones

- Mapa (`#`): modelo 3D de la isla con ocho temas (historia y patrimonio, escuelas y vida comunitaria, agua, mar y oficios, árboles y sombra, seres vivos, turismo y comercio, basuras y residuos). Cada punto abre una ficha con tipo de dato, fuente con enlace, fecha de consulta, tipo de ubicación y estado de revisión con la comunidad.
- Seres vivos (`#vivos`): red de relaciones entre las especies registradas en la isla (quién come a quién, quién visita qué flores, quién vive sobre quién).
- Cómo se hace (`#metodo`): niveles de desarrollo de cada tema (Tabla 7 del programa), tipos de dato, preguntas pendientes y fuentes.
- Contar algo (`#aportar`): formulario para recuerdos, datos que faltan o correcciones, con un punto marcado en el mapa. Se envía por WhatsApp o se copia; también queda guardado en el teléfono. Nada se publica sin revisarlo antes con quien lo cuenta.

## Datos (`assets/datos/`)

- `lugares.json`: 153 lugares de OpenStreetMap (API pública /map, 2026-11-03), clasificados por tema. © OpenStreetMap contributors, ODbL 1.0. Ninguno está verificado en campo; las inconsistencias detectadas se señalan en la ficha.
- `especies.json`: 436 taxones y 729 registros de iNaturalist (export observations-802940), tomados del repositorio anasoficasca-code/tierrabomba. Fotos en `assets/fotos/`, cada una con la licencia de su autor.
- `interacciones.json`: 1.051 relaciones entre 242 de esos taxones, obtenidas de la API de GloBI (Global Biotic Interactions) el 2026-11-03. Se descartaron las relaciones vagas (interactsWith, adjacentTo, coOccursWith). Están documentadas en estudios de otros lugares; no están observadas en la isla.
- `arboles.json`: 3.840 copas detectadas sobre imagen Esri World Imagery, solo en el sector del modelo Revit (archivo de tesis).
- `assets/construcciones_tierra_bomba.json.gz` y `assets/vias_tierra_bomba.json`: huellas de construcciones (alturas de referencia, no medidas) y vías de OSM.

## Ejecutar

Sitio estático: `python3 -m http.server 8000` y abrir http://localhost:8000. GitHub Pages: rama main, carpeta raíz. Three.js 0.160.1. Con WebGL usa el agua de la tesis; sin WebGL dibuja el mismo terreno por triángulos en Canvas 2D. El modelo Revit solo se descarga si se activa.

Archivos: `index.html`, `cartografia.css`, `cartografia.js`, `territory-model.js`, `sea-surface.js`.
