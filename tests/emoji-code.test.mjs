import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const elements = new Map();

function makeElement(id = '') {
  return {
    id,
    value: '',
    textContent: '',
    innerHTML: '',
    style: {},
    files: [],
    className: '',
    classList: { toggle() {}, add() {}, remove() {} },
    parentElement: { querySelector: () => makeElement() },
    appendChild() {},
    append() {},
    addEventListener() {},
    setAttribute() {},
    querySelector(selector) {
      if (selector === 'span:not(.placeholder-text)') {
        const match = this.innerHTML.match(/^<span>([\s\S]*)<\/span>$/);
        return match ? { textContent: match[1] } : null;
      }
      return null;
    },
    querySelectorAll() { return []; },
    focus() {},
    select() {},
    setSelectionRange() {},
    click() {},
    remove() {},
  };
}

const storage = new Map();
const document = {
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, makeElement(id));
    return elements.get(id);
  },
  createElement: () => makeElement(),
  querySelectorAll: () => [],
  body: makeElement('body'),
  execCommand: () => true,
};

const context = vm.createContext({
  console,
  document,
  localStorage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  },
  location: {
    origin: 'https://example.test',
    pathname: '/Emoji-code/',
    href: 'https://example.test/Emoji-code/',
    hash: '',
  },
  navigator: {},
  window: { getSelection: () => ({ removeAllRanges() {}, addRange() {} }) },
  URL,
  Blob,
  TextEncoder,
  TextDecoder,
  Uint8Array,
  btoa,
  atob,
  setTimeout,
  confirm: () => true,
});

const source = fs.readFileSync(new URL('../script.js', import.meta.url), 'utf8');
vm.runInContext(source, context, { filename: 'script.js' });

function evaluate(expression) {
  return vm.runInContext(expression, context);
}

for (const original of ['らくてん', 'きゃっと', 'ガッツポーズ', 'ぱんだ', 'ヴヵヶ']) {
  const encoded = evaluate(`encodeText(${JSON.stringify(original)})`);
  const decoded = evaluate(`decodeText(${JSON.stringify(encoded)})`);
  assert.equal(decoded, evaluate(`kata2hira(${JSON.stringify(original)})`), `${original} should round-trip`);
}

assert.equal(evaluate(`encodeText('らくてん')`), '🎒🐻✋🆖');
assert.match(evaluate(`encodeText('きゃっと')`), /\^/);
const spacedMessage = ' きゃっと\n';
assert.equal(
  evaluate(`decodeText(encodeText(${JSON.stringify(spacedMessage)}))`),
  spacedMessage,
);
document.getElementById('decode-input').value = '   ';
evaluate('decode()');
assert.equal(evaluate(`getOutputText('decode-output')`), '   ');

evaluate(`currentCipher = { ...CIPHER, 'よろしく': '🤝✨' }`);
const customEncoded = evaluate(`encodeText('よろしくです')`);
assert.equal(customEncoded.startsWith('🤝✨'), true);
assert.equal(evaluate(`decodeText(${JSON.stringify(customEncoded)})`), 'よろしくです');

assert.deepEqual(
  evaluate(`validateCipher({ ...CIPHER, '追加': CIPHER['あ'] })`).ok,
  false,
  'duplicate emoji should be rejected',
);
assert.equal(
  evaluate(`validateCipher({ ...CIPHER, '追加': CIPHER['あ'] + '✨' })`).ok,
  false,
  'emoji prefixes should be rejected to keep decoding unambiguous',
);
assert.equal(
  evaluate(`validateCipher({ ...CIPHER, '追加': '^✨' })`).ok,
  false,
  'modifier characters cannot begin a cipher token',
);
assert.equal(
  evaluate(`normalizeCipher({ 'ヨロシク': '🤝✨' })['よろしく']`),
  '🤝✨',
  'custom keys should normalize katakana',
);

const shareUrl = evaluate(`buildDecodeLink(${JSON.stringify(customEncoded)})`);
const encodedPayload = shareUrl.split('#share=')[1];
const payload = evaluate(`decodeSharePayload(${JSON.stringify(encodedPayload)})`);
assert.equal(payload.version, 1);
assert.equal(payload.message, customEncoded);
assert.equal(payload.cipher['よろしく'], '🤝✨');

storage.clear();
context.location.hash = `#share=${encodedPayload}`;
evaluate('currentCipher = { ...CIPHER }');
evaluate('loadSharedMessage()');
assert.equal(document.getElementById('decode-input').value, customEncoded);
assert.equal(document.getElementById('decode-output').innerHTML.includes('よろしくです'), true);
assert.equal(storage.has('menchi-cipher-custom'), false, 'shared settings should remain temporary');

const importedJson = JSON.stringify({
  version: 1,
  cipher: { ...evaluate('CIPHER'), 'ありがとう': '🙏✨' },
});
const importTarget = { files: [{ text: async () => importedJson }], value: 'settings.json' };
context.importTarget = importTarget;
await evaluate('importCipher({ target: importTarget })');
assert.equal(evaluate(`decodeText(encodeText('ありがとう'))`), 'ありがとう');
assert.equal(storage.has('menchi-cipher-custom'), true, 'imported settings should be saved');
assert.equal(importTarget.value, '', 'file input should be reset after import');

evaluate(`currentCipher = { ...CIPHER }`);
evaluate(`tryExample('encode')`);
assert.equal(document.getElementById('encode-input').value, 'きゃっと');
assert.equal(document.getElementById('encode-output').innerHTML.includes('^'), true);
evaluate(`sendToOtherMode('encode')`);
assert.equal(document.getElementById('decode-output').innerHTML.includes('きゃっと'), true);
evaluate(`clearInput('decode')`);
assert.equal(document.getElementById('decode-input').value, '');
evaluate(`exportCipher()`);

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
for (const required of [
  '例文で試す',
  '入力を消す',
  '結果を文字に変換',
  '解読リンクをコピー',
  '設定を書き出す',
  '設定を読み込む',
]) {
  assert.equal(html.includes(required), true, `${required} control should exist`);
}

console.log('PASS: conversion, duplicate validation, share payload, and controls');
