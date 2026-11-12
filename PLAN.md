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
- **PAT fuera del navegador**: un secreto de GitHub no se puede leer desde una
  página web. El workflow `actualizar-tasas.yml` usa `BCV_TASAS_PAT` para
  publicar `tasas.json` en este repo; la app lee esa copia pública sin token.
  El PAT en **Ajustes** (`localStorage`) queda como respaldo opcional, igual
  que el marcador `<meta name="bcv-tasas-pat" content="__RATES_PAT__">` para
  despliegues personales.
- **Cadena de respaldo**: copia pública del repo → API de `bcv_scraper` con
  PAT → últimas tasas guardadas → tasas manuales de Ajustes.
- **Cálculo seguro**: parser recursivo propio; nunca `eval` ni `new Function`.

## 3. Estructura entregada

```text
calculabcv/
├── .github/workflows/
│   └── actualizar-tasas.yml   # publica tasas.json cada hora
├── index.html                 # app completa (HTML + CSS + JS)
├── PLAN.md                    # este plan
├── README.md                  # uso, PAT, seguridad y pruebas
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
  API de contenidos con `Accept: application/vnd.github.raw` y
  `Authorization: Bearer`; URL pública de respaldo; timeout de 10 s; caché en
  `localStorage`; tasas manuales; mensajes para 401/403/404, sin red y JSON
  inválido.
- [x] **Paso 6 · Persistencia y ajustes.**
  Claves `calculabcv_tasas`, `calculabcv_tasas_manual`, `calculabcv_moneda` y
  `calculabcv_pat`; diálogo de Ajustes con token, tasas manuales y borrado de
  la caché.
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
| Sin PAT y sin datos | Tasas manuales editables; aviso para configurar el acceso. |
| PAT inválido o sin permiso | Mensaje específico (401/403) y caché o manual. |
| `tasas.json` 404 / JSON dañado | Error claro; la calculadora sigue funcionando. |
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

Además, prueba real en Chrome headless con clics sobre el teclado:

- Con tasas manuales: `3+10−3` → `= $ 10,00` y `En bolívares: Bs 8.975,40`;
  `=` quita el foco; inserción en cursor; `C`; euro (`Bs 10.011,90`); coma
  única y `⌫`.
- **Sin PAT y sin caché**, contra la copia pública ya publicada por el
  workflow: tasas visibles, estado verde, `3+10-3` → `= $ 10,00` y bolívares
  con la tasa BCV del día. Workflow run
  [#43241624437](https://github.com/linuxcoro/calculabcv/actions/runs/43241624437)
  en verde; `tasas.json` público verificado (USD 904,4485 / EUR 1003,49465523,
  fecha valor 12/11/2026).

La captura revisada (`.preview.png`, solo verificación local) muestra el
layout final a 390×900 con las tasas reales.

## 8. Criterios de aceptación

- [x] `index.html` autocontenido, sin CDN; abre con `python3 -m http.server`.
- [x] Teclado exacto `C ⌫ ( )` / `7 8 9 ÷` / `4 5 6 ×` / `1 2 3 −` /
      `0 , + =`, con `C` rojo y `=` verde, botones ≥ 48 px.
- [x] Dígitos y coma en el cursor; `⌫` y `C` correctos; `=` recalcula y
      oculta el teclado.
- [x] Resultado `$/€` y `En bolívares: Bs …` con la tasa BCV de la moneda.
- [x] Tasas de USD/EUR con fecha valor, actualización y respaldo sin red.
- [x] Token opcional en Ajustes y soporte del marcador de despliegue; ningún
      secreto en el archivo (el marcador aparece una sola vez).
- [x] `tasas.json` público actualizado por el workflow y leído por la app sin
      PAT.
- [x] Pruebas automatizadas en verde.
- [x] Repositorio creado y código publicado:
      <https://github.com/linuxcoro/calculabcv>.

## 9. Seguridad

- El PAT **no** se escribe en el repositorio ni en el HTML: vive en el secreto
  `BCV_TASAS_PAT` y solo lo usa el workflow.
- El PAT opcional de Ajustes se guarda en `localStorage` y solo se envía a
  `api.github.com`.
- La copia pública de `tasas.json` contiene solo tasas oficiales del BCV, sin
  datos personales.
- Si el PAT se inyectara en un sitio público, cualquiera podría leerlo; el
  marcador `__RATES_PAT__` queda solo para despliegues personales.

## 10. Estado final y PAT

- [x] Repositorio público: <https://github.com/linuxcoro/calculabcv>.
- [x] Sin GitHub Pages: la app se abre en local con `python3 -m http.server`.
- [x] Workflow horario publicando `tasas.json` con `secrets.BCV_TASAS_PAT`.
- [ ] PAT opcional en Ajustes: no es necesario con la copia pública.

### Workflow

`.github/workflows/actualizar-tasas.yml` corre a los 20 minutos de cada hora y
también a mano desde **Actions → Actualizar tasas BCV → Run workflow**:

1. Descarga `tasas.json` de `bcv_scraper` con el PAT del secreto.
2. Valida que `usd` y `eur` sean números positivos.
3. Commitea `tasas.json` solo si cambió.

Requiere **Settings → Actions → General → Workflow permissions → Read and
write** (en este repositorio el primer run ya funcionó).

### PAT opcional

Solo hace falta si la copia pública no está disponible:

1. <https://github.com/settings/personal-access-tokens/new>
2. Resource owner `linuxcoro`; acceso solo a `linuxcoro/bcv_scraper`.
3. Permiso `Contents: Read-only`.
4. Pegar en **Ajustes → Token de GitHub (PAT)**.

El secreto `BCV_TASAS_PAT` no se puede leer de vuelta; si el workflow falla con
401/404, genera un PAT nuevo y actualízalo en **Settings → Secrets and
variables → Actions**.
