/* ============================================================
   WIN95 WINDOW MANAGER + PAGE NAVIGATOR
   ============================================================ */

/* ---- Page navigation ---- */
const PAGES      = ['inicio', 'portfolio', 'about', 'contact'];
const PAGE_NAMES = { inicio: 'Início', portfolio: 'Portfolio', about: 'Sobre Mim', contact: 'Contacto' };
const PAGE_ICONS = { inicio: 'bx bxs-home', portfolio: 'bx bxs-folder-open', about: 'bx bxs-female', contact: 'bx bxs-envelope' };

let currentPage = 0;

function goToPage(id) {
  const idx = PAGES.indexOf(id);
  if (idx < 0) return;
  PAGES.forEach(p => document.getElementById('page-' + p)?.classList.add('hidden'));
  document.getElementById('page-' + id)?.classList.remove('hidden');
  currentPage = idx;
  const content = document.querySelector('#win-main .window-content');
  if (content) content.scrollTop = 0;
  _updateNav();
  WM.open('main');
}

function nextPage() { goToPage(PAGES[(currentPage + 1) % PAGES.length]); }
function prevPage() { goToPage(PAGES[(currentPage - 1 + PAGES.length) % PAGES.length]); }

function _updateNav() {
  const id   = PAGES[currentPage];
  const name = PAGE_NAMES[id];
  const el   = (sel) => document.getElementById(sel);
  if (el('main-win-title'))  el('main-win-title').textContent  = name + ' — Isabela Andrade';
  if (el('page-indicator'))  el('page-indicator').textContent  = `${name} (${currentPage + 1}/${PAGES.length})`;
  if (el('nav-icon'))        el('nav-icon').className          = PAGE_ICONS[id];
  const tbSpan = document.querySelector('#tbtn-main span');
  if (tbSpan) tbSpan.textContent = name;
}

/* ---- Window Manager ---- */
const WM = {
  zTop: 100,
  states: {},
  prevRects: {},

  TITLES: { main: 'Início — Isabela Andrade', themes: 'Aparência' },
  ICONS:  { main: 'bx bxs-home',             themes: 'bx bxs-palette' },

  open(id) {
    const win = this._win(id);
    if (!win) return;
    const s = this.states[id] || 'closed';
    if (s === 'closed') {
      win.classList.remove('hidden', 'minimized');
      this.states[id] = 'open';
      this._addTaskbarBtn(id);
    } else if (s === 'minimized') {
      win.classList.remove('minimized');
      this.states[id] = 'open';
    }
    this.focus(id);
    this._syncBtn(id);
  },

  close(id) {
    const win = this._win(id);
    if (!win) return;
    win.classList.add('hidden');
    win.classList.remove('minimized', 'focused', 'maximized');
    this.states[id] = 'closed';
    this._removeTaskbarBtn(id);
  },

  minimize(id) {
    const win = this._win(id);
    if (!win || !this.states[id] || this.states[id] === 'closed') return;
    win.classList.add('minimized');
    win.classList.remove('focused');
    this.states[id] = 'minimized';
    this._syncBtn(id);
    this._focusTop();
  },

  toggleMaximize(id) {
    const win = this._win(id);
    if (!win) return;
    const icon = win.querySelector('.maximize-icon');
    if (win.classList.contains('maximized')) {
      const r = this.prevRects[id];
      if (r) { win.style.left = r.left; win.style.top = r.top; win.style.width = r.width; win.style.height = r.height; }
      win.classList.remove('maximized');
      if (icon) icon.textContent = '□';
    } else {
      this.prevRects[id] = { left: win.style.left, top: win.style.top, width: win.style.width, height: win.style.height };
      const d = document.getElementById('desktop');
      win.style.left = '0'; win.style.top = '0';
      win.style.width = d.clientWidth + 'px'; win.style.height = d.clientHeight + 'px';
      win.classList.add('maximized');
      if (icon) icon.textContent = '❐';
    }
    this.focus(id);
  },

  focus(id) {
    document.querySelectorAll('.window').forEach(w => w.classList.remove('focused'));
    document.querySelectorAll('.taskbar-btn').forEach(b => b.classList.remove('active'));
    const win = this._win(id);
    if (win && !win.classList.contains('minimized')) { win.style.zIndex = ++this.zTop; win.classList.add('focused'); }
    const btn = document.getElementById('tbtn-' + id);
    if (btn && this.states[id] === 'open') btn.classList.add('active');
  },

  _focusTop() {
    const open = Object.entries(this.states)
      .filter(([, s]) => s === 'open')
      .map(([id]) => ({ id, z: parseInt(this._win(id)?.style.zIndex || 0) }))
      .sort((a, b) => b.z - a.z);
    if (open.length) this.focus(open[0].id);
  },

  _win(id) { return document.getElementById('win-' + id); },

  _addTaskbarBtn(id) {
    if (document.getElementById('tbtn-' + id)) return;
    const bar = document.getElementById('taskbar-windows');
    const btn = document.createElement('button');
    btn.id = 'tbtn-' + id;
    btn.className = 'taskbar-btn';
    btn.innerHTML = `<i class="${this.ICONS[id] || 'bx bxs-window-alt'}"></i><span>${this.TITLES[id] || id}</span>`;
    btn.onclick = () => {
      if (this.states[id] === 'minimized') { this.open(id); }
      else if (this.states[id] === 'open') { this._win(id)?.classList.contains('focused') ? this.minimize(id) : this.focus(id); }
    };
    bar.appendChild(btn);
  },

  _removeTaskbarBtn(id) { document.getElementById('tbtn-' + id)?.remove(); },
  _syncBtn(id) {
    const btn = document.getElementById('tbtn-' + id);
    if (btn) btn.classList.toggle('active', this.states[id] === 'open');
  }
};

