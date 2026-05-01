import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://bhvuebxrszscndefwwer.supabase.co';
const SUPABASE_KEY = 'sb_publishable_NvbGfjb8Vf9heqzL5cW14w_bYmS82Ix';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ARCHIVE_DAYS = 3;
const COMPLETED_HOLD_DAYS = 2;

const EVA_COLORS = [
  { key: 'cyan',    label: 'NEURAL',   hex: '#33ddff' },
  { key: 'orange',  label: 'AMBER',    hex: '#ff8800' },
  { key: 'green',   label: 'NOMINAL',  hex: '#33ff33' },
  { key: 'magenta', label: 'SYNC',     hex: '#ff44aa' },
  { key: 'yellow',  label: 'CAUTION',  hex: '#ffdd33' },
  { key: 'red',     label: 'ALERT',    hex: '#ff3344' },
  { key: 'purple',  label: 'UNIT-01',  hex: '#aa44ff' },
  { key: 'white',   label: 'CORE',     hex: '#cccccc' },
];

function evaColorHex(key) {
  return (EVA_COLORS.find(c => c.key === key) || EVA_COLORS[0]).hex;
}

const expandedTaskNotes = new Set();

let activeColorPicker = null;
function closeColorPicker() {
  if (activeColorPicker) { activeColorPicker.remove(); activeColorPicker = null; }
}
document.addEventListener('click', () => closeColorPicker());

let state = {
  user: null,
  lists: [],
  tasks: [],
};

// ============ SETTINGS ============
const DEFAULT_SETTINGS = { boot: true, scanlines: true, flicker: true, hex: true, chrome: true };

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('magi:settings') || '{}');
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

function saveSettings(settings) {
  localStorage.setItem('magi:settings', JSON.stringify(settings));
}

function applySettings(settings) {
  document.body.classList.toggle('scanlines', settings.scanlines);
  document.body.classList.toggle('flicker', settings.flicker);
  document.body.classList.toggle('show-hex', settings.hex);
  document.body.classList.toggle('show-chrome', settings.chrome);
}

let settings = loadSettings();
applySettings(settings);

// ============ HEX MARGINS ============
function generateHex() {
  const chars = '0123456789ABCDEF';
  let s = '';
  for (let i = 0; i < 800; i++) s += chars[Math.floor(Math.random() * 16)];
  return s;
}

function refreshHex() {
  document.getElementById('hex-left').textContent = generateHex();
  document.getElementById('hex-right').textContent = generateHex();
}
refreshHex();
setInterval(refreshHex, 2000);

// ============ CLOCK ============
function updateClock() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  document.getElementById('clock').textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
updateClock();
setInterval(updateClock, 1000);

// ============ AUTH ============
const authScreen = document.getElementById('auth-screen');
const authMsg = document.getElementById('auth-msg');

document.getElementById('auth-login').addEventListener('click', async () => {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  if (!email || !password) { authMsg.textContent = 'CREDENTIALS REQUIRED'; return; }
  authMsg.textContent = 'AUTHENTICATING...';
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { authMsg.textContent = 'ERROR: ' + error.message.toUpperCase(); return; }
  state.user = data.user;
  authMsg.textContent = 'ACCESS GRANTED';
  enterApp();
});

document.getElementById('auth-signup').addEventListener('click', async () => {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  if (!email || !password) { authMsg.textContent = 'CREDENTIALS REQUIRED'; return; }
  if (password.length < 6) { authMsg.textContent = 'ACCESS CODE: 6+ CHARS REQUIRED'; return; }
  authMsg.textContent = 'REGISTERING...';
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) { authMsg.textContent = 'ERROR: ' + error.message.toUpperCase(); return; }
  if (data.user && !data.session) {
    authMsg.textContent = 'CHECK EMAIL FOR CONFIRMATION';
    return;
  }
  state.user = data.user;
  enterApp();
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  location.reload();
});

