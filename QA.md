# Revisión antes de usar Propuestas con clientes

Este proyecto es independiente de Euphoria Producción, Contabilidad y del portal de briefs. Cada documento representa un periodo de propuesta, incluso para un cliente que ya trabaja con Euphoria.

## Prueba funcional

1. En `/admin`, crea una propuesta nueva. Debe estar vacía, sin datos de la Dra. Mabel.
2. Escribe cliente y etiqueta de portada (por ejemplo, «Ciclo 2 · noviembre»). Comprueba que no aparece «Preparado por Euphoria Agency» ni se agregan fechas a la etiqueta. Cambia la paleta; el color personalizado debe seguir funcionando.
3. Agrega una pieza con fecha. Sin llenar inicio/fin aparte, el calendario debe tomar las fechas de las piezas; sólo usa «Cambiar título y opciones» si quieres ampliar el rango. El enfoque, el alcance y las referencias aparecen en la vista previa al introducir contenido. El cierre puede quedar vacío.
4. Publica. Abre `/p/{id}` en una ventana privada y en un celular. Debe mostrar únicamente esa propuesta y el calendario con sus fechas. El cierre conserva el texto si lo escribiste, sin botón de confirmar.
5. Duplica la propuesta para el siguiente mes. Debe pasar a tipo «Ciclo mensual» y conservar cliente, giro, color y alcance. La etiqueta, el periodo, el enfoque, el calendario y las referencias quedan vacíos para evitar arrastrar información del mes anterior. El enlace anterior sigue mostrando el periodo anterior.
6. Completa y publica el segundo mes. Sus dos enlaces deben funcionar a la vez sin mezclarse.
7. Cambia los títulos de referencias, alcance y calendario desde «Cambiar título y opciones». Comprueba que el cliente ve tus textos y que las secciones sin contenido no muestran tarjetas vacías. Una propuesta antigua de primera vez debe conservar su presentación original.
8. Después de activar Storage y sus reglas, prueba con una sola cuenta autorizada un MP4 H.264 de más de 80 MB y menos de 500 MB: la subida debe mostrar bytes y porcentaje, permitir cancelación y reproducirse en la vista previa tras guardar. Durante esa subida, la selección de un segundo archivo queda deshabilitada. Si pasan 15 segundos en 0 B, se muestra advertencia; tras 90 segundos sin ningún avance se cancela con `storage/stalled`. Prueba también una imagen, un MOV (se abre como archivo), un enlace de Dropbox/Drive (se abre fuera) y un enlace YouTube/Vimeo (se reproduce integrado). Si Storage rechaza la subida, registra el código y revisa bucket/reglas antes de enviar la propuesta.

## Comprobaciones del backend pendientes

- La compilación publicada en el preview de Netlify apunta a Firebase `propuestas-euphoria` y al bucket `propuestas-euphoria.firebasestorage.app`. Una consulta de sólo lectura a la API de Cloud Storage respondió HTTP 404, «The specified bucket does not exist». Se debe crear Cloud Storage en ese proyecto, comprobar el nombre asignado y actualizar `VITE_FIREBASE_STORAGE_BUCKET` de Netlify si cambia. La pantalla del editor alerta y bloquea nuevas cargas mientras confirme ese 404. Antes de activar Storage, se pueden usar URLs de video ya alojadas en otro servicio.
- Revisar reglas reales de Firestore y Storage: solamente los administradores autorizados deben crear, listar, editar o eliminar propuestas y subir archivos. Un visitante debe poder leer solamente una propuesta publicada. La comprobación `status` del navegador no sustituye esa regla.
- Verificar en Storage que las reglas del bucket permiten el tamaño y tipo deseados. El límite de 500 MB es del navegador; el servidor puede aplicar uno menor. Una vez creado el bucket, probar la subida con la sesión autorizada y la lectura del archivo desde el enlace público.
- Comprobar con sesión anónima que leer un borrador por ID o consultar la colección `proposals` sin filtro sea denegado; consultar una publicación sí debe funcionar. Firestore evalúa las reglas sobre las consultas completas.
- Comprobar que `/admin` no permita gestionar propuestas a cualquier cuenta de Auth que exista en el proyecto. Hoy el componente de acceso acepta cualquier usuario autenticado; las reglas del servidor son el control indispensable.
- Verificar si se enviaron URLs antiguas con slug y sustituirlas por `/p/{id}` desde la lista administrativa. El acceso público ya no consulta por slug.
- Revisar si las propuestas deben incluir inversión, vigencia y guiones completos por pieza: la interfaz actual edita estrategia, entregables, referencias, calendario, tema y objetivo, pero no tiene campos específicos para esos datos.

No publicar a clientes hasta pasar las comprobaciones con Firebase real. Esta rama no contiene cambios en los otros sistemas ni reglas desplegadas.