/* ---- Drag ---- */
function setupDrag(win) {
  const tb = win.querySelector('.titlebar');
  if (!tb) return;
  tb.addEventListener('dblclick', e => {
    if (e.target.closest('.titlebar-controls')) return;
    WM.toggleMaximize(win.id.replace('win-', ''));
  });
  tb.addEventListener('mousedown', e => {
    if (e.button !== 0 || e.target.closest('.titlebar-controls')) return;
    if (window.matchMedia('(max-width: 768px)').matches) return;
    const id = win.id.replace('win-', '');
    WM.focus(id);
    if (win.classList.contains('maximized')) return;
    let ox = e.clientX - win.offsetLeft, oy = e.clientY - win.offsetTop;
    e.preventDefault();
    const d = document.getElementById('desktop');
    const move = e => {
      win.style.left = Math.max(-win.offsetWidth + 60, Math.min(e.clientX - ox, d.clientWidth - 60)) + 'px';
      win.style.top  = Math.max(0, Math.min(e.clientY - oy, d.clientHeight - 22)) + 'px';
    };
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });
}

/* ---- Resize (8 handles) ---- */
function setupResize(win) {
  ['n','ne','e','se','s','sw','w','nw'].forEach(dir => {
    const h = document.createElement('div');
    h.className = `resize-handle resize-${dir}`;
    win.appendChild(h);
    h.addEventListener('mousedown', e => {
      if (e.button !== 0 || win.classList.contains('maximized')) return;
      if (window.matchMedia('(max-width: 768px)').matches) return;
      e.preventDefault(); e.stopPropagation();
      const sx = e.clientX, sy = e.clientY, sl = win.offsetLeft, st = win.offsetTop, sw = win.offsetWidth, sh = win.offsetHeight;
      const MIN_W = 360, MIN_H = 200;
      const move = e => {
        const dx = e.clientX - sx, dy = e.clientY - sy;
        let l = sl, t = st, w = sw, hh = sh;
        if (dir.includes('e')) w  = Math.max(MIN_W, sw + dx);
        if (dir.includes('s')) hh = Math.max(MIN_H, sh + dy);
        if (dir.includes('w')) { w  = Math.max(MIN_W, sw - dx); l = sl + (sw - w); }
        if (dir.includes('n')) { hh = Math.max(MIN_H, sh - dy); t = st + (sh - hh); }
        win.style.width = w + 'px'; win.style.height = hh + 'px';
        win.style.left  = l + 'px'; win.style.top    = t + 'px';
      };
      const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });
  });
}