// ============ BOOT SEQUENCE ============
const BOOT_LINES = [
  '> SYSTEM INITIALIZATION',
  '> LOADING KERNEL ........................... [OK]',
  '> MAGI-01 MELCHIOR ......................... ONLINE',
  '> MAGI-02 BALTHASAR ........................ ONLINE',
  '> MAGI-03 CASPER ........................... ONLINE',
  '> CHECKING NEURAL LINK ..................... [OK]',
  '> SYNCHRONIZATION RATIO: 87.3%',
  '> CONNECTING TO REMOTE DATABASE ............ [OK]',
  '> LOADING USER PROFILE ..................... [OK]',
  '> DECRYPTING TASK MANIFEST ................. [OK]',
  '> AT FIELD: NOMINAL',
  '> A.T. FIELD STATUS: STABLE',
  '> ',
  '> CODE: 666  PROTECT',
  '> ',
  '> ALL SYSTEMS OPERATIONAL',
  '> ',
  '> WELCOME, OPERATOR.',
];

function runBootSequence() {
  return new Promise(resolve => {
    if (!settings.boot) { resolve(); return; }
    const screen = document.getElementById('boot-screen');
    const log = document.getElementById('boot-log');
    log.innerHTML = '';
    screen.style.display = 'block';
    let i = 0;
    const interval = setInterval(() => {
      if (i >= BOOT_LINES.length) {
        clearInterval(interval);
        setTimeout(() => {
          screen.style.display = 'none';
          resolve();
        }, 600);
        return;
      }
      const line = document.createElement('div');
      line.className = 'boot-line';
      line.textContent = BOOT_LINES[i];
      log.appendChild(line);
      i++;
    }, 110);
  });
}

// ============ ENTER APP ============
async function enterApp() {
  authScreen.style.display = 'none';
  await runBootSequence();
  document.getElementById('app').style.display = 'flex';
  document.getElementById('user-id').textContent = state.user.email.toUpperCase();
  await loadData();
}

// ============ DATA OPS ============
async function loadData() {
  document.getElementById('loading').classList.add('show');

  const { data: lists, error: listErr } = await supabase
    .from('lists')
    .select('*')
    .order('position', { ascending: true });

  if (listErr) {
    console.error(listErr);
    alert('Database error loading lists. Check console + Supabase RLS setup.');
    document.getElementById('loading').classList.remove('show');
    return;
  }

  state.lists = lists || [];

  const { data: tasks, error: taskErr } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (taskErr) {
    console.error(taskErr);
    document.getElementById('loading').classList.remove('show');
    return;
  }

  state.tasks = tasks || [];

  // Auto-archive completed tasks > 3 days old
  await autoArchive();

  document.getElementById('loading').classList.remove('show');
  render();
}

async function autoArchive() {
  const cutoff = new Date(Date.now() - ARCHIVE_DAYS * 86400000).toISOString();
  const toArchive = state.tasks.filter(t =>
    t.completed && !t.archived && t.completed_at && t.completed_at < cutoff
  );
  if (toArchive.length > 0) {
    const ids = toArchive.map(t => t.id);
    await supabase.from('tasks').update({ archived: true }).in('id', ids);
    toArchive.forEach(t => t.archived = true);
  }
}

async function createList(name) {
  const position = state.lists.length;
  const color = EVA_COLORS[state.lists.length % EVA_COLORS.length].key;
  const { data, error } = await supabase
    .from('lists')
    .insert({ name, position, user_id: state.user.id, color })
    .select()
    .single();
  if (error) { alert('Error: ' + error.message); return; }
  state.lists.push(data);
  render();
}

async function renameList(id, name) {
  await supabase.from('lists').update({ name }).eq('id', id);
  const list = state.lists.find(l => l.id === id);
  if (list) list.name = name;
}

async function updateListColor(id, color) {
  await supabase.from('lists').update({ color }).eq('id', id);
  const list = state.lists.find(l => l.id === id);
  if (list) list.color = color;
}

