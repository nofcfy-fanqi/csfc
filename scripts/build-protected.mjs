import { readFile, writeFile, mkdir, readdir, realpath, chmod } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import { encrypt, decrypt } from './crypto.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const privateRoot = path.join(root, '.private-source');
const source = path.join(privateRoot, 'site');
const passwordPath = path.join(privateRoot, 'access-password.txt');
const envelopePath = path.join(root, 'site.enc.json');
const mimeTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif' };
const mode = process.argv[2];
if (mode && !['--rotate-password', '--recover'].includes(mode)) throw new Error('Usage: node scripts/build-protected.mjs [--rotate-password | --recover]');
await mkdir(privateRoot, { recursive: true, mode: 0o700 });
await chmod(privateRoot, 0o700);
let password;
try { password = (await readFile(passwordPath, 'utf8')).trim(); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  if (mode === '--recover') throw new Error('Put the site password in .private-source/access-password.txt before recovering.');
}
const oldPassword = password;
const generatedPassword = !password || mode === '--rotate-password';
if (generatedPassword) {
  password = randomBytes(18).toString('base64url').match(/.{4}/g).join('-');
}
if (password.length < 20) throw new Error('Use a random password of at least 20 characters.');
function safeRelative(value) {
  if (typeof value !== 'string') throw new Error('Invalid file path.');
  const normalized = value.replace(/^\.\//, '');
  if (normalized.includes('\\') || normalized.split('/').includes('..') || path.isAbsolute(normalized) || /[?#:]/.test(normalized)) throw new Error('Use local image paths inside assets/. External images cannot be protected.');
  return normalized;
}
if (mode === '--recover') {
  const payload = await decrypt(JSON.parse(await readFile(envelopePath, 'utf8')), password);
  if (payload.version !== 1 || !Array.isArray(payload.files)) throw new Error('Invalid website payload.');
  for (const file of payload.files) {
    const name = safeRelative(file.path);
    if (!['index.html', 'styles.css', 'app.js', 'data.js'].includes(name) && !name.startsWith('assets/')) throw new Error('Unexpected source file.');
    const target = path.join(source, name);
    await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(target, Buffer.from(file.content, 'base64'), { flag: 'wx', mode: 0o600 });
  }
  console.log('Original site recovered into ignored .private-source/site. Existing files are never overwritten.');
  process.exit(0);
}
const files = [];
const realSource = await realpath(source);
async function addFile(name) {
  const target = await realpath(path.join(source, name));
  if (!target.startsWith(`${realSource}${path.sep}`)) throw new Error('Source symlinks must stay inside private source.');
  const mime = mimeTypes[path.extname(name).toLowerCase()];
  if (!mime) throw new Error('Unsupported source file type.');
  files.push({ path: name, mime, content: (await readFile(target)).toString('base64') });
}
async function addImages(directory) {
  const entries = await readdir(path.join(source, directory), { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.')) continue;
    const name = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await addImages(name);
    else await addFile(name);
  }
}
for (const name of ['index.html', 'styles.css', 'data.js', 'app.js']) await addFile(name);
await addImages('assets');
const sandbox = { window: {} };
vm.runInNewContext(await readFile(path.join(source, 'data.js'), 'utf8'), sandbox, { timeout: 1000 });
const club = sandbox.window.CLUB_DATA;
if (!club || !Array.isArray(club.players) || !Array.isArray(club.albums)) throw new Error('Invalid team data.');
for (const entry of [...club.players, ...club.albums]) {
  if (!entry.photo) continue;
  const name = safeRelative(entry.photo);
  if (!name.startsWith('assets/') || !files.some((file) => file.path === name && file.mime.startsWith('image/'))) throw new Error('Image missing from protected bundle.');
}
const payload = { version: 1, files };
if (Buffer.byteLength(JSON.stringify(payload)) > 64 * 1024 * 1024) throw new Error('Photo bundle too large. Resize photos first.');
const envelope = await encrypt(payload, password);
if (JSON.stringify(await decrypt(envelope, password)) !== JSON.stringify(payload)) throw new Error('Package verification failed.');
const output = `${JSON.stringify(envelope)}\n`;
if (output.includes(password)) throw new Error('Password leaked into public package.');
// Keep the prior password recoverable, and do not change it on any validation failure.
if (generatedPassword) {
  if (oldPassword) await writeFile(path.join(privateRoot, 'access-password.previous.txt'), `${oldPassword}\n`, { mode: 0o600 });
  await writeFile(passwordPath, `${password}\n`, { mode: 0o600 });
  console.log('Random password saved locally in ignored .private-source/access-password.txt; never published.');
}
await chmod(passwordPath, 0o600);
await writeFile(envelopePath, output);
console.log(`Encrypted and verified ${files.length} website files.`);
