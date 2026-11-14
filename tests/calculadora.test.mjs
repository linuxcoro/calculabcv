import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(path.join(raiz, 'index.html'), 'utf8');

const bloque = html.match(/<script id="calc-core">([\s\S]*?)<\/script>/);
assert.ok(bloque, 'index.html debe incluir el bloque <script id="calc-core">');

const contexto = vm.createContext({ window: {} });
vm.runInContext(bloque[1], contexto, { filename: 'calc-core.js' });
const Core = contexto.window.CalculadoraCore;
assert.ok(Core, 'El núcleo debe exponerse en window.CalculadoraCore');

function ok(expresion) {
    const resultado = Core.evaluarExpresion(expresion);
    assert.equal(resultado.ok, true, `Se esperaba éxito para "${expresion}" (${resultado.error || 'sin error'})`);
    return resultado.valor;
}

function falla(expresion) {
    const resultado = Core.evaluarExpresion(expresion);
    assert.equal(resultado.ok, false, `Se esperaba error para "${expresion}"`);
    return resultado.error;
}

test('operaciones básicas y precedencia', () => {
    assert.equal(ok('3+10-3'), 10);
    assert.equal(ok('3+10×2'), 23);
    assert.equal(ok('(3+10)×2'), 26);
    assert.equal(ok('2×(3+(4-1))'), 12);
    assert.equal(ok('10÷4'), 2.5);
    assert.equal(ok('1,5+2,25'), 3.75);
    assert.equal(ok('-5+2'), -3);
    assert.equal(ok(' 3 + 4 '), 7);
    assert.equal(ok('3*4/2'), 6);
    assert.equal(ok('3x4'), 12);
    assert.equal(ok('10/4'), 2.5);
    assert.equal(ok('((2))'), 2);
    assert.equal(ok('2,5×4'), 10);
});

test('errores de expresión con mensajes claros', () => {
    assert.match(falla(''), /operación/i);
    assert.match(falla('   '), /operación/i);
    assert.match(falla('3+'), /incompleta/i);
    assert.match(falla('(3+4'), /paréntesis/i);
    assert.match(falla('3+4)'), /paréntesis/i);
    assert.match(falla('10÷0'), /dividir/i);
    assert.match(falla('0÷0'), /dividir/i);
    assert.match(falla('3..2'), /coma|número/i);
    assert.match(falla('3++'), /incompleta/i);
    assert.match(falla('3+4a'), /carácter no válido/i);
});

test('formato de montos en es-VE', () => {
    assert.equal(Core.formatearMonto(10), '10,00');
    assert.equal(Core.formatearMonto(1234.5), '1.234,50');
    assert.equal(Core.formatearMonto(-3.5), '-3,50');
    assert.equal(Core.formatearMonto(8975.383), '8.975,38');
    assert.equal(Core.formatearMonto(0), '0,00');
    assert.equal(Core.formatearMonto(NaN), '—');
    assert.equal(Core.formatearExacta(1001.18602288), '1.001,18602288');
});

test('normalización de tasas BCV', () => {
    const tasas = Core.normalizarTasas({
        usd: 897.5383,
        eur: 1001.18602288,
        usd_bs: '897,54',
        eur_bs: '1.001,19',
        usd_exacta: '897,53830000',
        eur_exacta: '1.001,18602288',
        fecha_valor: '2026-11-09',
        fecha_valor_texto: 'Lunes, 09 Noviembre 2026',
        fuente: 'https://www.bcv.org.ve/glosario/cambio-oficial',
        actualizado_texto: '08/11/2026 14:55:47'
    });

    assert.ok(tasas, 'El JSON documentado debe normalizarse');
    assert.equal(tasas.usd, 897.5383);
    assert.equal(tasas.eur, 1001.18602288);
    assert.equal(tasas.usd_bs, '897,54');
    assert.equal(tasas.eur_bs, '1.001,19');
    assert.equal(tasas.usd_exacta, '897,53830000');
    assert.equal(tasas.fecha_valor_texto, 'Lunes, 09 Noviembre 2026');
    assert.equal(tasas.actualizado_texto, '08/11/2026 14:55:47');

    const derivadas = Core.normalizarTasas({ usd: 900, eur: 1000, usd_bs: '', eur_bs: null, fecha_valor: '2026-11-12' });
    assert.ok(derivadas);
    assert.equal(derivadas.usd_bs, '900,00');
    assert.equal(derivadas.eur_bs, '1.000,00');
    assert.equal(derivadas.fecha_valor_texto, '2026-11-12');

    assert.equal(Core.normalizarTasas(null), null);
    assert.equal(Core.normalizarTasas({}), null);
    assert.equal(Core.normalizarTasas({ usd: 0, eur: 100 }), null);
    assert.equal(Core.normalizarTasas({ usd: 900, eur: 'n/a' }), null);
});

