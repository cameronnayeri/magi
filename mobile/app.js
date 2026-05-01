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
let activeListId = null;
let activeColorPicker = null;

function closeColorPicker() {
  if (activeColorPicker) { activeColorPicker.remove(); activeColorPicker = null; }
}
document.addEventListener('click', () => closeColorPicker());

let state = { user: null, lists: [], tasks: [] };

// ============ SETTINGS ============
const DEFAULT_SETTINGS = { boot: true, scanlines: true, flicker: true };

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('magi:settings') || '{}');
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

function saveSettings(s) { localStorage.setItem('magi:settings', JSON.stringify(s)); }

function applySettings(s) {
  document.body.classList.toggle('scanlines', s.scanlines);
  document.body.classList.toggle('flicker', s.flicker);
}

let settings = loadSettings();
applySettings(settings);

// ============ CLOCK ============
function updateClock() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const el = document.getElementById('clock');
  if (el) el.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
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
  if (data.user && !data.session) { authMsg.textContent = 'CHECK EMAIL FOR CONFIRMATION'; return; }
  state.user = data.user;
  enterApp();
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  location.reload();
});

// ============ BOOT ============
const BOOT_LINES = [
  '> SYSTEM INITIALIZATION',
  '> LOADING KERNEL ........................... [OK]',
  '> MAGI-01 MELCHIOR ......................... ONLINE',
  '> MAGI-02 BALTHASAR ........................ ONLINE',
  '> MAGI-03 CASPER ........................... ONLINE',
  '> MOBILE TERMINAL .......................... [OK]',
  '> SYNCHRONIZATION RATIO: 87.3%',
  '> CONNECTING TO REMOTE DATABASE ............ [OK]',
  '> LOADING USER PROFILE ..................... [OK]',
  '> AT FIELD: NOMINAL',
  '> CODE: 666  PROTECT',
  '> ALL SYSTEMS OPERATIONAL',
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
        setTimeout(() => { screen.style.display = 'none'; resolve(); }, 500);
        return;
      }
      const line = document.createElement('div');
      line.className = 'boot-line';
      line.textContent = BOOT_LINES[i];
      log.appendChild(line);
      i++;
    }, 90);
  });
}

// ============ ENTER APP ============
async function enterApp() {
  authScreen.style.display = 'none';
  await runBootSequence();
  document.getElementById('app').style.display = 'flex';
  // Show just the username part before @
  document.getElementById('user-id').textContent = state.user.email.split('@')[0].toUpperCase();
  await loadData();
}

// ============ DATA OPS ============
async function loadData() {
  document.getElementById('loading').classList.add('show');

  const { data: lists, error: listErr } = await supabase
    .from('lists').select('*').order('position', { ascending: true });

  if (listErr) {
    alert('Database error. Check Supabase setup.');
    document.getElementById('loading').classList.remove('show');
    return;
  }

  state.lists = lists || [];
  if (!activeListId && state.lists.length > 0) activeListId = state.lists[0].id;

  const { data: tasks, error: taskErr } = await supabase
    .from('tasks').select('*').order('created_at', { ascending: false });

  if (taskErr) {
    document.getElementById('loading').classList.remove('show');
    return;
  }

  state.tasks = tasks || [];
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
  const color = EVA_COLORS[state.lists.length % EVA_COLORS.length].key;
  const { data, error } = await supabase
    .from('lists')
    .insert({ name, position: state.lists.length, user_id: state.user.id, color })
    .select().single();
  if (error) { alert('Error: ' + error.message); return; }
  state.lists.push(data);
  activeListId = data.id;
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
  if (activeListId === id) activeListId = state.lists[0]?.id || null;
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
    .select().single();
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

async function saveTaskText(id, text) {
  await supabase.from('tasks').update({ text }).eq('id', id);
  const task = state.tasks.find(t => t.id === id);
  if (task) task.text = text;
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

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
    swatch.addEventListener('click', async () => {
      await updateListColor(listId, c.key);
      closeColorPicker();
      render();
    });
    popup.appendChild(swatch);
  });

  const rect = anchorEl.getBoundingClientRect();
  const popupW = 4 * 32 + 3 * 6 + 20; // 4 cols * 32 + gaps + padding
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - popupW - 8));
  popup.style.top = (rect.bottom + 8) + 'px';
  popup.style.left = left + 'px';
  document.body.appendChild(popup);
  activeColorPicker = popup;
}

// ============ RENDER ============
function render() {
  buildListTabs();
  const activeList = state.lists.find(l => l.id === activeListId);
  buildListView(activeList);
  buildAddBar(activeList);
}

