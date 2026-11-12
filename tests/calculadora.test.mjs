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

test('lectura de números y tokens', () => {
    assert.equal(Core.numeroPositivo('897,54'), 897.54);
    assert.equal(Core.numeroPositivo('1.001,19'), 1001.19);
    assert.equal(Core.numeroPositivo('897.5383'), 897.5383);
    assert.equal(Core.numeroPositivo(0), null);
    assert.equal(Core.numeroPositivo('texto'), null);

    assert.equal(Core.esTokenConfigurado('__RATES_PAT__'), false);
    assert.equal(Core.esTokenConfigurado(''), false);
    assert.equal(Core.esTokenConfigurado('github_pat_' + 'a'.repeat(30)), true);
});

test('guardas del archivo publicado', () => {
    assert.equal((html.match(/__RATES_PAT__/g) || []).length, 1, 'El marcador debe aparecer una sola vez');
    assert.ok(!/new\s+Function/.test(html), 'No debe usarse new Function');
    assert.ok(!/(^|[^a-zA-Z0-9_])eval\s*\(/.test(html), 'No debe usarse eval');
    assert.ok(!/github_pat_[A-Za-z0-9_]{20,}/.test(html), 'No debe haber un PAT escrito en el archivo');
    assert.ok(html.includes('https://api.github.com/repos/linuxcoro/bcv_scraper/contents/tasas.json?ref=main'));

    const claves = [...html.matchAll(/data-key="([^"]+)"/g)].map((coincidencia) => coincidencia[1]);
    assert.deepEqual(claves, [
        'clear', 'back', '(', ')',
        '7', '8', '9', '÷',
        '4', '5', '6', '×',
        '1', '2', '3', '−',
        '0', ',', '+', '='
    ], 'El teclado debe respetar el orden solicitado');
});