test('conversión a bolívares', () => {
    assert.equal(Core.formatearMonto(Core.convertirABs(10, 897.5383)), '8.975,38');
    assert.equal(Core.formatearMonto(Core.convertirABs(3.5, 1001.18602288)), '3.504,15');
    assert.equal(Core.convertirABs(10, 0), null);
    assert.equal(Core.convertirABs(10, -1), null);
    assert.equal(Core.convertirABs(10, 'abc'), null);
    assert.equal(Core.convertirABs(NaN, 897), null);
});

test('ganancia porcentual', () => {
    assert.equal(Core.normalizarPorcentaje('30,5'), 30.5);
    assert.equal(Core.normalizarPorcentaje('99,99'), 99.99);
    assert.equal(Core.normalizarPorcentaje(0), 0);
    assert.equal(Core.normalizarPorcentaje('100'), null);
    assert.equal(Core.normalizarPorcentaje('150'), null);
    assert.equal(Core.normalizarPorcentaje('-5'), null);
    assert.equal(Core.normalizarPorcentaje(''), null);
    assert.equal(Core.normalizarPorcentaje('abc'), null);
    assert.equal(Core.normalizarPorcentaje(null), null);

    assert.equal(Core.formatearPorcentaje(30), '30');
    assert.equal(Core.formatearPorcentaje(33.5), '33,5');
    assert.equal(Core.formatearPorcentaje('100'), '');

    assert.ok(Math.abs(Core.aplicarGanancia(100, 30) - 100 / 0.7) < 1e-9);
    assert.equal(Core.formatearMonto(Core.aplicarGanancia(100, 30)), '142,86');
    assert.equal(Core.formatearMonto(Core.aplicarGanancia(100, 35)), '153,85');
    assert.equal(Core.aplicarGanancia(100, 0), 100);
    assert.equal(Core.aplicarGanancia(0, 30), 0);
    assert.equal(Core.aplicarGanancia(100, 100), null);
    assert.equal(Core.aplicarGanancia(100, -5), null);
    assert.equal(Core.aplicarGanancia(100, 'abc'), null);
    assert.equal(Core.aplicarGanancia(NaN, 30), null);
    assert.equal(Core.aplicarGanancia(Infinity, 30), null);

    assert.equal(Core.formatearMonto(Core.convertirABs(100, 1010.5608)), '101.056,08');
    assert.equal(
        Core.formatearMonto(Core.convertirABs(Core.aplicarGanancia(100, 30), 1010.5608)),
        '144.365,83'
    );
});

test('lectura de números', () => {
    assert.equal(Core.numeroPositivo('897,54'), 897.54);
    assert.equal(Core.numeroPositivo('1.001,19'), 1001.19);
    assert.equal(Core.numeroPositivo('897.5383'), 897.5383);
    assert.equal(Core.numeroPositivo(0), null);
    assert.equal(Core.numeroPositivo('texto'), null);
});

