# Revisión antes de usar Propuestas con clientes

Este proyecto es independiente de Euphoria Producción, Contabilidad y del portal de briefs. Cada documento representa un periodo de propuesta, incluso para un cliente que ya trabaja con Euphoria.

## Prueba funcional

1. En `/admin`, crea una propuesta nueva. Debe estar vacía, sin datos de la Dra. Mabel.
2. Escribe el cliente, las fechas del periodo, la estrategia, un entregable y una pieza con fecha dentro de ese periodo. Guarda: sigue como borrador y no muestra enlace de cliente.
3. Publica. Abre `/p/{id}` en una ventana privada y en un celular. Debe mostrar únicamente esa propuesta y el calendario con sus fechas. El cierre conserva el texto, sin botón de confirmar.
4. Duplica la propuesta para el siguiente mes. Conserva el cliente y la estrategia; el periodo y las piezas quedan vacíos. El enlace anterior sigue mostrando el periodo anterior.
5. Completa y publica el segundo mes. Sus dos enlaces deben funcionar a la vez sin mezclarse.
6. Prueba visuales subidos, referencias externas, calendario de seis semanas y lectura móvil. Si no hay URL de visual, comprueba que no aparece información inventada de otra marca.

## Comprobaciones del backend pendientes

- Confirmar el proyecto Firebase y las variables de Netlify para este sitio. No se verificaron en esta rama.
- Revisar reglas reales de Firestore y Storage: solamente los administradores autorizados deben crear, listar, editar o eliminar propuestas y subir archivos. Un visitante debe poder leer solamente una propuesta publicada. La comprobación `status` del navegador no sustituye esa regla.
- Comprobar con sesión anónima que leer un borrador por ID o consultar la colección `proposals` sin filtro sea denegado; consultar una publicación sí debe funcionar. Firestore evalúa las reglas sobre las consultas completas.
- Comprobar que `/admin` no permita gestionar propuestas a cualquier cuenta de Auth que exista en el proyecto. Hoy el componente de acceso acepta cualquier usuario autenticado; las reglas del servidor son el control indispensable.
- Verificar si se enviaron URLs antiguas con slug y sustituirlas por `/p/{id}` desde la lista administrativa. El acceso público ya no consulta por slug.
- Revisar si las propuestas deben incluir inversión, vigencia y guiones completos por pieza: la interfaz actual edita estrategia, entregables, referencias, calendario, tema y objetivo, pero no tiene campos específicos para esos datos.

No publicar a clientes hasta pasar las comprobaciones con Firebase real. Esta rama no contiene cambios en los otros sistemas ni reglas desplegadas.
