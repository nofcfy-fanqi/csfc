import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, mkdir, mkdtemp, copyFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import vm from 'node:vm';
import { encrypt, decrypt } from '../scripts/crypto.mjs';
const root = new URL('../', import.meta.url);
const testPassword = 'test-only-random-long-password-47';
const payload = { version: 1, files: [{ path: 'data.js', mime: 'text/javascript', content: Buffer.from('队员资料 sentinel-student-id').toString('base64') }] };
const teams = ['men', 'women'];
const secretFor = async (team) => (await readFile(new URL(`.private-source/${team}/access-password.txt`, root), 'utf8')).trim();
const envelopeFor = async (team) => JSON.parse(await readFile(new URL(`${team}.enc.json`, root), 'utf8'));

test('correct password restores content; wrong passwords and tampering fail', async () => {
  const envelope = await encrypt(payload, testPassword);
  assert.deepEqual(await decrypt(envelope, testPassword), payload);
  await assert.rejects(decrypt(envelope, 'wrong-password'));
  const ciphertext = Buffer.from(envelope.ciphertext, 'base64');
  ciphertext[10] ^= 1;
  await assert.rejects(decrypt({ ...envelope, ciphertext: ciphertext.toString('base64') }, testPassword));
  await assert.rejects(decrypt({ ...envelope, iterations: 1 }, testPassword));
  const next = await encrypt(payload, testPassword);
  assert.notEqual(next.salt, envelope.salt);
  assert.notEqual(next.iv, envelope.iv);
  assert(!JSON.stringify(envelope).includes(testPassword));
});

test('raw bypass files and the superseded shared package are absent from the published directory', async () => {
  for (const name of ['data.js', 'app.js', 'styles.css', 'assets/stadium.jpg', 'site.enc.json']) {
    await assert.rejects(access(new URL(name, root)));
  }
});

test('teams have distinct rosters and cannot be unlocked using the other team or old shared password', async () => {
  const secrets = await Promise.all(teams.map(secretFor));
  assert.notEqual(secrets[0], secrets[1]);
  const legacySecret = (await readFile(new URL('.private-source/access-password.txt', root), 'utf8')).trim();
  const rosters = [];
  for (const [index, team] of teams.entries()) {
    const envelope = await envelopeFor(team);
    const original = await decrypt(envelope, secrets[index]);
    assert.equal(original.team, team);
    await assert.rejects(decrypt(envelope, secrets[1 - index]));
    await assert.rejects(decrypt(envelope, legacySecret));
    const sandbox = { window: {} };
    vm.runInNewContext(Buffer.from(original.files.find(f => f.path === 'data.js').content, 'base64').toString(), sandbox);
    assert.equal(sandbox.window.CLUB_DATA.team.division, team === 'men' ? '男队' : '女队');
    rosters.push(Array.from(sandbox.window.CLUB_DATA.players, p => p.name));
  }
  assert(rosters[0].length > 0 && rosters[1].length > 0);
  assert(rosters[0].every(name => !rosters[1].includes(name)));
});

test('each encrypted package preserves all original files and photos and reveals neither password nor names', async () => {
  const allSecrets = await Promise.all(teams.map(secretFor));
  for (const [index, team] of teams.entries()) {
    const raw = await readFile(new URL(`${team}.enc.json`, root), 'utf8');
    for (const secret of allSecrets) assert(!raw.includes(secret));
    const original = await decrypt(JSON.parse(raw), allSecrets[index]);
    for (const file of original.files) assert.deepEqual(Buffer.from(file.content, 'base64'), await readFile(new URL(`.private-source/${team}/site/${file.path}`, root)), `${team}/${file.path}`);
    assert(original.files.some(f => f.path === 'assets/stadium.jpg'));
    const sandbox = { window: {} };
    vm.runInNewContext(Buffer.from(original.files.find(f => f.path === 'data.js').content, 'base64').toString(), sandbox);
    for (const name of ['index.html', 'gate.js', 'gate.css', 'README.md', 'scripts/build-protected.mjs']) {
      const publicText = await readFile(new URL(name, root), 'utf8');
      for (const secret of allSecrets) assert(!publicText.includes(secret), name);
      for (const player of sandbox.window.CLUB_DATA.players) {
        assert(!publicText.includes(player.name), name);
        assert(!publicText.includes(player.studentId), name);
      }
    }
  }
});

test('cloud packages restore both teams; failed two-team rotation changes neither passwords nor public packages', async () => {
  const scratch = await mkdtemp(path.join(tmpdir(), 'csfc-teams-'));
  const run = promisify(execFile);
  try {
    await mkdir(path.join(scratch, 'scripts'));
    for (const name of ['crypto.mjs', 'build-protected.mjs']) await copyFile(new URL(`scripts/${name}`, root), path.join(scratch, 'scripts', name));
    for (const team of teams) {
      await mkdir(path.join(scratch, '.private-source', team), { recursive: true });
      await copyFile(new URL(`${team}.enc.json`, root), path.join(scratch, `${team}.enc.json`));
      await copyFile(new URL(`.private-source/${team}/access-password.txt`, root), path.join(scratch, '.private-source', team, 'access-password.txt'));
    }
    await run(process.execPath, [path.join(scratch, 'scripts', 'build-protected.mjs'), '--recover']);
    for (const team of teams) {
      const original = await decrypt(await envelopeFor(team), await secretFor(team));
      for (const file of original.files) assert.deepEqual(await readFile(path.join(scratch, '.private-source', team, 'site', file.path)), Buffer.from(file.content, 'base64'));
    }
    await writeFile(path.join(scratch, '.private-source', 'women', 'site', 'data.js'), 'window.CLUB_DATA={team:{division:"女队"},players:[{photo:"https://example.com/private-photo.jpg"}],albums:[]};');
    await assert.rejects(run(process.execPath, [path.join(scratch, 'scripts', 'build-protected.mjs'), '--rotate-password']));
    for (const team of teams) {
      assert.equal((await readFile(path.join(scratch, '.private-source', team, 'access-password.txt'), 'utf8')).trim(), await secretFor(team));
      assert.deepEqual(await readFile(path.join(scratch, `${team}.enc.json`)), await readFile(new URL(`${team}.enc.json`, root)));
    }
  } finally { await rm(scratch, { recursive: true, force: true }); }
});
