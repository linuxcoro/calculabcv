# Plan de implementación · Calculadora de Pago Móvil (BCV)

Implementación terminada y publicada el **12/11/2026** en
<https://github.com/linuxcoro/calculabcv>, **sin GitHub Pages** (se ejecuta
localmente con el servidor de Python).

## 1. Objetivo

App de **una sola página** (`index.html` con HTML, CSS y JavaScript embebidos,
sin CDN ni dependencias) que:

1. Muestra las tasas oficiales del **BCV** de **dólar (USD)** y **euro (EUR)**
   obtenidas del repositorio `linuxcoro/bcv_scraper` por la API de GitHub.
2. Calcula operaciones como `3+10-3` con el teclado solicitado:

   ```text
   [ C ] [ ⌫ ] [ ( ] [ ) ]
   [ 7 ] [ 8 ] [ 9 ] [ ÷ ]
   [ 4 ] [ 5 ] [ 6 ] [ × ]
   [ 1 ] [ 2 ] [ 3 ] [ − ]
   [ 0 ] [ , ] [ + ] [ = ]
   ```

3. Inserta dígitos `0-9` y la **coma decimal en la posición del cursor**;
   `⌫` borra, `C` limpia (rojo), `=` recalcula (verde) y **oculta el teclado
   del móvil**.
4. Muestra el resultado en `$/€` y debajo **`En bolívares: Bs …`** con la tasa
   BCV de la moneda elegida.

## 2. Decisiones de diseño

- **Sin CDN ni framework**: el archivo funciona sin internet (salvo la
  consulta de tasas) y no depende de Tailwind, Lucide ni fuentes externas.
- **Moneda seleccionable**: las tarjetas Dólar y Euro eligen la moneda y la
  tasa; el resultado cambia de `$` a `€` y la línea de bolívares se recalcula.
- **Tasa exacta**: la conversión usa el número exacto del JSON
  (`897.5383`, `1001.18602288`), no el valor redondeado que se muestra.
- **Resultado en vivo**: el valor y la conversión a bolívares se recalculan en
  cada edición (teclado en pantalla o físico); `=` solo confirma y oculta el
  teclado. Las expresiones incompletas muestran `—` sin error en vivo.
- **PAT fuera de la interfaz**: un secreto de GitHub no se puede leer desde una
  página web. El workflow `actualizar-tasas.yml` usa `BCV_TASAS_PAT` para
  publicar `tasas.json` en este repo; la app solo lee esa copia pública, sin
  campos de token ni Ajustes.
- **Sin ajustes en la interfaz**: se quitaron el botón y el diálogo de Ajustes
  junto con el campo de PAT, las tasas manuales y el borrado de caché.
- **Cadena de respaldo**: copia pública del repo → últimas tasas guardadas en
  `localStorage` → aviso con el botón Actualizar.
- **Cálculo seguro**: parser recursivo propio; nunca `eval` ni `new Function`.

## 3. Estructura entregada

```text
calculabcv/
├── .github/workflows/
│   ├── actualizar-tasas.yml   # publica tasas.json cada hora
│   └── build-apk.yml          # compila el APK de Android
├── capacitor.config.json      # appId, appName y webDir de Capacitor
├── index.html                 # app completa (HTML + CSS + JS)
├── PLAN.md                    # este plan
├── README.md                  # uso, workflows y pruebas
├── tasas.json                 # copia pública (la genera el workflow)
└── tests/
    └── calculadora.test.mjs   # pruebas con node --test
```

## 4. Pasos

- [x] **Paso 1 · Documento de plan.**
- [x] **Paso 2 · Esqueleto HTML + CSS.**
  Tema claro/oscuro automático, layout móvil primero (máx. 560 px, *safe
  areas*), tarjetas de tasas, panel de calculadora y teclado 4×5.
- [x] **Paso 3 · Núcleo de cálculo puro.**
  `CalculadoraCore`: tokenizador con coma decimal, parser recursivo
  (`+ − × ÷`, paréntesis, signos unarios), mensajes de error en español,
  formato `es-VE`, normalización de tasas y conversión a bolívares.
