const STORAGE_KEY = 'celenganku-v1';
const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
  useGrouping: false
});

const today = new Date();
const todayString = toDateInput(today);
const targetForm = document.getElementById('targetForm');
const activityForm = document.getElementById('activityForm');
const targetNameInput = document.getElementById('targetName');
const targetAmountInput = document.getElementById('targetAmount');
const targetDateInput = document.getElementById('targetDate');
const activityAmountInput = document.getElementById('activityAmount');
const activityNoteInput = document.getElementById('activityNote');
const activityDateInput = document.getElementById('activityDate');
const saveTab = document.getElementById('saveTab');
const spendTab = document.getElementById('spendTab');

let state = loadState();
let activityType = 'save';
targetDateInput.min = todayString;
activityDateInput.value = todayString;
targetAmountInput.addEventListener('input', () => {
  targetAmountInput.value = targetAmountInput.value.replace(/\D/g, '');
});
activityAmountInput.addEventListener('input', () => {
  activityAmountInput.value = activityAmountInput.value.replace(/\D/g, '');
});

function toDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.activities)) {
      return {
        target: saved.target || null,
        activities: saved.activities.filter(item => Number.isFinite(item.amount) && item.amount > 0)
      };
    }
  } catch (error) {
    // If saved data is unavailable or invalid, start with an empty tracker.
  }
  return { target: null, activities: [] };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

function render() {
  const savings = state.activities
    .filter(item => item.type === 'save')
    .reduce((total, item) => total + item.amount, 0);
  const expenses = state.activities
    .filter(item => item.type === 'spend')
    .reduce((total, item) => total + item.amount, 0);
  const expensesToday = state.activities
    .filter(item => item.type === 'spend' && item.date === todayString)
    .reduce((total, item) => total + item.amount, 0);

  document.getElementById('totalSaved').textContent = rupiah.format(savings);
  document.getElementById('totalSpent').textContent = rupiah.format(expenses);
  document.getElementById('spentToday').textContent = rupiah.format(expensesToday);

  const target = state.target;
  const targetAmount = target ? target.amount : 0;
  const progress = targetAmount ? Math.min(100, (savings / targetAmount) * 100) : 0;
  document.getElementById('displayTarget').textContent = target ? target.name : 'Sepatu impianmu';
  document.getElementById('progressText').innerHTML = `${rupiah.format(savings)} <span>/ ${rupiah.format(targetAmount)}</span>`;
  document.getElementById('progressBar').style.width = `${progress}%`;
  document.getElementById('progressPercent').textContent = `${Math.floor(progress)}% tercapai`;

  const daysLeftElement = document.getElementById('daysLeft');
  const dailyNeedElement = document.getElementById('dailyNeed');
  if (target) {
    const daysLeft = Math.ceil((new Date(`${target.date}T00:00:00`) - new Date(`${todayString}T00:00:00`)) / 86400000);
    daysLeftElement.textContent = daysLeft < 0 ? 'Tenggat terlewat' : daysLeft === 0 ? 'Tenggat hari ini' : `${daysLeft} hari lagi`;
    const remaining = Math.max(0, targetAmount - savings);
    if (remaining === 0) {
      dailyNeedElement.textContent = 'Target tabungan tercapai! 🎉';
    } else if (daysLeft < 0) {
      dailyNeedElement.textContent = `Kurang ${rupiah.format(remaining)} dari target`;
    } else {
      const savingDays = Math.max(1, daysLeft);
      dailyNeedElement.textContent = `Sisihkan ${rupiah.format(Math.ceil(remaining / savingDays))} / hari`;
    }
  } else {
    daysLeftElement.textContent = 'Atur targetmu';
    dailyNeedElement.textContent = 'Atur target dan tanggal untuk mulai';
  }

  renderHistory();
}

function renderHistory() {
  const list = document.getElementById('historyList');
  const activities = [...state.activities].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.createdAt - a.createdAt;
  });
  document.getElementById('historyCount').textContent = `${activities.length} aktivitas`;

  if (!activities.length) {
    list.innerHTML = '<div class="history-empty"><span>📒</span>Belum ada aktivitas.<br>Yuk, catat tabungan atau pengeluaranmu!</div>';
    return;
  }

  list.innerHTML = activities.map(item => {
    const isExpense = item.type === 'spend';
    const note = escapeHTML(item.note || (isExpense ? 'Pengeluaran' : 'Setoran tabungan'));
    return `<div class="history-item">
      <div class="history-symbol ${isExpense ? 'expense' : ''}">${isExpense ? '🧾' : '🍓'}</div>
      <div class="history-detail"><strong>${note}</strong><span>${formatDate(item.date)} · ${isExpense ? 'Pengeluaran' : 'Menabung'}</span></div>
      <span class="history-value ${isExpense ? 'expense' : 'income'}">${isExpense ? '−' : '+'}${rupiah.format(item.amount)}</span>
      <button class="delete-entry" type="button" data-id="${escapeHTML(item.id)}" aria-label="Hapus aktivitas" title="Hapus aktivitas">×</button>
    </div>`;
  }).join('');
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

targetForm.addEventListener('submit', event => {
  event.preventDefault();
  const name = targetNameInput.value.trim();
  const amount = Number(targetAmountInput.value.replace(/\D/g, ''));
  const date = targetDateInput.value;
  if (!name || !Number.isFinite(amount) || amount <= 0 || !date) return;
  state.target = { name, amount, date };
  saveState();
  render();
});

function setActivityType(type) {
  activityType = type;
  const isSaving = type === 'save';
  saveTab.classList.toggle('active', isSaving);
  spendTab.classList.toggle('active', !isSaving);
  saveTab.setAttribute('aria-selected', String(isSaving));
  spendTab.setAttribute('aria-selected', String(!isSaving));
  document.getElementById('activityAmountLabel').textContent = isSaving ? 'Jumlah yang ditabung' : 'Jumlah pengeluaran';
  document.getElementById('activitySubmit').textContent = isSaving ? '＋ Catat tabungan' : '＋ Catat pengeluaran';
  activityNoteInput.placeholder = isSaving ? 'Contoh: Uang jajan hari ini' : 'Contoh: Makan siang';
}

saveTab.addEventListener('click', () => setActivityType('save'));
spendTab.addEventListener('click', () => setActivityType('spend'));

activityForm.addEventListener('submit', event => {
  event.preventDefault();
  const amount = Number(activityAmountInput.value.replace(/\D/g, ''));
  const date = activityDateInput.value;
  if (!Number.isFinite(amount) || amount <= 0 || !date) return;
  state.activities.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: activityType,
    amount,
    note: activityNoteInput.value.trim(),
    date,
    createdAt: Date.now()
  });
  saveState();
  activityForm.reset();
  activityDateInput.value = todayString;
  render();
});

document.getElementById('historyList').addEventListener('click', event => {
  const button = event.target.closest('.delete-entry');
  if (!button) return;
  state.activities = state.activities.filter(item => item.id !== button.dataset.id);
  saveState();
  render();
});

if (state.target) {
  targetNameInput.value = state.target.name;
  targetAmountInput.value = state.target.amount;
  targetDateInput.value = state.target.date;
}
render();