async function deleteList(id) {
  if (!confirm('DELETE THIS LIST AND ALL ITS TASKS?')) return;
  await supabase.from('tasks').delete().eq('list_id', id);
  await supabase.from('lists').delete().eq('id', id);
  state.lists = state.lists.filter(l => l.id !== id);
  state.tasks = state.tasks.filter(t => t.list_id !== id);
  render();
}

async function moveList(id, direction) {
  const idx = state.lists.findIndex(l => l.id === id);
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= state.lists.length) return;
  const a = state.lists[idx], b = state.lists[newIdx];
  [a.position, b.position] = [b.position, a.position];
  state.lists.sort((x, y) => x.position - y.position);
  await supabase.from('lists').update({ position: a.position }).eq('id', a.id);
  await supabase.from('lists').update({ position: b.position }).eq('id', b.id);
  render();
}

async function createTask(listId, text, deadlineMs) {
  const now = new Date();
  const dueAt = deadlineMs > 0 ? new Date(now.getTime() + deadlineMs).toISOString() : null;
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: state.user.id,
      list_id: listId,
      text,
      deadline_days: deadlineMs > 0 ? Math.round(deadlineMs / 864000) / 100 : 0,
      due_at: dueAt,
      completed: false,
      archived: false,
    })
    .select()
    .single();
  if (error) { alert('Error: ' + error.message); return; }
  state.tasks.unshift(data);
  render();
}

async function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  const newCompleted = !task.completed;
  const completedAt = newCompleted ? new Date().toISOString() : null;
  await supabase.from('tasks')
    .update({ completed: newCompleted, completed_at: completedAt, archived: false })
    .eq('id', id);
  task.completed = newCompleted;
  task.completed_at = completedAt;
  if (!newCompleted) task.archived = false;
  render();
}

async function deleteTask(id) {
  await supabase.from('tasks').delete().eq('id', id);
  state.tasks = state.tasks.filter(t => t.id !== id);
  expandedTaskNotes.delete(id);
  render();
}

async function saveTaskNotes(id, notes) {
  await supabase.from('tasks').update({ notes }).eq('id', id);
  const task = state.tasks.find(t => t.id === id);
  if (task) task.notes = notes;
}

// ============ TIME UTILS ============
function getTimeStatus(task) {
  if (!task.due_at) return { text: 'NO DEADLINE', overdue: false, urgent: false };
  const due = new Date(task.due_at).getTime();
  const ms = due - Date.now();
  const overdue = ms < 0;
  const abs = Math.abs(ms);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor((abs % 86400000) / 3600000);
  let text = days >= 1 ? `${days}D ${hours}H` : `${hours}H`;
  text = overdue ? `${text} OVERDUE` : `${text} LEFT`;
  return { text, overdue, urgent: !overdue && ms < 86400000 };
}

function timeAgo(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor(ms / 3600000);
  if (days >= 1) return `${days}D AGO`;
  if (hours >= 1) return `${hours}H AGO`;
  return 'JUST NOW';
}

function isRecentlyCompleted(task) {
  if (!task.completed || !task.completed_at) return false;
  return Date.now() - new Date(task.completed_at).getTime() < COMPLETED_HOLD_DAYS * 86400000;
}

// ============ COLOR PICKER ============
function openColorPicker(anchorEl, listId, currentColor) {
  closeColorPicker();
  const popup = document.createElement('div');
  popup.className = 'color-picker-popup';
  popup.addEventListener('click', e => e.stopPropagation());

  EVA_COLORS.forEach(c => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch' + (c.key === currentColor ? ' active' : '');
    swatch.style.background = c.hex;
    swatch.title = c.label;
    const label = document.createElement('span');
    label.className = 'color-swatch-label';
    label.textContent = c.label;
    swatch.appendChild(label);
    swatch.addEventListener('click', async () => {
      await updateListColor(listId, c.key);
      closeColorPicker();
      render();
    });
    popup.appendChild(swatch);
  });

  const rect = anchorEl.getBoundingClientRect();
  popup.style.top = (rect.bottom + 6) + 'px';
  popup.style.left = rect.left + 'px';
  document.body.appendChild(popup);
  activeColorPicker = popup;
}

