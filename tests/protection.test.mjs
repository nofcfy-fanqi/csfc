import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, mkdir, mkdtemp, copyFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { encrypt, decrypt } from '../scripts/crypto.mjs';
const root = new URL('../', import.meta.url);
const password = 'test-only-random-long-password-47';
const payload = { version: 1, files: [{ path: 'data.js', mime: 'text/javascript', content: Buffer.from('队员资料 sentinel-student-id').toString('base64') }] };
test('correct password restores content; wrong passwords and tampering fail', async () => {
  const envelope = await encrypt(payload, password);
  assert.deepEqual(await decrypt(envelope, password), payload);
  await assert.rejects(decrypt(envelope, 'wrong-password'));
  const ciphertext = Buffer.from(envelope.ciphertext, 'base64');
  ciphertext[10] ^= 1;
  await assert.rejects(decrypt({ ...envelope, ciphertext: ciphertext.toString('base64') }, password));
  await assert.rejects(decrypt({ ...envelope, iterations: 1 }, password));
  const next = await encrypt(payload, password);
  assert.notEqual(next.salt, envelope.salt);
  assert.notEqual(next.iv, envelope.iv);
  assert(!JSON.stringify(envelope).includes(password));
});
test('raw roster and photo bypass files are absent from the published directory', async () => {
  for (const name of ['data.js', 'app.js', 'styles.css', 'assets/stadium.jpg']) {
    await assert.rejects(access(new URL(name, root)));
  }
});
test('cloud package restores all source files on a new computer; failed rotation preserves the old password', async () => {
  const scratch = await mkdtemp(path.join(tmpdir(), 'csfc-recover-'));
  const run = promisify(execFile);
  try {
    await mkdir(path.join(scratch, 'scripts'));
    await mkdir(path.join(scratch, '.private-source'));
    for (const name of ['crypto.mjs', 'build-protected.mjs']) await copyFile(new URL(`scripts/${name}`, root), path.join(scratch, 'scripts', name));
    await copyFile(new URL('site.enc.json', root), path.join(scratch, 'site.enc.json'));
    await copyFile(new URL('.private-source/access-password.txt', root), path.join(scratch, '.private-source', 'access-password.txt'));
    await run(process.execPath, [path.join(scratch, 'scripts', 'build-protected.mjs'), '--recover']);
    const source = await decrypt(JSON.parse(await readFile(new URL('site.enc.json', root), 'utf8')), (await readFile(new URL('.private-source/access-password.txt', root), 'utf8')).trim());
    for (const file of source.files) assert.deepEqual(await readFile(path.join(scratch, '.private-source', 'site', file.path)), Buffer.from(file.content, 'base64'));
    const before = await readFile(path.join(scratch, '.private-source', 'access-password.txt'));
    await writeFile(path.join(scratch, '.private-source', 'site', 'data.js'), 'window.CLUB_DATA={players:[{photo:"https://example.com/private-photo.jpg"}],albums:[]};');
    await assert.rejects(run(process.execPath, [path.join(scratch, 'scripts', 'build-protected.mjs'), '--rotate-password']));
    assert.deepEqual(await readFile(path.join(scratch, '.private-source', 'access-password.txt')), before);
  } finally { await rm(scratch, { recursive: true, force: true }); }
});
test('published package contains all originals and photos but no visible password or roster', async () => {
  const secret = (await readFile(new URL('.private-source/access-password.txt', root), 'utf8')).trim();
  const envelopeText = await readFile(new URL('site.enc.json', root), 'utf8');
  const original = await decrypt(JSON.parse(envelopeText), secret);
  assert(!envelopeText.includes(secret));
  assert(!envelopeText.includes('DEMO-001'));
  assert(!envelopeText.includes('陈一鸣'));
  for (const file of original.files) {
    assert.deepEqual(Buffer.from(file.content, 'base64'), await readFile(new URL(`.private-source/site/${file.path}`, root)), file.path);
  }
  assert(original.files.some((file) => file.path === 'assets/stadium.jpg'));
  for (const name of ['index.html', 'gate.js', 'gate.css', 'README.md']) {
    const publicText = await readFile(new URL(name, root), 'utf8');
    assert(!publicText.includes(secret), name);
    assert(!publicText.includes('DEMO-001'), name);
    assert(!publicText.includes('陈一鸣'), name);
  }
});
