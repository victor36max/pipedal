// Exercise actual source handlers with isolated model/React boundaries.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function fragment(file, name, kind) {
    const source = ts.createSourceFile(file, readFileSync(new URL('../src/pipedal/' + file, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let result;
    function visit(node) {
        if (node.kind === kind && node.name?.getText(source) === name) result = node.getText(source);
        ts.forEachChild(node, visit);
    }
    visit(source);
    assert.ok(result, `Missing source declaration ${name}`);
    return result;
}
function compile(source, scope = {}) {
    const js = ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React}}).outputText;
    return new Function(...Object.keys(scope), js)(...Object.values(scope));
}
function modelHarness() {
    const item = {pathProperties: {}};
    const methods = ['monitorPatchProperty', 'cancelMonitorPatchProperty', 'handleNotifyPathPatchPropertyChanged']
        .map(name => fragment('PiPedalModel.tsx', name, ts.SyntaxKind.MethodDeclaration)).join('\n');
    const listener = fragment('PiPedalModel.tsx', 'PatchPropertyListenerItem', ts.SyntaxKind.ClassDeclaration);
    const model = compile(`${listener}\nclass Harness {${methods}}\nreturn new Harness();`);
    Object.assign(model, {nextListenHandle: 1, monitorPatchPropertyListeners: [], pedalboard: {get: () => ({getItem: () => item})}});
    return {model, item};
}
test('host numeric broadcasts reach only matching instance/property, and cancellation works', () => {
    const {model, item} = modelHarness();
    const received = [];
    const handle = model.monitorPatchProperty(7, 'urn:gain', (...args) => received.push(args));
    model.monitorPatchProperty(8, 'urn:gain', () => assert.fail('wrong instance'));
    model.monitorPatchProperty(7, 'urn:mix', () => assert.fail('wrong property'));
    model.handleNotifyPathPatchPropertyChanged(7, 'urn:gain', '0.75');
    assert.deepEqual(received, [[7, 'urn:gain', 0.75]]);
    assert.equal(item.pathProperties['urn:gain'], '0.75');
    model.cancelMonitorPatchProperty(handle);
    model.handleNotifyPathPatchPropertyChanged(7, 'urn:gain', '0.25');
    assert.equal(received.length, 1);
});
test('file and structured notifications retain their existing delivery path', () => {
    const {model} = modelHarness();
    model.monitorPatchProperty(7, 'urn:value', () => assert.fail('not numeric'));
    for (const value of ['"file.wav"', '{"otype_":"Path","value":"x"}', 'null', 'invalid', '1e400']) {
        model.handleNotifyPathPatchPropertyChanged(7, 'urn:value', value);
    }
});
test('double-tap reset calls the supplied value writer, not the control-port API', () => {
    const method = fragment('PluginControl.tsx', 'resetToDefaultValue', ts.SyntaxKind.MethodDeclaration);
    const control = compile(`class Harness {${method}}\nreturn new Harness();`);
    const values = [];
    control.props = {onChange: value => values.push(value)};
    control.model = {setPedalboardControl: () => assert.fail('wrong API')};
    control.resetToDefaultValue({default_value: 0.4, symbol: 'urn:gain'});
    assert.deepEqual(values, [0.4]);
});
test('drag preview and release both send patch writes through the rendered control', async () => {
    const writes = [];
    const model = {setPatchProperty: async (...args) => {writes.push(args);}};
    const source = fragment('PatchPropertyControl.tsx', 'PatchPropertyControl', ts.SyntaxKind.FunctionDeclaration)
        .replace('export default ', '');
    const props = {instanceId: 7, property: {uri: 'urn:gain', toUiControl: () => ({default_value: 0.5})}};
    const rendered = compile(`${source}\nreturn PatchPropertyControl(props);`, {
        props, PiPedalModelFactory: {getInstance: () => model},
        useMemo: fn => fn(), useState: value => [value, () => {}], useEffect: () => {},
        PluginControl: 'PluginControl', React: {createElement: (type, props) => ({type, props})}
    });
    rendered.props.onPreviewChange(0.7);
    assert.deepEqual(writes, [[7, 'urn:gain', 0.7]], 'audio changes before release');
    rendered.props.onChange(0.8);
    assert.deepEqual(writes[1], [7, 'urn:gain', 0.8]);
});
