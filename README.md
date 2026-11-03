# Tierra Bomba · Aula Ambiental

Aplicación tridimensional basada en el programa marco del arquitecto Alejandro Serrano Sierra para presentar la propuesta a ACOPI Bolívar.

Arquitecto líder: Alejandro Serrano Sierra.
Desarrollo de la propuesta y aplicación: Alejandra Gómez y Ana Casas.

## Experiencia

Toda la isla se representa mediante una malla tridimensional recortada con la máscara costera del archivo de tesis y deformada con elevaciones reales Terrain Tiles (Mapzen/AWS). Se incorpora la geometría Revit disponible, cuya cobertura corresponde al sector modelado, sin extender artificialmente edificios al resto de la isla. La base inferior es un soporte gráfico de exposición, no una representación de profundidad geológica.

La cámara permite orbitar, acercar, inclinar, recorrer sectores y regresar al encuadre completo. Satélite/Maqueta cambia el material de la misma geometría. La red funcional reproduce la jerarquía del PDF mediante planos en un espacio tridimensional; sus relaciones son conceptuales y no geográficas.

## Contenido

Cinco recorridos: isla, pilotos, arquitectura funcional del Aula, investigación y colaboración. Los paneles siguen la guía: propósito y problema, concepto, pregunta, objetivos, metodología, archivo/modelo digital, actores, productos e indicadores, financiación, ética, ruta y fases. Incluye seis líneas de investigación y fichas de pilotos candidatos.

Los registros de trabajo y aportes permanecen en este navegador. No se envían a ACOPI ni constituyen compromisos. Los pilotos exigen validación, revisión técnica, recursos y responsables de cuidado.

## Identidad

Branding de la tesis: Space Grotesk, JetBrains Mono, deepsea #113542, caribbean #0f766e y terracotta #c86d51. Logos oficiales de ACOPI Nacional y Pontificia Universidad Javeriana identifican al destinatario y al contexto académico; no acreditan patrocinio.

## Ejecutar y publicar

Sitio estático con módulos: python3 -m http.server 8000. Abrir http://localhost:8000. GitHub Pages: main, carpeta raíz. No requiere compilación. Archivos principales: index.html, experience.css, experience.js, territory-model.js, architecture-network.js y assets/programa-marco-v01.pdf.

Se requiere conexión para motores, fuentes, logos, imágenes, modelo y elevaciones. La aplicación no utiliza claves privadas. Three.js 0.160.1 y GLTFLoader. El visor usa WebGL cuando está disponible; si el navegador lo tiene deshabilitado, el mismo terreno y las edificaciones se proyectan y rasterizan por triángulos en Canvas 2D. Esa alternativa sigue usando geometría tridimensional, con menor detalle y rendimiento. La red usa CSS3DRenderer y cámara de Three.js.

## Fuentes

- Programa marco Aula Ambiental v0.1, 26 de octubre de 2026, adjunto en PDF.
- Cartografía, máscara costera y modelo: repositorio de tesis de la usuaria, https://github.com/alejagoguti-cpu/tesis. Textura sat_base, isla_mascara, mosaicos.json, tierrabomba_revit.glb y georef.json.
- Imágenes: Esri World Imagery, Maxar, Earthstar Geographics y comunidad GIS, según los créditos de la fuente.
- Relieve: Terrain Tiles, Mapzen/AWS Open Data. https://registry.opendata.aws/terrain-tiles/. Decodificación Terrarium: R*256 + G + B/256 - 32768 metros. No sustituye levantamiento topográfico.
- Sectores: OpenStreetMap nodos 703211058, 703210903, 703210904; GeoNames para Caño de Loro. Las referencias identifican poblados, no emplazamientos de pilotos.

## Verificación

node --check experience.js
node --check territory-model.js
node --check architecture-network.js

Revisar geometría insular, carga del modelo real, cambios de material y relieve, navegación, cinco recorridos, guía, fases, fichas, equipo, logos y PDF. El entorno de revisión tiene WebGL deshabilitado: se verifican la rasterización de geometría por software y la red CSS3D. La rama WebGL requiere revisión en un dispositivo con aceleración gráfica.
