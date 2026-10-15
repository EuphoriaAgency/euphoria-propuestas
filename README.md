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

El formulario acepta imágenes de hasta 20 MB y videos MP4, WebM o MOV de hasta 500 MB mediante subida reanudable con progreso. Sólo se sube un archivo a la vez; la interfaz muestra bytes y tiempo, y cancela si no hay avance durante 90 segundos. La comprobación informativa del bucket se realiza al abrir el editor; cada subida validada empieza directamente con el SDK, sin repetir una petición pública que podía añadir hasta 10 segundos de espera. La transferencia de videos grandes sigue dependiendo del tamaño y de la velocidad de subida de la conexión. MP4 H.264 y WebM se intentan reproducir en la propuesta; MOV se abre como archivo. YouTube/Vimeo pueden reproducirse integrados mediante URL y Dropbox/Drive se abren por enlace. Firebase Storage debe estar configurado y permitir el archivo según sus reglas; consulta `QA.md` antes de usarlo con clientes.

El bucket `propuestas-euphoria.firebasestorage.app` se creó en `US-CENTRAL1` el 13 de octubre de 2026. Ese mismo día se publicaron `firestore.rules` y `storage.rules` en Firebase `propuestas-euphoria`, tras probarlas en emuladores. El acceso al panel con una cuenta autorizada y el bloqueo de un borrador anónimo se comprobaron en el preview; el usuario confirmó la subida de una imagen y un video. La reproducción del video y la lectura de una propuesta publicada todavía requieren QA. Los enlaces de descarga de Firebase son compartibles y duran hasta revocarse: no subas material que deba seguir siendo privado después de compartir el enlace.

## Planificar el ciclo y pasar su primer calendario a Producción

En `/admin`, abre una propuesta mensual, indica el inicio y fin del calendario y captura cantidades de reels, posts/carruseles, fotos, UGC y promocionales. «Generar calendario» añade las piezas que falten sin borrar temas ya escritos. «Reacomodar fechas» cambia solamente los días, conservando títulos y guiones. En «Guiones y estructuras» escribe el tema y el texto de cada video; el cliente verá una lista desplegable antes del calendario, con su fecha real de publicación.

«Exportar a Producción» descarga un JSON `euphoria_proposal_calendar_v1` con las piezas y el periodo; en la ficha del mismo cliente de Euphoria Producción abre «Importar desde Propuestas». Los dos periodos deben coincidir y el ciclo de Producción debe estar vacío. La importación crea nuevas tareas en estado inicial, sin enlaces ni aprobaciones; las fechas, temas y guiones pasan a la copia operativa. No existe sincronización posterior: los cambios de último momento en Producción no modifican la propuesta y volver a importar no reemplaza piezas trabajadas.
