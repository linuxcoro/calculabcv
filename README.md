# Calculadora de Pago Móvil · Tasas BCV

Aplicación de **una sola página** (`index.html`, sin dependencias ni CDN) que
muestra las tasas oficiales del **BCV** para el **dólar (USD)** y el **euro
(EUR)** y calcula operaciones con conversión a bolívares.

Repositorio: <https://github.com/linuxcoro/calculabcv> · **sin GitHub Pages**;
la app se ejecuta en tu equipo con el servidor local.

## Abrir la app

```bash
cd calculabcv
python3 -m http.server 8000
# luego abre http://localhost:8000/index.html
```

También se puede abrir `index.html` directamente, pero conviene usar el
servidor local para que la consulta de tasas funcione igual en todos los
navegadores.

## Tasas BCV

La app descarga `tasas.json` del repositorio `linuxcoro/bcv_scraper` con la API
de contenidos de GitHub:

```text
https://api.github.com/repos/linuxcoro/bcv_scraper/contents/tasas.json?ref=main
```

Como `linuxcoro/bcv_scraper` es **privado**, hace falta un PAT *fine-grained*
con permiso **Contents: Read-only** sobre ese repositorio (el secreto
`BCV_TASAS_PAT`). Una página web **no puede leer secretos de GitHub**, así que
el token se pega una vez en **Ajustes** y queda guardado solo en el
`localStorage` de ese navegador. Nunca se sube al repositorio.

### Crear el PAT (pasos)

1. Abre <https://github.com/settings/personal-access-tokens/new>.
2. **Resource owner**: `linuxcoro`.
3. **Repository access** → *Only select repositories* → `linuxcoro/bcv_scraper`.
4. **Repository permissions → Contents: Read-only** (Metadata queda en lectura
   automática; no hace falta nada más).
5. **Generate token** y copia el valor `github_pat_…` (solo se muestra una vez).
6. Abre la app con el servidor local, toca el engranaje **Ajustes**, pega el
   token en *Token de GitHub (PAT)* y pulsa **Guardar**. El estado debe quedar
   en verde: «Tasas BCV cargadas».

> El secreto `BCV_TASAS_PAT` del repositorio **no se puede leer de vuelta**
> desde GitHub: hay que usar el valor guardado al crearlo o generar un PAT
> nuevo con estos pasos.

> Si abres la app desde otro puerto u origen, `localStorage` es distinto y
> tendrás que pegar el token otra vez. Usa siempre el mismo origen, por
> ejemplo `http://localhost:8000`.

Sin token, la app intenta la URL pública de `raw.githubusercontent.com` y, si
tampoco hay red, usa la cadena de respaldo:

**tasas de GitHub → últimas tasas guardadas → tasas manuales de Ajustes.**

El Ajustes también permite borrar las tasas guardadas.

## Seguridad

- No se escribe ningún PAT en el repositorio; el único marcador es
  `__RATES_PAT__`.
- El token se guarda en `localStorage`, nunca se registra en consola ni se
  envía a otro sitio que no sea `api.github.com`.
- Si algún día publicas la app con el PAT inyectado en el HTML, cualquiera
  podría leerlo. Para producción conviene hacer público `tasas.json` o usar un
  intermediario que guarde el token en el servidor.

## Uso

- El teclado de la app inserta en la posición del cursor.
- `⌫` borra, `C` limpia (rojo), `=` recalcula (verde) y oculta el teclado del
  móvil.
- El resultado se muestra en `$/€` y debajo en bolívares
  (`En bolívares: Bs …`) con la tasa BCV de la moneda elegida.
- Toca la tarjeta **Dólar** o **Euro** para cambiar la moneda y la tasa.
- Con teclado físico: `Enter` calcula, `Esc` limpia; también se puede escribir
  `*`, `/`, `-` y paréntesis directamente.

## Pruebas

```bash
node --test tests/calculadora.test.mjs
```

Las pruebas extraen el núcleo de cálculo de `index.html` y validan
operaciones, errores, formato `es-VE`, normalización de tasas, conversión y
guardas del archivo (sin `eval`, sin PAT, orden del teclado).

## Estructura

```text
calculabcv/
├── index.html                 # app completa (HTML + CSS + JS)
├── PLAN.md                    # plan por pasos y criterios de aceptación
├── README.md                  # este documento
└── tests/
    └── calculadora.test.mjs   # pruebas con node --test
```

## Actualización de tasas

No hace falta que esta app actualice nada: el workflow del repositorio
`bcv_scraper` regenera `tasas.json` cada hora en GitHub. Usa **Actualizar**
para volver a consultarlo.