// ============ RENDER ============
function render() {
  const container = document.getElementById('lists-container');
  container.innerHTML = '';

  if (state.lists.length === 0) {
    const noLists = document.createElement('div');
    noLists.className = 'no-lists';
    noLists.innerHTML = `
      <div>NO LISTS INITIALIZED</div>
      <button id="first-list-btn">CREATE FIRST LIST</button>
    `;
    container.appendChild(noLists);
    document.getElementById('first-list-btn').addEventListener('click', promptNewList);
  } else {
    state.lists.forEach((list, idx) => {
      container.appendChild(buildListColumn(list, idx));
    });

    const addCol = document.createElement('div');
    addCol.className = 'add-list-column';
    addCol.textContent = '+';
    addCol.title = 'Add new list';
    addCol.addEventListener('click', promptNewList);
    container.appendChild(addCol);
  }

  renderCompleted();
}

function buildListColumn(list, idx) {
  const col = document.createElement('div');
  col.className = 'list-column';
  col.style.color = evaColorHex(list.color || 'cyan');
  col.dataset.listId = list.id;

  const header = document.createElement('div');
  header.className = 'list-header';

  const name = document.createElement('div');
  name.className = 'list-name';
  name.textContent = list.name;
  name.title = 'Click to rename';
  name.addEventListener('click', () => {
    name.contentEditable = true;
    name.focus();
    document.execCommand('selectAll', false, null);
  });
  name.addEventListener('blur', async () => {
    name.contentEditable = false;
    const newName = name.textContent.trim() || list.name;
    if (newName !== list.name) {
      await renameList(list.id, newName);
    }
    name.textContent = newName;
  });
  name.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); name.blur(); }
    if (e.key === 'Escape') { name.textContent = list.name; name.blur(); }
  });
  header.appendChild(name);

  const meta = document.createElement('div');
  meta.className = 'list-meta';
  const taskCount = state.tasks.filter(t => t.list_id === list.id && !t.completed).length;
  meta.innerHTML = `<span>UNIT-${String(idx).padStart(2,'0')}</span><span>N=${taskCount}</span>`;
  header.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'list-actions';

  const colorDot = document.createElement('button');
  colorDot.className = 'mini-btn';
  colorDot.title = 'CHANGE COLOR';
  colorDot.style.cssText = `background:${evaColorHex(list.color || 'cyan')};border-color:${evaColorHex(list.color || 'cyan')};width:14px;padding:0;flex:0 0 14px;`;
  colorDot.addEventListener('click', e => {
    e.stopPropagation();
    openColorPicker(colorDot, list.id, list.color || 'cyan');
  });
  actions.appendChild(colorDot);

  if (idx > 0) {
    const left = document.createElement('button');
    left.className = 'mini-btn';
    left.textContent = '◄';
    left.title = 'Move left';
    left.addEventListener('click', () => moveList(list.id, -1));
    actions.appendChild(left);
  }
  if (idx < state.lists.length - 1) {
    const right = document.createElement('button');
    right.className = 'mini-btn';
    right.textContent = '►';
    right.title = 'Move right';
    right.addEventListener('click', () => moveList(list.id, 1));
    actions.appendChild(right);
  }
  const del = document.createElement('button');
  del.className = 'mini-btn';
  del.textContent = 'DEL';
  del.addEventListener('click', () => deleteList(list.id));
  actions.appendChild(del);
  header.appendChild(actions);

  col.appendChild(header);

  // Tasks
  const taskList = document.createElement('div');
  taskList.className = 'task-list';
  const tasks = state.tasks
    .filter(t => t.list_id === list.id && !t.archived && (!t.completed || isRecentlyCompleted(t)))
    .sort((a, b) => {
      // Completed tasks sink to bottom of column
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;
      // Both active: sort by due_at ascending, no-deadline last
      if (!a.completed && !b.completed) {
        if (!a.due_at && !b.due_at) return new Date(b.created_at) - new Date(a.created_at);
        if (!a.due_at) return 1;
        if (!b.due_at) return -1;
        return new Date(a.due_at) - new Date(b.due_at);
      }
      // Both recently-completed: most recent first
      return new Date(b.completed_at) - new Date(a.completed_at);
    });

  if (tasks.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-list';
    empty.textContent = '> NO ACTIVE TASKS';
    taskList.appendChild(empty);
  } else {
    tasks.forEach(t => taskList.appendChild(buildTaskRow(t)));
  }

  col.appendChild(taskList);

  // Add task form
  const addForm = document.createElement('div');
  addForm.className = 'add-task';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = '> NEW TASK...';
  input.maxLength = 200;

  const deadlineRow = document.createElement('div');
  deadlineRow.style.cssText = 'display:flex;gap:4px;';

  const deadlineNum = document.createElement('input');
  deadlineNum.type = 'number';
  deadlineNum.min = '1';
  deadlineNum.value = '7';
  deadlineNum.placeholder = 'N';
  deadlineNum.style.cssText = 'width:55px;flex:0 0 55px;';

  const deadlineUnit = document.createElement('select');
  deadlineUnit.style.cssText = 'flex:1;width:auto;';
  [['none', 'NO DEADLINE'], ['hrs', 'HRS'], ['days', 'DAYS'], ['wks', 'WKS'], ['mo', 'MO']].forEach(([v, l]) => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = l;
    if (v === 'days') o.selected = true;
    deadlineUnit.appendChild(o);
  });

  deadlineUnit.addEventListener('change', () => {
    deadlineNum.style.display = deadlineUnit.value === 'none' ? 'none' : '';
  });

  deadlineRow.appendChild(deadlineNum);
  deadlineRow.appendChild(deadlineUnit);

  const submit = document.createElement('button');
  submit.textContent = 'ADD [+]';
  const handleAdd = () => {
    const text = input.value.trim();
    if (!text) return;
    const unit = deadlineUnit.value;
    const n = parseInt(deadlineNum.value, 10) || 0;
    const multipliers = { hrs: 3600000, days: 86400000, wks: 604800000, mo: 2592000000 };
    const deadlineMs = (unit === 'none' || n <= 0) ? 0 : n * (multipliers[unit] || 0);
    createTask(list.id, text, deadlineMs);
    input.value = '';
  };
  submit.addEventListener('click', handleAdd);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') handleAdd(); });

  addForm.appendChild(input);
  addForm.appendChild(deadlineRow);
  addForm.appendChild(submit);
  col.appendChild(addForm);

  return col;
}

