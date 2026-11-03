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


## Construcciones y relato de presentación

Se incorpora assets/construcciones_tierra_bomba.json.gz: 2.600 huellas únicas del archivo de tesis, recortadas por su máscara insular; se eliminaron 128 registros repetidos. No se presenta como censo completo de todas las construcciones. La inversión del sistema de coordenadas se contrastó contra la proyección del archivo, con error máximo por redondeo inferior a 0,01 m en una muestra de 100 vértices.

Las alturas de contexto son las estimadas por el script de la fuente (4 y 7 metros), no alturas de levantamiento. No se derivan ni afirman alturas reales de las casas. La interfaz lo indica junto al control de capa y en la ficha de contexto. El modelo Revit suministrado se conserva como capa separada, desactivada inicialmente para evitar superposición de representaciones.

El modo Presentar propuesta organiza nueve pasos: territorio, problema de conocimiento disperso, memorias, arquitectura del Aula, seis líneas, piloto escolar candidato, método y evaluación, articulación con ACOPI y decisión de siguiente paso. Cada paso cambia el encuadre, formula una idea y una pregunta, y enlaza con el fundamento del PDF. Los créditos aparecen en el inicio y en Equipo.


## Agua y vías
El mar reutiliza `textures/water_normals_fine.jpg` y los parámetros de `src/utils/caribeWater.js` de la tesis: Water de Three.js, cielo físico, color #1ea4c8, reflejos, distorsión 2.4 y animación. En dispositivos sin WebGL se usan las mismas normales y la textura fotográfica `assets/textura_agua2.jpg` de la tesis para un mar en perspectiva, anclado al mundo.

`assets/vias_tierra_bomba.json` conserva 305 ways de OpenStreetMap en 306 tramos recortados por la máscara insular, consultados el 2026-11-03 mediante la API pública /map. © OpenStreetMap contributors, ODbL 1.0: https://www.openstreetmap.org/copyright. No es un inventario vial levantado; los grosores de representación no son anchos medidos. Control Vías activado inicialmente.


## Historia y diagnóstico territorial
Se añaden las vistas Historia y Diagnóstico, conservando los controles 3D y el enlace externo C / Especies. El atlas contiene seis láminas originales del repositorio de tesis, con ampliación, arrastre y comparación documental junto a la isla. La comparación no está georreferenciada y no mide cambios costeros. Las fechas de los capítulos corresponden a hechos históricos citados; no se presentan como fecha de elaboración de cada lámina. Fuentes de los hechos: Escuela Taller/Fortificaciones Cartagena, diario de Eslava (Banco de la República), antecedentes de Caño del Oro (ANT, 2017) y memoria gastronómica (UNAD, 2023).

El diagnóstico contiene seis lecturas: costa, agua, vegetación, sombra, residuos y patrimonio. Cada una centra la cámara 3D y ofrece un recorte óptico georreferenciado. Se cargan mosaicos del servicio Esri World Imagery (z16 o z17) y se conserva el mosaico de archivo si el servicio falla. Fechas de adquisición no disponibles: no se presentan como una escena fechada ni como prueba de cambios temporales. Se incluyen registros fotográficos del archivo cuando están disponibles, sin asignarles fecha ni estado actual. No se simulan NDVI, NDWI, LST, concentraciones de mercurio, botaderos o categorías de riesgo mediante filtros de color. El visor explica qué se puede observar y qué requiere datos o medición adicional.


## Equipamientos y movilidad · 2026-11-03

`movilidad.html` abre una exploración del modelo 3D con búsqueda, filtros, fichas de fuente, navegación de cámara y recorridos animados. Incluye cinco puntos escolares de OpenStreetMap, cuatro centros de salud y cuatro iglesias documentados por sector, y dos referencias de embarque desde Cartagena. Es un inventario parcial. Las referencias de sector y la zona de embarque aproximada tienen símbolos discontinuos; no representan edificios levantados.

Las tres rutas terrestres se calcularon por continuidad de aristas sobre `assets/vias_tierra_bomba.json`. Cada segmento conserva su geometría OSM; el archivo de datos identifica los ways y los desfases de los extremos respecto de los poblados. Su representación en moto no certifica acceso motorizado ni transitabilidad. Las dos conexiones marítimas son trazados esquemáticos basados en destinos documentados, sin derrotas ni horarios. Los agentes se interpolan por longitud sobre cada polilínea, con ida y vuelta, pausa, velocidad gráfica y visibilidad por modo. No se usan aforos, GPS ni datos personales.

Fuentes consultadas: OpenStreetMap API 0.6 (2026-11-03); directorio de centros de salud de ESE Hospital Local Cartagena de Indias; Plan Pastoral Arquidiocesano 2016–2026; colegio Gimnasio Cristiano de Bocachica; Colombia Travel y operador Namasté para conexiones marítimas. Los enlaces de procedencia se conservan en `assets/equipamientos-movilidad.json` y en cada ficha. No se presentan los puestos de salud como hospitales de alta complejidad.