/* ---- Init ---- */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.window').forEach(win => {
    setupDrag(win);
    setupResize(win);
    win.addEventListener('mousedown', () => {
      const id = win.id.replace('win-', '');
      if (WM.states[id] === 'open') WM.focus(id);
    });
  });

  // Close start menu on outside click
  document.addEventListener('mousedown', e => {
    const menu = document.getElementById('start-menu');
    const btn  = document.getElementById('start-btn');
    if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
      menu.classList.add('hidden');
      btn.classList.remove('pressed');
    }
  });

  // Desktop right-click context menu
  const ctxMenu = document.getElementById('ctx-menu');
  document.getElementById('desktop').addEventListener('contextmenu', e => {
    if (e.target.closest('.window, #taskbar, #start-menu')) return;
    e.preventDefault();
    ctxMenu.classList.remove('hidden');
    const mx = Math.min(e.clientX, window.innerWidth  - ctxMenu.offsetWidth  - 4);
    const my = Math.min(e.clientY, window.innerHeight - ctxMenu.offsetHeight - 44);
    ctxMenu.style.left = mx + 'px'; ctxMenu.style.top = my + 'px';
  });
  document.addEventListener('mousedown', e => { if (!ctxMenu.contains(e.target)) ctxMenu.classList.add('hidden'); });

  // Date-time tick
  const DAYS   = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  function tick() {
    const d = new Date();
    const timeStr = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    const dateStr = `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
    const clockEl = document.getElementById('clock');
    const dateEl  = document.getElementById('tray-date');
    if (clockEl) clockEl.textContent = timeStr;
    if (dateEl)  dateEl.textContent  = dateStr;
  }
  tick(); setInterval(tick, 1000);

  // Typing effect
  const texts = ['Comunicadora','Estratega','Marketeer','Publicitária','CopyWriter'];
  let ti = 0;
  const typingEl = document.getElementById('typing-text');
  if (typingEl) {
    typingEl.textContent = texts[0];
    setInterval(() => { ti = (ti + 1) % texts.length; typingEl.textContent = texts[ti]; }, 3000);
  }

  // Keyboard arrow navigation
  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'ArrowRight') nextPage();
    if (e.key === 'ArrowLeft')  prevPage();
  });

  // Center and size main window on load (desktop only)
  if (!window.matchMedia('(max-width: 768px)').matches) {
    const mainWin = document.getElementById('win-main');
    if (mainWin) {
      const d = document.getElementById('desktop');
      const w = Math.min(1000, Math.max(740, d.clientWidth  - 80));
      const h = Math.min(740,  Math.max(560, d.clientHeight - 80));
      mainWin.style.width  = w + 'px';
      mainWin.style.height = h + 'px';
      mainWin.style.left   = Math.max(0, (d.clientWidth  - w) / 2) + 'px';
      mainWin.style.top    = Math.max(0, (d.clientHeight - h) / 2) + 'px';
    }
  }

  // Load theme and open home
  setTheme(localStorage.getItem('win95-theme') || 'classic');
  goToPage('inicio');
});

/* ---- Public helpers ---- */
function setTheme(name) {
  document.body.dataset.theme = name;
  localStorage.setItem('win95-theme', name);
  document.querySelectorAll('.theme-swatch').forEach(s => s.classList.toggle('selected', s.dataset.theme === name));
}

function toggleStartMenu() {
  const menu = document.getElementById('start-menu');
  const btn  = document.getElementById('start-btn');
  const hidden = menu.classList.toggle('hidden');
  btn.classList.toggle('pressed', !hidden);
}

function playAudio(src) {
  const audio = document.getElementById('audio'), source = document.getElementById('audio-source');
  if (!audio || !source) return;
  source.src = src; audio.load(); audio.play();
}