- [x] **Paso 4 · Teclado y UX.**
  Inserción en la posición del cursor conservando el foco, coma única por
  número, `⌫`, `C`, `=` con `blur()` para ocultar el teclado móvil, `Enter`
  y `Escape` en teclado físico, accesibilidad (`aria-live`, etiquetas).
- [x] **Paso 5 · Módulo de tasas BCV.**
  Descarga de la copia pública de `tasas.json` con timeout de 10 s y caché en
  `localStorage`; mensajes para 404, sin red y JSON inválido.
- [x] **Paso 6 · Persistencia y moneda.**
  Claves `calculabcv_tasas` y `calculabcv_moneda`; sin diálogo de ajustes ni
  credenciales en la interfaz.
- [x] **Paso 7 · Pruebas y verificación.**
  `node --test tests/calculadora.test.mjs` (7/7) y prueba de interacción en
  Chrome headless (11/11): cálculo, bolívares, foco, cursor, `C`, `⌫`, coma y
  cambio a euro. Captura de pantalla revisada a 390×900.
- [x] **Paso 8 · README y git local.**
  Commit inicial solo con los cuatro archivos del proyecto; **sin token**.
- [x] **Paso 9 · Repositorio creado y código publicado.**
  <https://github.com/linuxcoro/calculabcv> · sin GitHub Pages.
- [x] **Paso 10 · Actualización automática de tasas.**
  Workflow `.github/workflows/actualizar-tasas.yml` que usa el secreto
  `BCV_TASAS_PAT`, publica `tasas.json` cada hora y la app lee esa copia
  pública sin PAT. Primer run verificado en verde.
- [x] **Paso 11 · Valores en vivo.**
  `actualizarEnVivo()` recalcula resultado y bolívares en cada edición; `=`
  conserva su función. Anuncio accesible con retardo de 500 ms. Verificado en
  Chrome headless (18/18).
- [x] **Paso 12 · APK de Android.**
  Workflow `.github/workflows/build-apk.yml` con Capacitor 8 que compila la
  app y publica `calculabcv-apk` como artefacto del run. Sin PAT ni secretos
  dentro del APK; los commits de `tasas.json` no disparan builds.

## 5. Contrato de datos

`tasas.json` (documentado en el repositorio hermano `finanbcv`):

```json
{
  "usd": 897.5383,
  "eur": 1001.18602288,
  "usd_bs": "897,54",
  "eur_bs": "1.001,19",
  "usd_exacta": "897,53830000",
  "eur_exacta": "1.001,18602288",
  "fecha_valor": "2026-11-09",
  "fecha_valor_texto": "Lunes, 09 Noviembre 2026",
  "fuente": "https://www.bcv.org.ve/glosario/cambio-oficial",
  "obtenido_en": "2026-11-08T14:55:47-04:00",
  "actualizado_texto": "08/11/2026 14:55:47"
}
```

- Se toleran campos faltantes: `usd_bs`, `eur_bs` y las tasas exactas se
  derivan de `usd` y `eur`.
- Se rechaza el JSON si `usd` o `eur` no son números mayores que 0.

## 6. Casos borde cubiertos

| Caso | Comportamiento |
|---|---|
| Sin copia publicada y sin caché | Aviso; la calculadora muestra `Bs —` hasta que haya tasas. |
| `tasas.json` 404 / JSON dañado | Error claro; se usa la caché si existe. |
| Sin internet | Últimas tasas guardadas con aviso. |
| Expresión incompleta o paréntesis | Error en la línea de resultado, texto intacto. |
| División entre 0 | «No se puede dividir entre 0». |
| Coma repetida o inicial | Se ignora la segunda coma; `0,` automático. |
| Cambio de moneda con resultado | Se recalcula la línea en bolívares. |
| `=` con teclado móvil abierto | `blur()` oculta el teclado. |
| `localStorage` bloqueado | La app funciona en memoria. |

## 7. Verificación ejecutada

```bash
node --test tests/calculadora.test.mjs     # 7/7 OK
```

Además, prueba real en Chrome headless con clics y teclado, **sin PAT y sin
caché**, contra la copia pública (18/18):

- En vivo: `3`+`0` → `30,00` y bolívares sin pulsar `=`; `+` → `—` sin error;
  `5` → `35,00`; `=` conserva el valor y quita el foco; `C` limpia.
