# Plan de implementación · Calculadora de Pago Móvil (BCV)

Implementación local terminada el **12/11/2026**. Queda pendiente el paso 9:
crear el repositorio en GitHub (se pide confirmación al final).

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
- **PAT fuera del repositorio**: una página web no puede leer secretos de
  GitHub. El token entra por:
  1. **Ajustes** de la app → `localStorage` del navegador (recomendado), o
  2. el marcador `<meta name="bcv-tasas-pat" content="__RATES_PAT__">`
     reemplazado al desplegar.
- **Cadena de respaldo**: tasas de GitHub → últimas tasas guardadas → tasas
  manuales de Ajustes → aviso para configurar el acceso.
- **Cálculo seguro**: parser recursivo propio; nunca `eval` ni `new Function`.

## 3. Estructura entregada

```text
calculabcv/
├── index.html                 # app completa (HTML + CSS + JS)
├── PLAN.md                    # este plan
├── README.md                  # uso, PAT, seguridad y pruebas
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
- [ ] **Paso 9 · Crear el repositorio en GitHub.** ⛔ Requiere tu confirmación
  (ver sección 9).

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

Además, prueba real en Chrome headless con clics sobre el teclado y tasas
manuales sembradas:

- `3+10−3` → `= $ 10,00` y `En bolívares: Bs 8.975,40`.
- `=` quita el foco del campo (oculta el teclado).
- Inserción en el cursor: `3+10-3` con cursor tras `3` + `9` → `39+10-3`.
- `C` limpia expresión y resultado.
- Euro: `= € 10,00` y `Bs 10.011,90`.
- Coma única por número y borrado con `⌫`.

La captura revisada (`.preview.png`, solo verificación local) muestra el
layout final a 390×900.

## 8. Criterios de aceptación

- [x] `index.html` autocontenido, sin CDN; abre con `python3 -m http.server`.
- [x] Teclado exacto `C ⌫ ( )` / `7 8 9 ÷` / `4 5 6 ×` / `1 2 3 −` /
      `0 , + =`, con `C` rojo y `=` verde, botones ≥ 48 px.
- [x] Dígitos y coma en el cursor; `⌫` y `C` correctos; `=` recalcula y
      oculta el teclado.
- [x] Resultado `$/€` y `En bolívares: Bs …` con la tasa BCV de la moneda.
- [x] Tasas de USD/EUR con fecha valor, actualización y respaldo sin red.
- [x] Token en Ajustes y soporte del marcador de despliegue; ningún secreto
      en el archivo (el marcador aparece una sola vez).
- [x] Pruebas automatizadas en verde.
- [ ] Repositorio creado y código publicado (paso 9).

## 9. Seguridad

- El PAT **no** se escribe en el repositorio ni en el HTML: solo el marcador
  `__RATES_PAT__`.
- Se guarda en `localStorage` del navegador y solo se envía a
  `api.github.com`.
- Si el PAT queda inyectado en un sitio público, cualquiera puede leerlo.
  Para producción conviene hacer público `tasas.json` o usar un intermediario.

## 10. Paso 9 · Crear el repositorio en GitHub (pendiente)

No se creó ningún repositorio ni se subió nada. Para cerrar el trabajo
necesito que crees el repositorio y me confirmes:

1. **Nombre y dueño** (sugerencia: `linuxcoro/calculabcv`).
2. **Visibilidad**: público o privado.
3. Si quieres **GitHub Pages** para abrirlo desde el móvil (repo público o
   plan que lo permita, rama `main`, carpeta raíz).
4. Si usarás **inyección del PAT** con GitHub Actions, agrega el secreto
   `BCV_TASAS_PAT` en **ese** repositorio (los secretos no se comparten entre
   repos), con `Contents: Read-only` sobre `linuxcoro/bcv_scraper`.

Después de eso ejecuto el push y, si aplica, configuro la publicación. En
este equipo no hay `gh` ni credenciales git, así que el remoto se agrega con
la URL del repositorio que me indiques.