test('guardas del archivo publicado', () => {
    assert.ok(!html.includes('__RATES_PAT__'), 'No debe quedar el marcador del PAT');
    assert.ok(!html.includes('Ajustes'), 'No debe quedar la interfaz de Ajustes');
    assert.ok(!/Token de GitHub|PAT/.test(html), 'No debe quedar ninguna referencia al PAT en la interfaz');
    assert.ok(!html.includes('<h1'), 'No debe quedar el título visible de la app');
    assert.ok(!html.includes('class="topbar"'), 'No debe quedar la cabecera de marca');
    assert.ok(!html.includes('id="btnActualizar"'), 'No debe quedar el botón Actualizar');
    assert.ok(!html.includes('id="tituloTasas"'), 'No debe quedar el encabezado de tasas');
    assert.ok(!html.includes('Dólar y euro · datos del repositorio bcv_scraper'), 'No debe quedar el hint de tasas');
    assert.ok(!html.includes('>Actualizar<'), 'No debe quedar el texto Actualizar');
    assert.ok(!/new\s+Function/.test(html), 'No debe usarse new Function');
    assert.ok(!/(^|[^a-zA-Z0-9_])eval\s*\(/.test(html), 'No debe usarse eval');
    assert.ok(!/github_pat_[A-Za-z0-9_]{20,}/.test(html), 'No debe haber un PAT escrito en el archivo');
    assert.ok(html.includes('https://raw.githubusercontent.com/linuxcoro/calculabcv/main/tasas.json'));

    const claves = [...html.matchAll(/data-key="([^"]+)"/g)].map((coincidencia) => coincidencia[1]);
    assert.deepEqual(claves, [
        'clear', 'back', '(', ')',
        '7', '8', '9', '÷',
        '4', '5', '6', '×',
        '1', '2', '3', '−',
        '0', ',', '+', 'ganancia'
    ], 'El teclado debe respetar el orden solicitado con % GAN al final');

    assert.ok(!html.includes('data-key="="'), 'El botón = ya no debe existir');
    assert.ok(!html.includes('key-eq'), 'No debe quedar el estilo del botón =');
    assert.ok(!html.includes('pulsa igual'), 'La ayuda no debe hablar del botón =');
    assert.ok(html.includes('id="ganancia"'), 'Debe existir el campo de porcentaje de ganancia');
    assert.ok(html.includes('id="resultadoGanancia"'), 'Debe existir la línea de ganancia del resultado');
    assert.ok(html.includes('data-key="ganancia"'), 'Debe existir la tecla % GAN');
    assert.match(html, /data-key="ganancia"[^>]*aria-pressed="false"/, 'La tecla % GAN debe ser un toggle con aria-pressed');

    assert.ok(html.includes('id="botonGanancia"'), 'Debe existir el engranaje de ganancia');
    assert.ok(html.includes('id="dialogoGanancia"'), 'Debe existir el popup de configuración de ganancia');
    assert.ok(html.includes('id="guardarGanancia"'), 'Debe existir el botón Guardar del popup');
    assert.ok(html.includes('id="cancelarGanancia"'), 'Debe existir el botón Cancelar del popup');
    assert.ok(!html.includes('id="panelGanancia"'), 'No debe quedar el panel de ganancia anterior');
    assert.ok(!html.includes('id="valorGanancia"'), 'No debe quedar el valor visible anterior');
    assert.ok(!html.includes('id="editorGanancia"'), 'No debe quedar el editor plegable anterior');
    assert.ok(!html.includes('ganancia-panel'), 'No debe quedar el panel a ancho completo');
    assert.ok(!html.includes('ganancia-toggle'), 'No debe quedar el disparador anterior');
    assert.ok(!html.includes('ganancia-dropdown'), 'No debe quedar el menú flotante anterior');
    assert.ok(!html.includes('GANANCIA ▾'), 'El texto GANANCIA ▾ no debe quedar');
    assert.ok(!html.includes('id="bloqueGanancia"'), 'No debe quedar la barra de ganancia anterior');
    assert.ok(!html.includes('ganancia-barra'), 'No debe quedar el estilo de la barra anterior');

    const posTasas = html.indexOf('aria-label="Tasas BCV"');
    const posEuro = html.indexOf('data-moneda="eur"');
    const posEngranaje = html.indexOf('id="botonGanancia"');
    const posCalculadora = html.indexOf('aria-labelledby="tituloCalc"');
    assert.ok(posTasas !== -1 && posEuro !== -1 && posEngranaje !== -1 && posCalculadora !== -1,
        'Deben existir las tasas, el engranaje y la calculadora');
    assert.ok(posTasas < posEuro && posEuro < posEngranaje && posEngranaje < posCalculadora,
        'El engranaje debe ir después de la tarjeta Euro y antes de la calculadora');
    assert.match(html, /id="botonGanancia"[^>]*aria-haspopup="dialog"/,
        'El engranaje debe abrir un diálogo');
});