function buildTaskRow(task) {
  const row = document.createElement('div');
  row.className = 'task-row';
  const status = getTimeStatus(task);
  if (!task.completed) {
    if (status.overdue) row.classList.add('overdue');
    else if (status.urgent) row.classList.add('urgent');
  }

  const check = document.createElement('div');
  check.className = 'task-check';
  if (task.completed) {
    row.classList.add('completed');
    check.classList.add('done');
  }
  check.addEventListener('click', e => { e.stopPropagation(); toggleTask(task.id); });
  row.appendChild(check);

  const main = document.createElement('div');
  main.className = 'task-main';
  const text = document.createElement('div');
  text.className = 'task-text';
  text.textContent = task.text;
  main.appendChild(text);

  const meta = document.createElement('div');
  meta.className = 'task-meta';
  meta.textContent = task.completed ? `DONE ${timeAgo(task.completed_at)}` : status.text;
  main.appendChild(meta);

  // Notes panel
  const notesPanel = document.createElement('div');
  notesPanel.className = 'task-notes';
  notesPanel.style.display = expandedTaskNotes.has(task.id) ? 'block' : 'none';
  const notesTA = document.createElement('textarea');
  notesTA.className = 'task-notes-ta';
  notesTA.value = task.notes || '';
  notesTA.placeholder = '> NOTES...';
  notesTA.rows = 3;
  notesTA.addEventListener('click', e => e.stopPropagation());
  notesTA.addEventListener('blur', () => {
    const val = notesTA.value;
    if (val !== (task.notes || '')) saveTaskNotes(task.id, val);
  });
  notesPanel.appendChild(notesTA);
  main.appendChild(notesPanel);

  if (task.notes) row.classList.add('has-notes');

  row.appendChild(main);

  const del = document.createElement('button');
  del.className = 'task-del';
  del.textContent = '×';
  del.title = 'Delete';
  del.addEventListener('click', e => { e.stopPropagation(); deleteTask(task.id); });
  row.appendChild(del);

  row.addEventListener('click', e => {
    if (check.contains(e.target) || del.contains(e.target) || notesTA.contains(e.target)) return;
    if (expandedTaskNotes.has(task.id)) {
      expandedTaskNotes.delete(task.id);
      notesPanel.style.display = 'none';
      row.classList.remove('has-notes');
      if (task.notes) row.classList.add('has-notes');
    } else {
      expandedTaskNotes.add(task.id);
      notesPanel.style.display = 'block';
      notesTA.focus();
    }
  });

  return row;
}

