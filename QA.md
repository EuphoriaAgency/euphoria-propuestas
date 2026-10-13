# Revisión antes de usar Propuestas con clientes

Este proyecto es independiente de Euphoria Producción, Contabilidad y del portal de briefs. Cada documento representa un periodo de propuesta, incluso para un cliente que ya trabaja con Euphoria.

## Prueba funcional

1. En `/admin`, crea una propuesta nueva. Debe estar vacía, sin datos de la Dra. Mabel.
2. Escribe el cliente, las fechas del periodo, la estrategia, un entregable y una pieza con fecha dentro de ese periodo. Guarda: sigue como borrador y no muestra enlace de cliente.
3. Publica. Abre `/p/{id}` en una ventana privada y en un celular. Debe mostrar únicamente esa propuesta y el calendario con sus fechas. El cierre conserva el texto, sin botón de confirmar.
4. Duplica la propuesta para el siguiente mes. Debe pasar a tipo «Ciclo mensual», incrementar el número y conservar cliente, giro, color y alcance. Periodo, enfoque, calendario y referencias quedan vacíos para evitar arrastrar información del mes anterior. El enlace anterior sigue mostrando el periodo anterior.
5. Completa y publica el segundo mes. Sus dos enlaces deben funcionar a la vez sin mezclarse.
6. Cambia los títulos de referencias, alcance y calendario. Comprueba que el cliente ve tus textos y que las secciones sin contenido no muestran tarjetas vacías. El cierre mensual es opcional. Una propuesta antigua de primera vez debe conservar su presentación original.
7. Prueba en una cuenta autorizada un MP4 H.264 de más de 80 MB y menos de 500 MB: la subida debe mostrar porcentaje, permitir cancelación y reproducirse en la vista previa tras guardar. Prueba también una imagen, un MOV (se abre como archivo), un enlace de Dropbox/Drive (se abre fuera) y un enlace YouTube/Vimeo (se reproduce integrado). Verifica el enlace publicado en un móvil y en una ventana privada. Si Storage rechaza la subida, registra el código que ahora muestra la interfaz y revisa bucket/reglas antes de enviar la propuesta.

## Comprobaciones del backend pendientes

- Confirmar el proyecto Firebase y las variables de Netlify para este sitio. No se verificaron en esta rama.
- Revisar reglas reales de Firestore y Storage: solamente los administradores autorizados deben crear, listar, editar o eliminar propuestas y subir archivos. Un visitante debe poder leer solamente una propuesta publicada. La comprobación `status` del navegador no sustituye esa regla.
- Verificar en Storage que las reglas del bucket permiten el tamaño y tipo deseados. El límite de 500 MB es del navegador; el servidor puede aplicar uno menor. El proyecto y el bucket de Netlify no se pueden confirmar con una compilación local.
- Comprobar con sesión anónima que leer un borrador por ID o consultar la colección `proposals` sin filtro sea denegado; consultar una publicación sí debe funcionar. Firestore evalúa las reglas sobre las consultas completas.
- Comprobar que `/admin` no permita gestionar propuestas a cualquier cuenta de Auth que exista en el proyecto. Hoy el componente de acceso acepta cualquier usuario autenticado; las reglas del servidor son el control indispensable.
- Verificar si se enviaron URLs antiguas con slug y sustituirlas por `/p/{id}` desde la lista administrativa. El acceso público ya no consulta por slug.
- Revisar si las propuestas deben incluir inversión, vigencia y guiones completos por pieza: la interfaz actual edita estrategia, entregables, referencias, calendario, tema y objetivo, pero no tiene campos específicos para esos datos.

No publicar a clientes hasta pasar las comprobaciones con Firebase real. Esta rama no contiene cambios en los otros sistemas ni reglas desplegadas.
