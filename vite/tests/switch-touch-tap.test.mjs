// Gesture unit tests; physical Chromium/touchscreen behavior needs live testing.
// Run: node --test tests/switch-touch-tap.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
const source = readFileSync(new URL('../src/pipedal/SwitchTouchTap.ts', import.meta.url), 'utf8');
const { code } = transformSync(source, { loader: 'ts', format: 'esm' });
const { installSwitchTouchTap } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
globalThis.Element = class {};
function setup() {
    const target = new Element(), listeners = new Map();
    let time = 0, clicks = 0;
    const input = { disabled: false, isConnected: true, click() { clicks++; } };
    const root = {
        contains: t => t === target, querySelector: () => input,
        addEventListener: (name, fn, options) => listeners.set(name, {fn, options}),
        removeEventListener: name => listeners.delete(name)
    };
    const cleanup = installSwitchTouchTap(root, () => time);
    const point = (x = 0) => ({ identifier: 1, clientX: x, clientY: 0 });
    function emit(type, overrides = {}) {
        const e = { target, touches: type === 'touchend' ? [] : [point()], changedTouches: [point()],
            cancelable: true, prevented: false, stopped: false,
            preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; }, ...overrides };
        listeners.get(type)?.fn(e); return e;
    }
    return { input, listeners, cleanup, emit, point, clicks: () => clicks, time: v => time = v };
}
test('short tap clicks once and cancels compatibility click', () => {
    const s = setup(); s.emit('touchstart'); s.time(100); const end = s.emit('touchend');
    assert.equal(s.clicks(), 1); assert.ok(end.prevented && end.stopped);
    s.emit('touchend'); assert.equal(s.clicks(), 1);
    assert.equal(s.listeners.get('touchend').options.passive, false);
});
test('drag, long press, cancellation and multi-touch do not activate', () => {
    for (const action of [s => s.emit('touchmove', { touches: [s.point(30)] }),
        s => s.time(700), s => s.emit('touchcancel'),
        s => s.emit('touchstart', { touches: [s.point(), {...s.point(), identifier: 2}] })]) {
        const s = setup(); s.emit('touchstart'); action(s); s.emit('touchend'); assert.equal(s.clicks(), 0);
    }
});
test('disabled, detached and noncancelable controls do not activate', () => {
    for (const action of [s => {s.input.disabled = true;}, s => {s.input.isConnected = false;}]) {
        const s = setup(); s.emit('touchstart'); action(s); s.emit('touchend'); assert.equal(s.clicks(), 0);
    }
    const s = setup(); s.emit('touchstart'); s.emit('touchend', {cancelable: false}); assert.equal(s.clicks(), 0);
});
test('mouse and keyboard are untouched; cleanup removes listeners', () => {
    const s = setup(); assert.equal(s.listeners.has('click'), false); assert.equal(s.listeners.has('keydown'), false);
    s.emit('touchstart'); s.cleanup(); s.emit('touchend'); assert.equal(s.clicks(), 0); assert.equal(s.listeners.size, 0);
});