function buildListTabs() {
  const tabs = document.getElementById('list-tabs');
  tabs.innerHTML = '';

  state.lists.forEach(list => {
    const tab = document.createElement('div');
    tab.className = 'list-tab' + (list.id === activeListId ? ' active' : '');
    const hex = evaColorHex(list.color || 'cyan');
    if (list.id === activeListId) {
      tab.style.color = hex;
      tab.style.borderBottomColor = hex;
    }
    tab.textContent = list.name;
    tab.addEventListener('click', () => {
      activeListId = list.id;
      render();
    });
    tabs.appendChild(tab);
  });

  const addTab = document.createElement('div');
  addTab.className = 'list-tab-add';
  addTab.textContent = '+';
  addTab.addEventListener('click', () => {
    const name = prompt('LIST DESIGNATION:', '');
    if (name && name.trim()) createList(name.trim().toUpperCase());
  });
  tabs.appendChild(addTab);
}

function buildListView(list) {
  const view = document.getElementById('list-view');
  view.innerHTML = '';
  view.style.color = '';

  if (!list) {
    const noLists = document.createElement('div');
    noLists.className = 'no-lists';
    noLists.innerHTML = `<div>NO LISTS INITIALIZED</div><button id="first-list-btn">CREATE FIRST LIST</button>`;
    view.appendChild(noLists);
    document.getElementById('first-list-btn').addEventListener('click', () => {
      const name = prompt('LIST DESIGNATION:', '');
      if (name && name.trim()) createList(name.trim().toUpperCase());
    });
    return;
  }

  const hex = evaColorHex(list.color || 'cyan');
  view.style.color = hex;

  // Header
  const header = document.createElement('div');
  header.className = 'list-view-header';

  const nameWrap = document.createElement('div');

  const nameEl = document.createElement('div');
  nameEl.className = 'list-view-name';
  nameEl.textContent = list.name;
  nameEl.addEventListener('click', () => {
    nameEl.contentEditable = true;
    nameEl.focus();
    document.execCommand('selectAll', false, null);
  });
  nameEl.addEventListener('blur', async () => {
    nameEl.contentEditable = false;
    const newName = nameEl.textContent.trim() || list.name;
    if (newName !== list.name) {
      await renameList(list.id, newName);
      list.name = newName;
      buildListTabs();
    }
    nameEl.textContent = list.name;
  });
  nameEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); }
    if (e.key === 'Escape') { nameEl.textContent = list.name; nameEl.blur(); }
  });

  const taskCount = state.tasks.filter(t => t.list_id === list.id && !t.completed).length;
  const metaEl = document.createElement('div');
  metaEl.className = 'list-view-meta';
  metaEl.textContent = `N=${taskCount} ACTIVE`;

  nameWrap.appendChild(nameEl);
  nameWrap.appendChild(metaEl);
  header.appendChild(nameWrap);

  const actions = document.createElement('div');
  actions.className = 'list-view-actions';

  const colorDot = document.createElement('button');
  colorDot.className = 'action-btn';
  colorDot.style.cssText = `background:${hex};border-color:${hex};width:22px;height:22px;padding:0;`;
  colorDot.title = 'CHANGE COLOR';
  colorDot.addEventListener('click', e => { e.stopPropagation(); openColorPicker(colorDot, list.id, list.color || 'cyan'); });
  actions.appendChild(colorDot);

  const idx = state.lists.findIndex(l => l.id === list.id);
  if (idx > 0) {
    const left = document.createElement('button');
    left.className = 'action-btn';
    left.textContent = '◄';
    left.addEventListener('click', () => moveList(list.id, -1));
    actions.appendChild(left);
  }
  if (idx < state.lists.length - 1) {
    const right = document.createElement('button');
    right.className = 'action-btn';
    right.textContent = '►';
    right.addEventListener('click', () => moveList(list.id, 1));
    actions.appendChild(right);
  }

  const del = document.createElement('button');
  del.className = 'action-btn danger';
  del.textContent = 'DEL';
  del.addEventListener('click', () => deleteList(list.id));
  actions.appendChild(del);

  header.appendChild(actions);
  view.appendChild(header);

  // Tasks
  const tasks = state.tasks
    .filter(t => t.list_id === list.id && !t.archived && (!t.completed || isRecentlyCompleted(t)))
    .sort((a, b) => {
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;
      if (!a.completed && !b.completed) {
        if (!a.due_at && !b.due_at) return new Date(b.created_at) - new Date(a.created_at);
        if (!a.due_at) return 1;
        if (!b.due_at) return -1;
        return new Date(a.due_at) - new Date(b.due_at);
      }
      return new Date(b.completed_at) - new Date(a.completed_at);
    });

  if (tasks.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-list';
    empty.textContent = '> NO ACTIVE TASKS';
    view.appendChild(empty);
  } else {
    tasks.forEach(t => view.appendChild(buildTaskRow(t)));
  }

  // Completed section (older than COMPLETED_HOLD_DAYS)
  const oldCompleted = state.tasks
    .filter(t => t.list_id === list.id && t.completed && !t.archived && !isRecentlyCompleted(t))
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));

  if (oldCompleted.length > 0) {
    const section = document.createElement('div');
    section.className = 'completed-section';

    const sHeader = document.createElement('div');
    sHeader.className = 'completed-section-header';
    sHeader.innerHTML = `<span>RECENTLY COMPLETED</span><span id="comp-toggle-${list.id}">[+]</span>`;
    section.appendChild(sHeader);

    const sList = document.createElement('div');
    sList.className = 'completed-section-list';
    const toggleId = `comp-toggle-${list.id}`;

    sHeader.addEventListener('click', () => {
      sList.classList.toggle('open');
      const tog = document.getElementById(toggleId);
      if (tog) tog.textContent = sList.classList.contains('open') ? '[-]' : '[+]';
    });

    oldCompleted.forEach(t => {
      const item = document.createElement('div');
      item.className = 'completed-item';
      item.innerHTML = `<span>${escapeHtml(t.text)}</span><span>${timeAgo(t.completed_at)}</span>`;
      item.addEventListener('click', () => toggleTask(t.id));
      item.title = 'Tap to un-complete';
      sList.appendChild(item);
    });

    section.appendChild(sList);
    view.appendChild(section);
  }
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
  if (task.completed) { row.classList.add('completed'); check.classList.add('done'); }
  check.addEventListener('click', e => { e.stopPropagation(); toggleTask(task.id); });
  row.appendChild(check);

  const main = document.createElement('div');
  main.className = 'task-main';

  const text = document.createElement('div');
  text.className = 'task-text';
  text.textContent = task.text;

  text.addEventListener('blur', async () => {
    text.contentEditable = false;
    const newText = text.textContent.trim();
    if (!newText) { text.textContent = task.text; return; }
    if (newText !== task.text) await saveTaskText(task.id, newText);
  });
  text.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); text.blur(); }
    if (e.key === 'Escape') { text.textContent = task.text; text.blur(); }
  });
  text.addEventListener('click', e => { if (text.contentEditable === 'true') e.stopPropagation(); });

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

  const edit = document.createElement('button');
  edit.className = 'task-del';
  edit.textContent = '✎';
  edit.title = 'Edit';
  edit.addEventListener('click', e => {
    e.stopPropagation();
    text.contentEditable = true;
    text.focus();
    const range = document.createRange();
    range.selectNodeContents(text);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  row.appendChild(edit);

  const del = document.createElement('button');
  del.className = 'task-del';
  del.textContent = '×';
  del.addEventListener('click', e => { e.stopPropagation(); deleteTask(task.id); });
  row.appendChild(del);

  row.addEventListener('click', e => {
    if (check.contains(e.target) || del.contains(e.target) || edit.contains(e.target) || notesTA.contains(e.target) || text.contentEditable === 'true') return;
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

function buildAddBar(list) {
  const bar = document.getElementById('add-bar');
  bar.innerHTML = '';
  bar.style.display = list ? '' : 'none';
  if (!list) return;

  bar.style.color = evaColorHex(list.color || 'cyan');

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'add-input';
  input.placeholder = '> NEW TASK...';
  input.maxLength = 200;

  const deadlineRow = document.createElement('div');
  deadlineRow.className = 'deadline-row';

  const deadlineNum = document.createElement('input');
  deadlineNum.type = 'number';
  deadlineNum.min = '1';
  deadlineNum.value = '7';
  deadlineNum.className = 'deadline-num';

  const deadlineUnit = document.createElement('select');
  deadlineUnit.className = 'deadline-unit';
  [['none', 'NO DEADLINE'], ['hrs', 'HRS'], ['days', 'DAYS'], ['wks', 'WKS'], ['mo', 'MO']].forEach(([v, l]) => {
    const o = document.createElement('option');
    o.value = v; o.textContent = l;
    if (v === 'days') o.selected = true;
    deadlineUnit.appendChild(o);
  });
  deadlineUnit.addEventListener('change', () => {
    deadlineNum.style.display = deadlineUnit.value === 'none' ? 'none' : '';
  });

  deadlineRow.appendChild(deadlineNum);
  deadlineRow.appendChild(deadlineUnit);

  const submit = document.createElement('button');
  submit.className = 'add-submit';
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
    input.blur();
  };

  submit.addEventListener('click', handleAdd);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') handleAdd(); });

  bar.appendChild(input);
  bar.appendChild(deadlineRow);
  bar.appendChild(submit);
}

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

// ============ AUTO REFRESH ============
setInterval(() => { if (state.user) render(); }, 60000);

// ============ INIT ============
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) { state.user = session.user; enterApp(); }
})();

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') location.reload();
});
