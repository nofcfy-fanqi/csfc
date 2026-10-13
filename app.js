(() => {
  "use strict";
  const data = window.CLUB_DATA;
  const byId = (id) => document.getElementById(id);
  const codes = { 门将: "GK", 后卫: "DF", 中场: "MF", 前锋: "FW" };
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  // Accept local image paths and HTTP(S) sources; reject executable URL schemes.
  const imagePath = (value) => {
    if (!value || typeof value !== "string") return "";
    try {
      const url = new URL(value, window.location.href);
      return ["https:", "http:", "file:"].includes(url.protocol) ? url.href : "";
    } catch { return ""; }
  };
  const jersey = (player) => `<div class="jersey" aria-hidden="true"><svg viewBox="0 0 200 200" fill="none"><path d="M67 24 42 35 12 65 36 89 56 73v112h88V73l20 16 24-24-30-30-25-11c-5 12-14 18-33 18S72 36 67 24Z" fill="${player.position === "门将" ? "#d3b77b" : "#194b3a"}"/><path d="m67 24 13 17c11 7 29 7 40 0l13-17" stroke="${player.position === "门将" ? "#274a35" : "#e5ddc4"}" stroke-width="5"/><path d="m12 65 24 24m128 0 24-24" stroke="#ddd5bd" stroke-width="6"/><path d="M58 181h84" stroke="#ffffff" stroke-opacity=".15" stroke-width="2"/><path d="M60 60v107m80-107v107" stroke="#ffffff" stroke-opacity=".05" stroke-width="2"/></svg><span class="jersey-name">${escape(player.jerseyName)}</span><span class="jersey-number">${escape(player.number)}</span></div>`;
  let currentPosition = "all";
  let currentCategory = "all";
  let dialogTrigger = null;

  document.querySelectorAll("[data-team-name]").forEach((node) => { node.textContent = data.team.name; });
  document.title = `${data.team.name} · 我们的主场`;
  byId("team-tagline").textContent = data.team.tagline;
  byId("demo-note").hidden = !data.team.demo;
  byId("copyright-year").textContent = new Date().getFullYear();
  byId("total-count").textContent = data.players.length;

  function renderPlayers() {
    const query = byId("player-search").value.trim().toLocaleLowerCase();
    const players = data.players.filter((player) => {
      const inPosition = currentPosition === "all" || player.position === currentPosition;
      const fields = [player.name, player.studentId, player.jerseyName, player.number, player.position, codes[player.position]];
      return inPosition && fields.some((field) => String(field ?? "").toLocaleLowerCase().includes(query));
    });
    byId("player-grid").innerHTML = players.map((player) => {
      const index = data.players.indexOf(player);
      const photo = imagePath(player.photo);
      return `<article class="player-card ${player.position === "门将" ? "is-goalkeeper" : ""}"><button class="player-card-button" type="button" data-player="${index}" aria-label="查看${escape(player.name)}的队员信息"><div class="player-visual"><span class="position-code">${escape(codes[player.position] || "PLAYER")}</span><span class="visual-number" aria-hidden="true">${escape(player.number)}</span>${photo ? `<img class="player-portrait" src="${escape(photo)}" alt="${escape(player.name)}" loading="lazy">` : jersey(player)}</div><div class="player-info"><div class="player-name-row"><h3>${escape(player.name)}</h3><span class="position-badge">${escape(player.position)}</span></div><p class="player-print">印字 ${escape(player.jerseyName)} &nbsp;·&nbsp; 印号 ${escape(player.number)}</p><div class="player-id-row"><span>学号</span><b>${escape(player.studentId)}</b></div></div><span class="card-arrow" aria-hidden="true">↗</span></button></article>`;
    }).join("");
    byId("empty-state").hidden = players.length > 0;
    byId("visible-count").textContent = `显示 ${players.length} / ${data.players.length} 位队员`;
    byId("search-status").textContent = `找到 ${players.length} 位队员`;
    attachImageFallbacks(byId("player-grid"));
  }

  function attachImageFallbacks(container) {
    container.querySelectorAll("img.player-portrait").forEach((img) => {
      img.addEventListener("error", () => {
        const index = img.closest("[data-player]").dataset.player;
        img.outerHTML = jersey(data.players[index]);
      }, { once: true });
    });
  }

  function updateFilters(container, key, value) {
    container.querySelectorAll("button").forEach((button) => {
      const active = button.dataset[key] === value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  byId("position-filters").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-position]");
    if (!button) return;
    currentPosition = button.dataset.position;
    updateFilters(byId("position-filters"), "position", currentPosition);
    renderPlayers();
  });
  byId("player-search").addEventListener("input", renderPlayers);
  byId("clear-search").addEventListener("click", () => {
    currentPosition = "all";
    byId("player-search").value = "";
    updateFilters(byId("position-filters"), "position", currentPosition);
    renderPlayers();
    byId("player-search").focus();
  });

  function showDialog(dialog, trigger) {
    dialogTrigger = trigger;
    dialog.showModal();
    document.body.style.overflow = "hidden";
  }

  byId("player-grid").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-player]");
    if (!button) return;
    const player = data.players[Number(button.dataset.player)];
    const photo = imagePath(player.photo);
    const details = [["名字", player.name], ["学号", player.studentId], ["球衣印字", player.jerseyName], ["球衣印号", player.number], ["场上位置", player.position]];
    byId("player-dialog-content").innerHTML = `<div class="dialog-player-visual ${player.position === "门将" ? "is-goalkeeper" : ""}">${photo ? `<img src="${escape(photo)}" alt="${escape(player.name)}">` : jersey(player)}</div><div class="dialog-player-info"><p class="eyebrow">${escape(data.team.name)} / ${escape(codes[player.position] || "PLAYER")}</p><h2 id="player-dialog-title">${escape(player.name)}</h2><dl class="player-details">${details.map(([key, value]) => `<div class="detail-row"><dt>${key}</dt><dd>${escape(value)}</dd></div>`).join("")}</dl>${data.team.demo ? '<p class="dialog-demo-note">当前为示例队员资料。</p>' : ""}</div>`;
    const portrait = byId("player-dialog-content").querySelector("img");
    if (portrait) portrait.addEventListener("error", () => { portrait.outerHTML = jersey(player); }, { once: true });
    showDialog(byId("player-dialog"), button);
  });

  const camera = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.25" aria-hidden="true"><path d="M8 15h9l3-5h8l3 5h9v25H8Z"/><circle cx="24" cy="27" r="8"/><path d="M35 21h2"/></svg>';
  const pitch = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.25" aria-hidden="true"><path d="M9 5h30v38H9Z M9 24h30 M17 5v7h14V5 M17 43v-7h14v7"/><circle cx="24" cy="24" r="6"/></svg>';
  function placeholder(album) {
    return `${album.category === "训练" ? pitch : camera}<span class="placeholder-title">${escape(album.placeholder || "CLUB MOMENTS")}</span><span class="placeholder-hint">照片待上传</span>`;
  }

  function renderAlbums() {
    const albums = data.albums.filter((album) => currentCategory === "all" || album.category === currentCategory);
    byId("album-grid").innerHTML = albums.length ? albums.map((album) => {
      const photo = imagePath(album.photo);
      const index = data.albums.indexOf(album);
      return `<article class="album-card">${photo ? `<button class="album-cover has-photo" type="button" data-album="${index}" aria-label="放大照片：${escape(album.title)}"><img src="${escape(photo)}" alt="${escape(album.title)}" loading="lazy">${album.sample ? '<span class="sample-label">氛围示例</span>' : ""}</button>` : `<div class="album-cover album-placeholder" data-category="${escape(album.category)}">${placeholder(album)}</div>`}<div class="album-card-info"><div class="album-meta">${escape(album.category)}${album.sample ? " / 示例照片" : ""}</div><h3>${escape(album.title)}</h3><p class="album-description">${escape(album.description)}</p></div></article>`;
    }).join("") : '<p class="album-empty">这里还没有照片，下一次上场就有新的故事。</p>';
    byId("album-status").textContent = `当前分类有 ${albums.length} 个相册条目`;
    byId("album-grid").querySelectorAll("img").forEach((img) => {
      img.addEventListener("error", () => {
        const button = img.closest("button");
        const album = data.albums[Number(button.dataset.album)];
        const fallback = document.createElement("div");
        fallback.className = "album-cover album-placeholder";
        fallback.dataset.category = album.category;
        fallback.innerHTML = placeholder(album);
        button.replaceWith(fallback);
      }, { once: true });
    });
  }
  byId("album-filters").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-category]");
    if (!button) return;
    currentCategory = button.dataset.category;
    updateFilters(byId("album-filters"), "category", currentCategory);
    renderAlbums();
  });
  byId("album-grid").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-album]");
    if (!button) return;
    const album = data.albums[Number(button.dataset.album)];
    byId("photo-dialog-image").src = imagePath(album.photo);
    byId("photo-dialog-image").alt = album.title;
    byId("photo-dialog-title").textContent = album.title;
    byId("photo-dialog-description").textContent = album.description;
    showDialog(byId("photo-dialog"), button);
  });

  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      const rect = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
    });
    dialog.addEventListener("close", () => {
      document.body.style.overflow = "";
      if (dialogTrigger?.isConnected) dialogTrigger.focus({ preventScroll: true });
      dialogTrigger = null;
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      document.querySelectorAll(".nav-link").forEach((link) => {
        const active = link.hash === `#${entry.target.id}`;
        link.classList.toggle("active", active);
        if (active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    });
  }, { rootMargin: "-15% 0px -60% 0px", threshold: 0 });
  document.querySelectorAll("main section[id]").forEach((section) => observer.observe(section));
  renderPlayers();
  renderAlbums();
})();