- Teclado físico: `1,5` vía evento `input` → `1,50`; anuncio accesible a los
  700 ms; cambio a euro recalcula símbolo, tasa y bolívares.
- Inválido (`3+4a`) → `—` silencioso; `=` muestra el error en rojo.
- Sin botón Ajustes, sin diálogo y sin campo de token.
- Workflow run
  [#43241624437](https://github.com/linuxcoro/calculabcv/actions/runs/43241624437)
  en verde; `tasas.json` público verificado (USD 904,4485 / EUR 1003,49465523,
  fecha valor 12/11/2026).

Además, el workflow **Build APK** compila con Capacitor 8 y publica el
artefacto `calculabcv-apk`: run
[#43249663725](https://github.com/linuxcoro/calculabcv/actions/runs/43249663725)
en verde (14/14 pasos), APK de 3,7 MB verificado (app dentro, paquete
`com.linuxcoro.calculabcv` y permiso `INTERNET`, sin PAT).

La captura revisada (`.preview.png`, solo verificación local) muestra el
layout final a 390×900 con las tasas reales y sin Ajustes.

## 8. Criterios de aceptación

- [x] `index.html` autocontenido, sin CDN; abre con `python3 -m http.server`.
- [x] Teclado exacto `C ⌫ ( )` / `7 8 9 ÷` / `4 5 6 ×` / `1 2 3 −` /
      `0 , + =`, con `C` rojo y `=` verde, botones ≥ 48 px.
- [x] Dígitos y coma en el cursor; `⌫` y `C` correctos; `=` recalcula y
      oculta el teclado.
- [x] Resultado `$/€` y `En bolívares: Bs …` con la tasa BCV de la moneda.
- [x] Resultado y bolívares se actualizan en vivo en cada edición, sin pulsar
      `=`.
- [x] `=` confirma, muestra errores y oculta el teclado; las incompletas no
      muestran error en vivo.
- [x] Tasas de USD/EUR con fecha valor, actualización y respaldo sin red.
- [x] Interfaz sin Ajustes ni campos de token; ningún secreto en el archivo.
- [x] `tasas.json` público actualizado por el workflow y leído por la app.
- [x] Pruebas automatizadas en verde.
- [x] Repositorio creado y código publicado:
      <https://github.com/linuxcoro/calculabcv>.
- [x] Workflow `build-apk.yml` compila el APK debug y publica el artefacto
      `calculabcv-apk`.
- [x] APK verificado: app dentro, paquete `com.linuxcoro.calculabcv` y permiso
      `INTERNET`; sin PAT ni secretos.

## 9. Seguridad

- El PAT **no** se escribe en el repositorio ni en el HTML: vive en el secreto
  `BCV_TASAS_PAT` y solo lo usa el workflow.
- La app no tiene campos de token ni ajustes: solo descarga el JSON público.
- La copia pública de `tasas.json` contiene solo tasas oficiales del BCV, sin
  datos personales.

## 10. Estado final

- [x] Repositorio público: <https://github.com/linuxcoro/calculabcv>.
- [x] Sin GitHub Pages: la app se abre en local con `python3 -m http.server`.
- [x] Workflow horario publicando `tasas.json` con `secrets.BCV_TASAS_PAT`.
- [x] Interfaz sin Ajustes, token ni tasas manuales.
- [x] Valores en dólares/euros y bolívares en vivo mientras se escribe.
- [x] APK de Android publicado como artefacto por `build-apk.yml`.

### Workflow

`.github/workflows/actualizar-tasas.yml` corre a los 20 minutos de cada hora y
también a mano desde **Actions → Actualizar tasas BCV → Run workflow**:

1. Descarga `tasas.json` de `bcv_scraper` con el PAT del secreto.
2. Valida que `usd` y `eur` sean números positivos.
3. Commitea `tasas.json` solo si cambió.

Requiere **Settings → Actions → General → Workflow permissions → Read and
write** (en este repositorio el primer run ya funcionó).

El secreto `BCV_TASAS_PAT` no se puede leer de vuelta; si el workflow falla con
401/404, genera un PAT nuevo con `Contents: Read-only` sobre
`linuxcoro/bcv_scraper` y actualízalo en **Settings → Secrets and variables →
Actions**.
