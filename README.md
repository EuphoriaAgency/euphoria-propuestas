# Euphoria Propuestas V3.7

Base: V3.5.

Ajustes finales:
- El color oscuro personalizado ahora se valida correctamente y también afecta el fondo/glow del hero.
- El header del hero vuelve al acomodo correcto: solo se eliminó “Propuesta privada”, sin subir demasiado la vertical.
- El calendario ya no muestra conteos por tipo desde JSON. Muestra total de días de publicación.
- Importar JSON de Euphoria OS ya no sobreescribe los entregables del paquete.

## Correr local

```bash
cd "$HOME/Desktop/euphoria-propuestas-v3-euphoria-v7"
npm install
npm run dev -- --port 5186
```

Abrir:

```bash
http://localhost:5186/admin
```


## V3.7

- Soporte para URL de imagen/video en el hero.
- Soporte para subir imagen/video a Firebase Storage cuando Firebase esté configurado.
- Las referencias visuales ahora aceptan imágenes JPG/PNG/WebP y videos MP4/WebM, además de YouTube/Vimeo.
- Si Firebase Storage no está configurado, pega una URL pública del archivo.

## Ciclos mensuales

Una propuesta nueva abre en «Ciclo mensual»: portada, enfoque, alcance, referencias y calendario, mostrando sólo las secciones que tienen contenido. La etiqueta de portada es libre; las fechas no se agregan a ella. El calendario deriva su rango de las piezas o del JSON importado, con ajuste manual opcional dentro de la sección. Los títulos de cada sección y el cierre se editan en `/admin`; el cierre puede dejarse vacío. El modo «Primera propuesta» conserva las secciones de estrategia y pilares.

«Duplicar» crea el ciclo siguiente para el mismo cliente y conserva su paleta y alcance. Limpia las fechas, el texto, las referencias y las piezas anteriores para que el enlace del ciclo previo siga siendo independiente.

El formulario acepta imágenes de hasta 20 MB y videos MP4, WebM o MOV de hasta 500 MB mediante subida reanudable con progreso. Sólo se sube un archivo a la vez; la interfaz muestra bytes y tiempo, y cancela si no hay avance durante 90 segundos. MP4 H.264 y WebM se intentan reproducir en la propuesta; MOV se abre como archivo. YouTube/Vimeo pueden reproducirse integrados mediante URL y Dropbox/Drive se abren por enlace. Firebase Storage debe estar configurado y permitir el archivo según sus reglas; consulta `QA.md` antes de usarlo con clientes.

En el preview de Netlify, el bucket configurado para `propuestas-euphoria` todavía responde 404 como inexistente. El editor muestra este problema antes de iniciar una subida. El límite de 500 MB no resuelve la ausencia del bucket; hasta que se cree y se prueben sus reglas, usa enlaces de videos alojados externamente.
