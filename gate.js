(() => {
  'use strict';
  const ITERATIONS = 600000;
  const AAD = 'CSFC website v1 / AES-256-GCM / PBKDF2-SHA256';
  const form = document.getElementById('unlock-form');
  const field = document.getElementById('access-password');
  const submit = document.getElementById('unlock-submit');
  const toggle = document.getElementById('show-password');
  const status = document.getElementById('unlock-status');
  const choices = document.querySelectorAll('button[data-team]');
  const teams = { men: { label: '男队', file: './men.enc.json' }, women: { label: '女队', file: './women.enc.json' } };
  const encoder = new TextEncoder();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const packages = new Map();
  let currentTeam = new URLSearchParams(location.search).get('team') === 'women' ? 'women' : 'men';
  function selectTeam(team, changeUrl = true) {
    currentTeam = team;
    const label = teams[team].label;
    choices.forEach((button) => {
      const selected = button.dataset.team === team;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    document.getElementById('selected-team-label').textContent = `CSFC / ${label}`;
    document.getElementById('unlock-title').innerHTML = `进入${label}主场<span style="color:#ed783f">.</span>`;
    document.getElementById('password-label').textContent = `${label}访问密码`;
    document.title = `CSFC · ${label}访问入口`;
    field.value = '';
    field.type = 'password';
    field.removeAttribute('aria-invalid');
    toggle.textContent = '显示';
    toggle.setAttribute('aria-pressed', 'false');
    status.textContent = '';
    if (changeUrl) {
      const url = new URL(location.href);
      url.searchParams.set('team', team);
      url.hash = '';
      history.replaceState(null, '', url);
    }
  }
  choices.forEach((button) => button.addEventListener('click', () => { if (!submit.disabled) selectTeam(button.dataset.team); }));
  selectTeam(currentTeam, false);
  function fromBase64(value) { return Uint8Array.from(atob(value), (char) => char.charCodeAt(0)); }
  function getPackage(team) {
    if (!packages.has(team)) {
      const promise = fetch(teams[team].file, { cache: 'no-store' }).then(async (response) => {
        if (!response.ok) throw new Error('package-unavailable');
        const envelope = await response.json();
        if (envelope.version !== 1 || envelope.algorithm !== 'AES-256-GCM' || envelope.kdf !== 'PBKDF2-SHA256' || envelope.iterations !== ITERATIONS) throw new Error('invalid-package');
        return envelope;
      }).catch((error) => { packages.delete(team); throw error; });
      packages.set(team, promise);
    }
    return packages.get(team);
  }
  async function decrypt(envelope, password) {
    const salt = fromBase64(envelope.salt);
    const iv = fromBase64(envelope.iv);
    if (salt.length !== 16 || iv.length !== 12 || envelope.ciphertext.length > 92 * 1024 * 1024) throw new Error('invalid-package');
    const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(AAD), tagLength: 128 }, key, fromBase64(envelope.ciphertext));
    return JSON.parse(decoder.decode(plaintext));
  }
  function mountWebsite(payload, team) {
    if (payload.version !== 1 || payload.team !== team || !Array.isArray(payload.files)) throw new Error('invalid-package');
    const text = (name) => {
      const file = payload.files.find((item) => item.path === name);
      if (!file) throw new Error('invalid-package');
      return decoder.decode(fromBase64(file.content));
    };
    const assets = Object.create(null);
    for (const file of payload.files) {
      if (!file.path.startsWith('assets/') || !file.mime.startsWith('image/')) continue;
      const url = URL.createObjectURL(new Blob([fromBase64(file.content)], { type: file.mime }));
      assets[`./${file.path}`] = url;
      assets[file.path] = url;
    }
    let html = text('index.html');
    html = html.replace(/\b(src|href)=(['"])([^'"]+)\2/g, (original, attribute, quote, value) => Object.hasOwn(assets, value) ? `${attribute}=${quote}${assets[value]}${quote}` : original);
    const page = new DOMParser().parseFromString(html, 'text/html');
    page.querySelectorAll('script, link[rel="stylesheet"]').forEach((element) => element.remove());
    const style = page.createElement('style');
    style.textContent = text('styles.css');
    page.head.append(style);
    document.documentElement.lang = page.documentElement.lang || 'zh-CN';
    document.head.replaceChildren(...page.head.childNodes);
    document.body.replaceChildren(...page.body.childNodes);
    window.CLUB_ASSETS = assets;
    for (const name of ['data.js', 'app.js']) {
      const script = document.createElement('script');
      script.textContent = text(name);
      document.body.append(script);
    }
    document.getElementById('lock-site').addEventListener('click', () => {
      const url = new URL(location.href);
      url.searchParams.set('team', team);
      url.hash = '';
      location.replace(url.href);
    });
    window.addEventListener('pageshow', (event) => { if (event.persisted) location.reload(); });
  }
  toggle.addEventListener('click', () => {
    const show = field.type === 'password';
    field.type = show ? 'text' : 'password';
    toggle.textContent = show ? '隐藏' : '显示';
    toggle.setAttribute('aria-pressed', String(show));
  });
  field.addEventListener('input', () => { field.removeAttribute('aria-invalid'); status.textContent = ''; });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    if (!crypto.subtle) { status.textContent = '当前浏览器无法解锁，请用新版 Safari、Chrome 或 Edge 打开 HTTPS 网站。'; return; }
    let password = field.value;
    if (!password) { field.focus(); return; }
    submit.disabled = true;
    choices.forEach((button) => { button.disabled = true; });
    submit.textContent = '正在解锁…';
    form.setAttribute('aria-busy', 'true');
    status.textContent = '正在打开我们的主场…';
    let stage = 'download';
    const team = currentTeam;
    try {
      const envelope = await getPackage(team);
      stage = 'decrypt';
      const payload = await decrypt(envelope, password);
      stage = 'mount';
      field.value = '';
      password = '';
      // No password, key or decrypted content is saved in browser storage.
      mountWebsite(payload, team);
    } catch (error) {
      if (stage === 'decrypt' && error.name === 'OperationError') {
        status.textContent = `${teams[team].label}密码不正确，请确认选择的球队后重新输入。`;
        field.setAttribute('aria-invalid', 'true');
        field.focus();
        field.select();
      } else status.textContent = '网站暂时无法打开，请检查网络后重试，或联系球队管理员。';
      submit.disabled = false;
      choices.forEach((button) => { button.disabled = false; });
      submit.innerHTML = '进入我们的主场 <span aria-hidden="true">↗</span>';
      form.setAttribute('aria-busy', 'false');
    } finally { password = ''; }
  });
})();