function renderCompleted() {
  const list = document.getElementById('completed-list');
  list.innerHTML = '';
  const completed = state.tasks
    .filter(t => t.completed && !t.archived && !isRecentlyCompleted(t))
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));

  if (completed.length === 0) {
    list.innerHTML = '<div class="completed-item"><span style="color:var(--grey);">> NONE</span></div>';
    return;
  }

  completed.forEach(t => {
    const item = document.createElement('div');
    item.className = 'completed-item';
    const listName = state.lists.find(l => l.id === t.list_id)?.name || '?';
    item.innerHTML = `
      <span style="text-decoration:line-through;">${escapeHtml(t.text)} <span style="color:var(--grey-dim);">[${escapeHtml(listName)}]</span></span>
      <span style="color:var(--grey-dim); font-size:9px;">${timeAgo(t.completed_at)}</span>
    `;
    item.addEventListener('click', () => toggleTask(t.id));
    item.style.cursor = 'pointer';
    item.title = 'Click to un-complete';
    list.appendChild(item);
  });
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function promptNewList() {
  const name = prompt('LIST DESIGNATION:', '');
  if (!name || !name.trim()) return;
  createList(name.trim().toUpperCase());
}

// ============ COMPLETED PANEL TOGGLE ============
const completedPanel = document.getElementById('completed-panel');
const completedToggle = document.getElementById('completed-toggle');
completedToggle.addEventListener('click', () => {
  completedPanel.classList.toggle('open');
  completedToggle.textContent = completedPanel.classList.contains('open') ? 'HIDE [-]' : 'SHOW [+]';
});

// ============ SETTINGS UI ============
const settingsModal = document.getElementById('settings-modal');
document.getElementById('settings-btn').addEventListener('click', () => {
  settingsModal.classList.add('open');
  syncSettingsUI();
});
document.getElementById('settings-close').addEventListener('click', () => {
  settingsModal.classList.remove('open');
});

function syncSettingsUI() {
  document.querySelectorAll('.toggle').forEach(t => {
    t.classList.toggle('on', settings[t.dataset.setting]);
  });
}

document.querySelectorAll('.toggle').forEach(t => {
  t.addEventListener('click', () => {
    const key = t.dataset.setting;
    settings[key] = !settings[key];
    saveSettings(settings);
    applySettings(settings);
    syncSettingsUI();
  });
});

document.getElementById('reset-btn').addEventListener('click', () => {
  if (confirm('RESET LOCAL DISPLAY SETTINGS?')) {
    localStorage.removeItem('magi:settings');
    settings = { ...DEFAULT_SETTINGS };
    applySettings(settings);
    syncSettingsUI();
  }
});

// ============ AUTO REFRESH (deadline colors) ============
setInterval(() => {
  if (state.user) render();
}, 60000);

// ============ INIT: CHECK EXISTING SESSION ============
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    state.user = session.user;
    enterApp();
  }
})();

// Listen for auth state changes (e.g., token refresh, sign out from another tab)
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    location.reload();
  }
});
