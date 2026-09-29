import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

// The same test works on Node builds with and without native TypeScript stripping.
const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = await readFile(new URL('../src/collection.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { normalizeTokenId, parseTokenURI, decodeABIString, loadToken, COLLECTION_ADDRESS } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

const revealed = JSON.parse(await readFile(new URL('./fixtures/revealed-token.json', import.meta.url)));
const pending = JSON.parse(await readFile(new URL('./fixtures/unrevealed-token.json', import.meta.url)));
const uri = metadata => `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`;
const abi = value => {
  const hex = Buffer.from(value).toString('hex');
  return `0x${'20'.padStart(64, '0')}${(hex.length / 2).toString(16).padStart(64, '0')}${hex.padEnd(Math.ceil(hex.length / 64) * 64, '0')}`;
};
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test('token ID validation preserves valid integer IDs and rejects wrong formats/ranges', () => {
  assert.equal(normalizeTokenId(' #0001 '), '1');
  assert.equal(normalizeTokenId('5000'), '5000');
  for (const input of ['0', '-1', '1.5', '1e3', '5001', '', 'abc', '<script>', '999999999999']) {
    assert.throws(() => normalizeTokenId(input));
  }
});

test('real revealed metadata preserves the original SVG and every chain trait', () => {
  const parsed = parseTokenURI(uri(revealed), '1');
  assert.equal(parsed.revealed, true);
  assert.equal(parsed.image, revealed.image);
  assert.deepEqual(parsed.traits, revealed.attributes);
  assert.equal(parsed.traits.find(t => t.trait_type === 'Eyes').value, 'Side Eye');
});

test('real unrevealed token keeps its chain placeholder and exposes no invented traits', () => {
  const parsed = parseTokenURI(uri(pending.metadata), pending.id);
  assert.equal(parsed.revealed, false);
  assert.equal(parsed.image, pending.metadata.image);
  assert.deepEqual(parsed.traits, []);
});

test('truncated ABI, unexpected metadata, and active SVG content fail closed', () => {
  const value = uri(revealed);
  assert.equal(decodeABIString(abi(value)), value);
  assert.throws(() => decodeABIString('0x'));
  assert.throws(() => decodeABIString(abi(value).slice(0, 160)));
  assert.throws(() => parseTokenURI('https://example.com/metadata', '1'));
  assert.throws(() => parseTokenURI(uri({ ...revealed, attributes: [] }), '1'));
  assert.throws(() => parseTokenURI(uri({ ...revealed, image: `data:image/svg+xml;base64,${Buffer.from('<svg><script>alert(1)</script></svg>').toString('base64')}` }), '1'));
});

test('live lookup pins metadata to a block and retries a failed public endpoint', async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    calls.push({ url, body });
    if (calls.length === 1) throw new TypeError('network unavailable');
    return Response.json({ result: body.method === 'eth_blockNumber' ? '0x18e0839' : abi(uri(revealed)) });
  };
  const token = await loadToken('1');
  assert.equal(calls.length, 3);
  assert.notEqual(calls[0].url, calls[1].url);
  assert.equal(calls[2].body.params[1], '0x18e0839');
  assert.equal(calls[2].body.params[0].to, COLLECTION_ADDRESS);
  assert.equal(token.block, '26085433');
  assert.equal(token.source, 'live');
  assert.deepEqual(token.traits, revealed.attributes);
});

test('unminted ID reports the minting issue instead of fabricating an unrevealed card', async () => {
  globalThis.fetch = async (_url, options) => {
    const { method } = JSON.parse(options.body);
    return Response.json(method === 'eth_blockNumber' ? { result: '0x18e0839' } : { error: { code: 3, message: 'execution reverted', data: '0x7e273289' } });
  };
  await assert.rejects(loadToken('5000'), /has not been minted/);
});

test('total network failure gives an actionable error and cancellation remains cancellation', async () => {
  globalThis.fetch = async () => { throw new TypeError('offline'); };
  await assert.rejects(loadToken('1'), /Check your connection/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(loadToken('1', controller.signal), { name: 'AbortError' });
});
