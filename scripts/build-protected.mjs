import { readFile, writeFile, mkdir, readdir, realpath, chmod, rename } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import { encrypt, decrypt } from './crypto.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const privateRoot = path.join(root, '.private-source');
const teamLabels = { men: '男队', women: '女队' };
const mimeTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif' };
let selected = 'all';
let mode = 'build';
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--team') selected = args[++i];
  else if (args[i] === '--rotate-password' && mode === 'build') mode = 'rotate';
  else if (args[i] === '--recover' && mode === 'build') mode = 'recover';
  else throw new Error('Usage: node scripts/build-protected.mjs [--team men|women|all] [--rotate-password|--recover]');
}
if (!['all', 'men', 'women'].includes(selected)) throw new Error('Unknown team.');
const selectedTeams = selected === 'all' ? ['men', 'women'] : [selected];
await mkdir(privateRoot, { recursive: true, mode: 0o700 });
await chmod(privateRoot, 0o700);

function safeRelative(value) {
  if (typeof value !== 'string') throw new Error('Invalid file path.');
  const normalized = value.replace(/^\.\//, '');
  if (normalized.includes('\\') || normalized.split('/').includes('..') || path.isAbsolute(normalized) || /[?#:]/.test(normalized)) throw new Error('Use local image paths inside assets/. External images cannot be protected.');
  return normalized;
}

async function collectFiles(source) {
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
  return files;
}

async function prepareTeam(team) {
  const teamRoot = path.join(privateRoot, team);
  const source = path.join(teamRoot, 'site');
  const passwordPath = path.join(teamRoot, 'access-password.txt');
  const envelopePath = path.join(root, `${team}.enc.json`);
  await mkdir(teamRoot, { recursive: true, mode: 0o700 });
  await chmod(teamRoot, 0o700);
  let password;
  try { password = (await readFile(passwordPath, 'utf8')).trim(); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    if (mode === 'recover') throw new Error(`Put the existing password in .private-source/${team}/access-password.txt before recovering.`);
  }
  const oldPassword = password;
  const generatedPassword = !password || mode === 'rotate';
  if (generatedPassword) password = randomBytes(18).toString('base64url').match(/.{4}/g).join('-');
  // Accept the shared passwords deliberately chosen by the site owner.
  if (password.length < 8) throw new Error('Use a password of at least 8 characters; long random passwords are recommended.');

  if (mode === 'recover') {
    const payload = await decrypt(JSON.parse(await readFile(envelopePath, 'utf8')), password);
    if (payload.version !== 1 || payload.team !== team || !Array.isArray(payload.files)) throw new Error('Invalid team payload.');
    for (const file of payload.files) {
      const name = safeRelative(file.path);
      if (!['index.html', 'styles.css', 'app.js', 'data.js'].includes(name) && !name.startsWith('assets/')) throw new Error('Unexpected source file.');
      const target = path.join(source, name);
      await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
      await writeFile(target, Buffer.from(file.content, 'base64'), { flag: 'wx', mode: 0o600 });
    }
    console.log(`${teamLabels[team]} source restored locally; existing files are never overwritten.`);
    return null;
  }

  const files = await collectFiles(source);
  const sandbox = { window: {} };
  vm.runInNewContext(await readFile(path.join(source, 'data.js'), 'utf8'), sandbox, { timeout: 1000 });
  const club = sandbox.window.CLUB_DATA;
  if (!club || club.team?.division !== teamLabels[team] || !Array.isArray(club.players) || !Array.isArray(club.albums)) throw new Error('Invalid team data or team identity.');
  for (const entry of [...club.players, ...club.albums]) {
    if (!entry.photo) continue;
    const name = safeRelative(entry.photo);
    if (!name.startsWith('assets/') || !files.some((file) => file.path === name && file.mime.startsWith('image/'))) throw new Error('Image missing from protected bundle.');
  }
  const payload = { version: 1, team, files };
  if (Buffer.byteLength(JSON.stringify(payload)) > 64 * 1024 * 1024) throw new Error('Photo bundle too large. Resize photos first.');
  const envelope = await encrypt(payload, password);
  if (JSON.stringify(await decrypt(envelope, password)) !== JSON.stringify(payload)) throw new Error('Package verification failed.');
  const output = `${JSON.stringify(envelope)}\n`;
  if (output.includes(password)) throw new Error('Password leaked into public package.');
  return { team, passwordPath, password, oldPassword, generatedPassword, envelopePath, output, fileCount: files.length };
}

// Validate every requested team before replacing any public package or password.
const prepared = [];
for (const team of selectedTeams) {
  const result = await prepareTeam(team);
  if (result) prepared.push(result);
}
for (const item of prepared) {
  if (item.generatedPassword) {
    if (item.oldPassword) await writeFile(path.join(privateRoot, item.team, 'access-password.previous.txt'), `${item.oldPassword}\n`, { mode: 0o600 });
    await writeFile(item.passwordPath, `${item.password}\n`, { mode: 0o600 });
    console.log(`${teamLabels[item.team]} password saved locally, never published.`);
  }
  await chmod(item.passwordPath, 0o600);
  const temporary = path.join(privateRoot, `${item.team}.enc.next.json`);
  await writeFile(temporary, item.output, { mode: 0o600 });
  await rename(temporary, item.envelopePath);
  console.log(`${teamLabels[item.team]}: encrypted and verified ${item.fileCount} website files.`);
}
