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

## APK de Android

El workflow [`.github/workflows/build-apk.yml`](.github/workflows/build-apk.yml)
compila la app con **Capacitor 8** y publica un APK debug como artefacto del
run (no usa GitHub Pages).

1. Entra a **Actions → Build APK** y pulsa **Run workflow**. También se dispara
   al hacer push a `main` que toque `index.html` o `capacitor.config.json`.
2. Cuando termine, abre el run y descarga el artefacto **`calculabcv-apk`**.
3. Descomprime el ZIP e instala `calculabcv-1.0.<versión>.apk` en el móvil
   (activa «instalar apps de orígenes desconocidos»).

- Paquete: `com.linuxcoro.calculabcv`; nombre visible: **CalculaBCV**
  (configurados en [`capacitor.config.json`](capacitor.config.json)).
- El APK necesita internet para la primera carga de tasas; después usa la
  caché del dispositivo.
- Se firma con la clave **debug** del runner. Cada build es una firma distinta:
  para instalar sobre una versión anterior puede hacer falta desinstalar
  (se pierde la caché). Si quieres firma de producción o adjuntar el APK a un
  Release, se agrega después.
- Los commits horarios de `tasas.json` no disparan builds de APK.
- El APK no contiene PAT ni secretos: solo la app y su copia pública de tasas
  en tiempo de ejecución.

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

### Requisito del workflow

En **Settings → Actions → General → Workflow permissions** debe estar
habilitado **Read and write permissions**, para que el workflow pueda commitear
`tasas.json`. El workflow ya declara `permissions: contents: write`.

La app **no tiene Ajustes ni campos de token**: solo lee la copia pública. Si
esa copia no está disponible, usa las últimas tasas guardadas en el navegador.

Cadena de respaldo:

**copia pública del repo → últimas tasas guardadas en `localStorage` → aviso
al recargar la página.**

## Seguridad

- La app no contiene ningún PAT ni campos para pegarlo; el token vive en el
  secreto `BCV_TASAS_PAT` y solo lo usa GitHub Actions.
- La copia publicada de `tasas.json` contiene solo las tasas oficiales del BCV;
  no incluye datos personales.
- La app no envía datos del usuario a ningún servidor: solo descarga el JSON.

## Uso

- El teclado de la app inserta en la posición del cursor.
- El resultado en `$/€` y la conversión a bolívares (`En bolívares: Bs …`) se
  actualizan **mientras escribes**; no hay botón `=`.
- `⌫` borra y `C` limpia (rojo).
- El engranaje **⚙**, en la parte superior derecha del panel de tasas (después
  de la tarjeta Euro), abre un popup para configurar el porcentaje (30 % por
  defecto). **Guardar** lo guarda en el dispositivo (`calculabcv_ganancia`);
  **Cancelar**, `Esc` o un clic fuera lo descartan sin cambiar nada.
- **`% GAN`** aplica o quita la ganancia con ese porcentaje:
  `monto ÷ (1 − %/100)`. Con 30 %, `€ 100` pasa a `€ 142,86` y se recalcula su
  equivalente en bolívares; una segunda pulsación vuelve al monto original.
- Con la ganancia activa, guardar un nuevo porcentaje actualiza el resultado.
- Editar la operación quita la ganancia aplicada; el porcentaje se conserva.
- Las expresiones incompletas (`3+`, `(3+10`) no muestran error mientras se
  escribe: el mensaje aparece al pulsar `% GAN` o `Enter`.
- Toca la tarjeta **Dólar** o **Euro** para cambiar la moneda y la tasa; si hay
  ganancia aplicada, solo se recalcula la línea en bolívares.
- Con teclado físico los valores también se actualizan al escribir; `Enter`
  valida y oculta el teclado, `Esc` limpia y se puede usar `*`, `/`, `-` y
  paréntesis.

## Pruebas

```bash
node --test tests/calculadora.test.mjs
```

Las pruebas extraen el núcleo de cálculo de `index.html` y validan
operaciones, errores, formato `es-VE`, normalización de tasas, conversión,
ganancia porcentual y guardas del archivo (sin `eval`, sin PAT, orden del
teclado con `% GAN`).

## Estructura

```text
calculabcv/
├── .github/
│   └── workflows/
│       ├── actualizar-tasas.yml # publica tasas.json cada hora
│       └── build-apk.yml        # compila el APK de Android
├── capacitor.config.json        # appId, appName y webDir de Capacitor
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

La app lo toma al recargar la página. Si el workflow falla
(PAT vencido, sin acceso a `bcv_scraper` o permisos de escritura
deshabilitados), se conserva la última copia buena y la app sigue funcionando
con esa caché.

Para diagnosticar el PAT, el workflow falla con HTTP `401`/`404` si el token no
sirve o no tiene acceso al repositorio privado.
