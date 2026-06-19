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
