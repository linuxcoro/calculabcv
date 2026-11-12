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

La app lee `tasas.json` **publicado en este mismo repositorio**:

```text
https://raw.githubusercontent.com/linuxcoro/calculabcv/main/tasas.json
```

El workflow [`.github/workflows/actualizar-tasas.yml`](.github/workflows/actualizar-tasas.yml)
copia ese archivo desde el repositorio privado `linuxcoro/bcv_scraper` usando
el secreto `BCV_TASAS_PAT`, y lo commitea solo si cambió. Corre **cada hora**
(minuto 20) y también a mano desde **Actions → Actualizar tasas BCV → Run
workflow**.

Así la app **no necesita ningún PAT en el navegador**: el token vive en el
secreto de GitHub y solo lo usa el workflow. La copia es pública porque el
repositorio es público (las tasas del BCV son datos oficiales).

### Requisito del workflow

En **Settings → Actions → General → Workflow permissions** debe estar
habilitado **Read and write permissions**, para que el workflow pueda commitear
`tasas.json`. El workflow ya declara `permissions: contents: write`.

### PAT opcional en la app

Si la copia pública todavía no existe (por ejemplo antes del primer run del
workflow), la app intenta la API de contenidos de `bcv_scraper` con el PAT de
**Ajustes** y, si no hay, usa la caché o las tasas manuales.

Para configurarlo: engranaje **Ajustes** → pega un PAT *fine-grained* con
**Contents: Read-only** sobre `linuxcoro/bcv_scraper` → **Guardar**. Se guarda
solo en el `localStorage` de ese navegador. El secreto de GitHub no se puede
leer de vuelta; si no tienes el valor, genera uno nuevo en
<https://github.com/settings/personal-access-tokens/new>.

Cadena de respaldo:

**copia pública en este repo → API de `bcv_scraper` con PAT → últimas tasas
guardadas → tasas manuales de Ajustes.**

El Ajustes también permite borrar las tasas guardadas.

## Seguridad

- La app no contiene ningún PAT y el repositorio tampoco: el token vive en el
  secreto `BCV_TASAS_PAT` y solo lo usa GitHub Actions.
- El PAT opcional de Ajustes se guarda en `localStorage`, nunca se registra en
  consola ni se envía a otro sitio que no sea `api.github.com`.
- La copia publicada de `tasas.json` es pública porque contiene solo las tasas
  oficiales del BCV; no incluye datos personales.
- El marcador `__RATES_PAT__` sigue disponible para inyección en despliegues
  personales, pero no es necesario para el uso normal.

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
├── .github/
│   └── workflows/
│       └── actualizar-tasas.yml # publica tasas.json cada hora
├── index.html                   # app completa (HTML + CSS + JS)
├── PLAN.md                      # plan por pasos y criterios de aceptación
├── README.md                    # este documento
├── tasas.json                   # copia pública generada por el workflow
└── tests/
    └── calculadora.test.mjs     # pruebas con node --test
```

## Actualización de tasas

El workflow de este repositorio copia `tasas.json` desde `bcv_scraper` cada
hora (minuto 20) y lo commitea si cambió. También se puede lanzar a mano en
**Actions → Actualizar tasas BCV → Run workflow**.

La app lo toma al recargar o al pulsar **Actualizar**. Si el workflow falla
(PAT vencido, sin acceso a `bcv_scraper` o permisos de escritura
deshabilitados), se conserva la última copia buena y la app sigue funcionando
con esa caché.

Para diagnosticar el PAT, el workflow falla con HTTP `401`/`404` si el token no
sirve o no tiene acceso al repositorio privado.
