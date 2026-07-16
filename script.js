// Wallo app
const STORAGE_KEY = 'wallo-transactions';
const THEME_KEY = 'wallo-theme';
const PALETTE_KEY = 'wallo-palette';
const GOALS_KEY = 'wallo-goals';
const CUSTOM_THEME_KEY = 'wallo-custom-theme';
const CELEBRATIONS_KEY = 'wallo-celebrations';
const ONBOARDING_KEY = 'wallo-onboarded';
const DEFAULT_CUSTOM_COLORS = {
  accent: '#3b82f6',
  income: '#22c55e',
  text: '#172033',
  background: '#f5f7fa',
  surface: '#ffffff'
};

const valueLabelsPlugin = {
  id: 'valueLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const dataset = chart.data.datasets[0];

    if (!dataset) return;

    if (chart.config.type === 'doughnut') {
      const meta = chart.getDatasetMeta(0);
      meta.data.forEach((arc, index) => {
        if (!dataset.data[index]) return;
        const angle = (arc.startAngle + arc.endAngle) / 2;
        const radius = (arc.innerRadius + arc.outerRadius) / 2;
        const x = arc.x + Math.cos(angle) * radius * 0.72;
        const y = arc.y + Math.sin(angle) * radius * 0.72;

        ctx.save();
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 10px Inter, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(formatCurrency(dataset.data[index]), x, y);
        ctx.restore();
      });
      return;
    }

    if (chart.config.type === 'bar') {
      const { top, bottom } = chart.scales.y;
      const barValues = dataset.data;
      chart.getDatasetMeta(0).data.forEach((bar, index) => {
        if (!barValues[index]) return;
        const value = barValues[index];
        const x = bar.x;
        const y = bar.y - 6;

        ctx.save();
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 10px Inter, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(formatCurrency(value), x, y);
        ctx.restore();
      });
    }
  }
};

const categoryIcons = {
  Food: '🍽️',
  Shopping: '🛍️',
  Transport: '🚗',
  Bills: '💡',
  Entertainment: '🎉',
  Health: '🩺',
  Education: '📚',
  Salary: '💼',
  Other: '📌',
  Earnings: '💰'
};

const state = {
  transactions: [],
  goals: [],
  theme: 'light',
  palette: 'classic',
  customColors: { ...DEFAULT_CUSTOM_COLORS },
  categoryChart: null,
  monthlyChart: null,
  audioContext: null,
  activePeriod: 'today',
  periodStart: '',
  periodEnd: '',
  insightIndex: 0,
  celebrationsEnabled: true,
  pdfPeriod: 'today',
  pdfStart: '',
  pdfEnd: ''
};

const dom = {
  balanceAmount: document.getElementById('balanceAmount'),
  incomeAmount: document.getElementById('incomeAmount'),
  expenseAmount: document.getElementById('expenseAmount'),
  transactionsList: document.getElementById('transactionsList'),
  earningsList: document.getElementById('earningsList'),
  periodTransactionsList: document.getElementById('periodTransactionsList'),
  periodIncome: document.getElementById('periodIncome'),
  periodExpense: document.getElementById('periodExpense'),
  periodTitle: document.getElementById('periodTitle'),
  periodSearchInput: document.getElementById('periodSearchInput'),
  periodTypeFilter: document.getElementById('periodTypeFilter'),
  startDateInput: document.getElementById('startDateInput'),
  endDateInput: document.getElementById('endDateInput'),
  toggleRangeBtn: document.getElementById('toggleRangeBtn'),
  customRangePanel: document.getElementById('customRangePanel'),
  applyRangeBtn: document.getElementById('applyRangeBtn'),
  periodChips: Array.from(document.querySelectorAll('.period-chip')),
  insightBadge: document.getElementById('insightBadge'),
  insightMessage: document.getElementById('insightMessage'),
  insightHint: document.getElementById('insightHint'),
  expenseForm: document.getElementById('expenseForm'),
  titleInput: document.getElementById('titleInput'),
  amountInput: document.getElementById('amountInput'),
  categorySelect: document.getElementById('categorySelect'),
  earningsForm: document.getElementById('earningsForm'),
  earningTitleInput: document.getElementById('earningTitleInput'),
  earningAmountInput: document.getElementById('earningAmountInput'),
  navItems: Array.from(document.querySelectorAll('.nav-item')),
  views: Array.from(document.querySelectorAll('.view')),
  fab: document.getElementById('fab'),
  openFormButton: document.getElementById('openFormButton'),
  themeToggle: document.getElementById('themeToggle'),
  themeOptions: Array.from(document.querySelectorAll('.theme-option')),
  paletteOptions: Array.from(document.querySelectorAll('.palette-option')),
  paletteSection: document.getElementById('paletteSection'),
  customThemeSection: document.getElementById('customThemeSection'),
  customThemeBtn: document.getElementById('customThemeBtn'),
  customThemePanel: document.getElementById('customThemePanel'),
  accentColorInput: document.getElementById('accentColorInput'),
  incomeColorInput: document.getElementById('incomeColorInput'),
  backgroundColorInput: document.getElementById('backgroundColorInput'),
  surfaceColorInput: document.getElementById('surfaceColorInput'),
  textColorInput: document.getElementById('textColorInput'),
  celebrationsToggle: document.getElementById('celebrationsToggle'),
  clearDataBtn: document.getElementById('clearDataBtn'),
  cancelClearBtn: document.getElementById('cancelClearBtn'),
  confirmClearBtn: document.getElementById('confirmClearBtn'),
  confirmModal: document.getElementById('confirmModal'),
  exportBtn: document.getElementById('exportBtn'),
  exportPdfBtn: document.getElementById('exportPdfBtn'),
  importBtn: document.getElementById('importBtn'),
  importFileInput: document.getElementById('importFileInput'),
  pdfRangeButtons: Array.from(document.querySelectorAll('[data-pdf-period]')),
  togglePdfRangeBtn: document.getElementById('togglePdfRangeBtn'),
  customPdfRangePanel: document.getElementById('customPdfRangePanel'),
  pdfStartDateInput: document.getElementById('pdfStartDateInput'),
  pdfEndDateInput: document.getElementById('pdfEndDateInput'),
  creditLink: document.getElementById('creditLink'),
  onboardingModal: document.getElementById('onboardingModal'),
  onboardingLightBtn: document.getElementById('onboardingLightBtn'),
  onboardingDarkBtn: document.getElementById('onboardingDarkBtn')
};

function init() {
  loadState();
  bindEvents();
  render();
  maybeShowOnboarding();
}

function loadState() {
  const savedTransactions = localStorage.getItem(STORAGE_KEY);
  if (savedTransactions) {
    state.transactions = JSON.parse(savedTransactions);
  }

  const savedGoals = localStorage.getItem(GOALS_KEY);
  if (savedGoals) {
    state.goals = JSON.parse(savedGoals);
  }

  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme) {
    state.theme = savedTheme;
  }

  const savedPalette = localStorage.getItem(PALETTE_KEY);
  if (savedPalette) {
    state.palette = savedPalette;
  }

  const savedCustomTheme = localStorage.getItem(CUSTOM_THEME_KEY);
  if (savedCustomTheme) {
    try {
      state.customColors = { ...DEFAULT_CUSTOM_COLORS, ...JSON.parse(savedCustomTheme) };
    } catch (error) {
      console.warn('Unable to load custom theme settings.', error);
    }
  }

  const savedCelebrations = localStorage.getItem(CELEBRATIONS_KEY);
  if (savedCelebrations !== null) {
    state.celebrationsEnabled = savedCelebrations === 'true';
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
  localStorage.setItem(GOALS_KEY, JSON.stringify(state.goals));
  localStorage.setItem(THEME_KEY, state.theme);
  localStorage.setItem(PALETTE_KEY, state.palette);
  localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(state.customColors));
  localStorage.setItem(CELEBRATIONS_KEY, String(state.celebrationsEnabled));
}

function bindEvents() {
  dom.expenseForm.addEventListener('submit', handleAddExpense);
  dom.earningsForm.addEventListener('submit', handleAddEarning);
  dom.navItems.forEach((button) => {
    button.addEventListener('click', () => switchView(button.dataset.view));
  });
  dom.fab.addEventListener('click', () => {
    if (document.getElementById('homeView').classList.contains('active')) {
      dom.titleInput.focus();
    } else if (document.getElementById('earningsView').classList.contains('active')) {
      dom.earningTitleInput.focus();
    }
  });
  dom.openFormButton.addEventListener('click', () => dom.titleInput.focus());
  dom.themeToggle.addEventListener('click', toggleTheme);
  dom.themeOptions.forEach((button) => {
    button.addEventListener('click', () => setTheme(button.dataset.theme));
  });
  dom.paletteOptions.forEach((button) => {
    button.addEventListener('click', () => setPalette(button.dataset.palette));
  });
  dom.customThemeBtn.addEventListener('click', toggleCustomThemePanel);
  dom.accentColorInput?.addEventListener('input', updateCustomThemeFromInputs);
  dom.incomeColorInput?.addEventListener('input', updateCustomThemeFromInputs);
  dom.backgroundColorInput?.addEventListener('input', updateCustomThemeFromInputs);
  dom.surfaceColorInput?.addEventListener('input', updateCustomThemeFromInputs);
  dom.textColorInput?.addEventListener('input', updateCustomThemeFromInputs);
  dom.celebrationsToggle?.addEventListener('change', (event) => {
    state.celebrationsEnabled = event.target.checked;
    saveState();
  });
  dom.onboardingLightBtn?.addEventListener('click', () => completeOnboarding('light'));
  dom.onboardingDarkBtn?.addEventListener('click', () => completeOnboarding('dark'));
  dom.clearDataBtn.addEventListener('click', openClearDataConfirm);
  dom.cancelClearBtn?.addEventListener('click', closeClearDataConfirm);
  dom.confirmClearBtn?.addEventListener('click', confirmClearData);
  dom.confirmModal?.addEventListener('click', (event) => {
    if (event.target === dom.confirmModal) {
      closeClearDataConfirm();
    }
  });
  dom.exportBtn.addEventListener('click', exportTransactionsCSV);
  dom.exportPdfBtn.addEventListener('click', exportTransactionsPDF);
  dom.importBtn.addEventListener('click', () => dom.importFileInput.click());
  dom.importFileInput.addEventListener('change', importTransactionsCSV);
  dom.periodChips.forEach((chip) => {
    chip.addEventListener('click', () => selectPeriod(chip.dataset.period));
  });
  dom.toggleRangeBtn.addEventListener('click', () => {
    dom.customRangePanel.classList.toggle('hidden');
    dom.toggleRangeBtn.textContent = dom.customRangePanel.classList.contains('hidden') ? 'Choose custom range' : 'Hide custom range';
  });
  dom.applyRangeBtn.addEventListener('click', () => applyCustomRange());
  dom.periodSearchInput.addEventListener('input', renderPeriodView);
  dom.periodTypeFilter.addEventListener('change', renderPeriodView);
  dom.pdfRangeButtons.forEach((button) => {
    button.addEventListener('click', () => selectPdfPeriod(button.dataset.pdfPeriod));
  });
  dom.togglePdfRangeBtn.addEventListener('click', togglePdfCustomRange);
  document.addEventListener('keydown', handleKeypressSound);
  document.addEventListener('click', handleButtonSound);
  document.addEventListener('selectstart', blockNonEditableInteraction);
}

function blockNonEditableInteraction(event) {
  const target = event.target;
  const isEditable = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
  if (!isEditable) {
    event.preventDefault();
  }
}

function switchView(viewId) {
  dom.views.forEach((view) => view.classList.toggle('active', view.id === viewId));
  dom.navItems.forEach((item) => item.classList.toggle('active', item.dataset.view === viewId));
  updateFabVisibility(viewId);
  updateCreditLinkVisibility(viewId);

  if (viewId === 'statsView') {
    state.insightIndex = (state.insightIndex + 1) % 4;
    renderInsights();
    renderCharts();
  }
}

function updateFabVisibility(viewId) {
  dom.fab.style.display = viewId === 'homeView' || viewId === 'earningsView' ? 'grid' : 'none';
}

function updateCreditLinkVisibility(viewId) {
  if (!dom.creditLink) return;
  const shouldShow = viewId === 'homeView' || viewId === 'settingsView';
  dom.creditLink.classList.toggle('hidden', !shouldShow);
}

function ensureAudioContext() {
  if (!window.AudioContext && !window.webkitAudioContext) {
    return;
  }

  if (!state.audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    state.audioContext = new AudioCtx();
  }

  if (state.audioContext.state === 'suspended') {
    state.audioContext.resume();
  }
}

function playTone(frequency, duration, type = 'triangle', volume = 0.025) {
  ensureAudioContext();
  if (!state.audioContext) return;

  const oscillator = state.audioContext.createOscillator();
  const gainNode = state.audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, state.audioContext.currentTime);

  gainNode.gain.setValueAtTime(0.0001, state.audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(volume, state.audioContext.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, state.audioContext.currentTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(state.audioContext.destination);

  oscillator.start();
  oscillator.stop(state.audioContext.currentTime + duration);
}

function handleKeypressSound(event) {
  const target = event.target;
  const isTextField = target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName);

  if (!isTextField || event.repeat) {
    return;
  }

  if (event.key && event.key.length === 1) {
    const charCode = event.key.charCodeAt(0);
    const frequency = 220 + (charCode % 24) * 18;
    playTone(frequency, 0.05, 'sine', 0.02);
  }
}

function handleButtonSound(event) {
  const button = event.target.closest('button');
  if (!button) {
    return;
  }

  if (button.id === 'themeToggle' || button.classList.contains('nav-item')) {
    playTone(420, 0.06, 'square', 0.100);
  } else {
    playTone(320, 0.05, 'triangle', 0.098);
  }
}

function handleAddExpense(event) {
  event.preventDefault();

  const title = dom.titleInput.value.trim();
  const amount = Number(dom.amountInput.value);
  const category = dom.categorySelect.value;

  if (!title || !category || Number.isNaN(amount) || amount <= 0) {
    alert('Please enter a valid title, amount, and category.');
    return;
  }

  const transaction = {
    id: Date.now().toString(),
    title,
    amount: Number(amount.toFixed(2)),
    category,
    type: 'expense',
    date: new Date().toISOString()
  };

  state.transactions.unshift(transaction);
  saveState();
  render();
  playExpenseAddedSound();
  dom.expenseForm.reset();
  dom.titleInput.focus();
}

function handleAddEarning(event) {
  event.preventDefault();

  const title = dom.earningTitleInput.value.trim();
  const amount = Number(dom.earningAmountInput.value);

  if (!title || Number.isNaN(amount) || amount <= 0) {
    alert('Please enter a valid title and amount.');
    return;
  }

  const transaction = {
    id: Date.now().toString(),
    title,
    amount: Number(amount.toFixed(2)),
    category: 'Earnings',
    type: 'income',
    date: new Date().toISOString()
  };

  state.transactions.unshift(transaction);
  saveState();
  render();
  celebrateMoneyAdded();
  dom.earningsForm.reset();
  dom.earningTitleInput.focus();
}

function handleAddGoal(event) {
  event.preventDefault();

  const name = dom.goalNameInput.value.trim();
  const amount = Number(dom.goalAmountInput.value);

  if (!name || Number.isNaN(amount) || amount <= 0) {
    alert('Please enter a goal name and a valid amount.');
    return;
  }

  const goal = {
    id: Date.now().toString(),
    name,
    targetAmount: Number(amount.toFixed(2)),
    createdAt: new Date().toISOString()
  };

  state.goals.unshift(goal);
  saveState();
  render();
  dom.goalForm.reset();
  dom.goalNameInput.focus();
}

function deleteTransaction(id) {
  state.transactions = state.transactions.filter((transaction) => transaction.id !== id);
  saveState();
  render();
}

function deleteGoal(id) {
  state.goals = state.goals.filter((goal) => goal.id !== id);
  saveState();
  render();
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(value);
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

function getSummary() {
  const income = state.transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const expenses = state.transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const balance = income - expenses;

  return { income, expenses, balance };
}

function render() {
  const summary = getSummary();
  dom.balanceAmount.textContent = formatCurrency(summary.balance);
  dom.incomeAmount.textContent = formatCurrency(summary.income);
  dom.expenseAmount.textContent = formatCurrency(summary.expenses);
  renderTransactions();
  renderEarnings();
  renderPeriodView();
  renderInsights();
  renderCharts();
  applyTheme();
  syncFeedbackSettings();
  updateCreditLinkVisibility(document.querySelector('.view.active')?.id || 'homeView');
}

function renderTransactions() {
  if (!state.transactions.length) {
    dom.transactionsList.innerHTML = `
      <div class="empty-state">
        <p>No transactions yet.</p>
        <small>Start by adding your first entry.</small>
      </div>
    `;
    return;
  }

  const sortedTransactions = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  dom.transactionsList.innerHTML = sortedTransactions
    .map(
      (transaction) => `
        <article class="transaction-item">
          <div class="transaction-main">
            <div class="icon-badge">${categoryIcons[transaction.category] || '🧾'}</div>
            <div class="transaction-meta">
              <strong>${transaction.title}</strong>
              <small>${transaction.category} • ${formatDate(transaction.date)}</small>
            </div>
          </div>
          <div class="transaction-main">
            <span class="transaction-amount ${transaction.type}">${transaction.type === 'income' ? '+' : '-'} ${formatCurrency(transaction.amount)}</span>
            <button class="delete-btn" aria-label="Delete transaction" data-id="${transaction.id}">✕</button>
          </div>
        </article>
      `
    )
    .join('');

  dom.transactionsList.querySelectorAll('.delete-btn').forEach((button) => {
    button.addEventListener('click', () => deleteTransaction(button.dataset.id));
  });
}

function renderEarnings() {
  const earnings = state.transactions.filter((transaction) => transaction.type === 'income');

  if (!earnings.length) {
    dom.earningsList.innerHTML = `
      <div class="empty-state">
        <p>No earnings yet.</p>
        <small>Add your first income entry here.</small>
      </div>
    `;
    return;
  }

  const sortedEarnings = [...earnings].sort((a, b) => new Date(b.date) - new Date(a.date));

  dom.earningsList.innerHTML = sortedEarnings
    .map(
      (transaction) => `
        <article class="transaction-item">
          <div class="transaction-main">
            <div class="icon-badge">${categoryIcons[transaction.category] || '💰'}</div>
            <div class="transaction-meta">
              <strong>${transaction.title}</strong>
              <small>${transaction.category} • ${formatDate(transaction.date)}</small>
            </div>
          </div>
          <div class="transaction-main">
            <span class="transaction-amount income">+ ${formatCurrency(transaction.amount)}</span>
            <button class="delete-btn" aria-label="Delete earnings entry" data-id="${transaction.id}">✕</button>
          </div>
        </article>
      `
    )
    .join('');

  dom.earningsList.querySelectorAll('.delete-btn').forEach((button) => {
    button.addEventListener('click', () => deleteTransaction(button.dataset.id));
  });
}

function renderPeriodView() {
  const { start, end } = getPeriodRange();
  const searchTerm = dom.periodSearchInput.value.trim().toLowerCase();
  const typeFilter = dom.periodTypeFilter.value;

  const filteredTransactions = state.transactions.filter((transaction) => {
    const date = new Date(transaction.date);
    const matchesRange = date >= start && date <= end;
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
    const matchesSearch = !searchTerm || `${transaction.title} ${transaction.category}`.toLowerCase().includes(searchTerm);
    return matchesRange && matchesType && matchesSearch;
  });

  const income = filteredTransactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expenses = filteredTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  dom.periodIncome.textContent = formatCurrency(income);
  dom.periodExpense.textContent = formatCurrency(expenses);
  dom.periodTitle.textContent = getPeriodLabel();

  if (!filteredTransactions.length) {
    dom.periodTransactionsList.innerHTML = `
      <div class="empty-state">
        <p>No transactions match this view.</p>
        <small>Try a different search or date filter.</small>
      </div>
    `;
    return;
  }

  const sorted = [...filteredTransactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  dom.periodTransactionsList.innerHTML = sorted
    .map(
      (transaction) => `
        <article class="transaction-item">
          <div class="transaction-main">
            <div class="icon-badge">${categoryIcons[transaction.category] || '🧾'}</div>
            <div class="transaction-meta">
              <strong>${transaction.title}</strong>
              <small>${transaction.category} • ${formatDate(transaction.date)}</small>
            </div>
          </div>
          <span class="transaction-amount ${transaction.type}">${transaction.type === 'income' ? '+' : '-'} ${formatCurrency(transaction.amount)}</span>
        </article>
      `
    )
    .join('');
}

function selectPeriod(period) {
  state.activePeriod = period;
  state.periodStart = '';
  state.periodEnd = '';
  dom.startDateInput.value = '';
  dom.endDateInput.value = '';
  dom.periodChips.forEach((chip) => chip.classList.toggle('active', chip.dataset.period === period));
  renderPeriodView();
}

function applyCustomRange() {
  const startValue = dom.startDateInput.value;
  const endValue = dom.endDateInput.value;

  if (!startValue || !endValue) {
    alert('Please choose both a start date and an end date.');
    return;
  }

  state.activePeriod = 'custom';
  state.periodStart = startValue;
  state.periodEnd = endValue;
  dom.periodChips.forEach((chip) => chip.classList.toggle('active', chip.dataset.period === 'custom'));
  renderPeriodView();
}

function getPeriodRange() {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);

  if (state.activePeriod === 'week') {
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(today.getDate() + diff);
    end.setDate(today.getDate() + (day === 0 ? 0 : 7 - day));
  } else if (state.activePeriod === 'month') {
    start.setDate(1);
    end.setMonth(today.getMonth() + 1, 0);
  } else if (state.activePeriod === 'custom' && state.periodStart && state.periodEnd) {
    start.setTime(new Date(`${state.periodStart}T00:00:00`).getTime());
    end.setTime(new Date(`${state.periodEnd}T23:59:59`).getTime());
  } else {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

function getPeriodLabel() {
  if (state.activePeriod === 'week') return 'This Week';
  if (state.activePeriod === 'month') return 'This Month';
  if (state.activePeriod === 'custom') return 'Custom Range';
  return 'Today';
}

function renderInsights() {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthlyTransactions = state.transactions.filter((transaction) => transaction.date.startsWith(monthKey));
  const income = monthlyTransactions.filter((transaction) => transaction.type === 'income').reduce((sum, item) => sum + item.amount, 0);
  const expenses = monthlyTransactions.filter((transaction) => transaction.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
  const savings = income - expenses;
  const expenseCount = monthlyTransactions.filter((transaction) => transaction.type === 'expense').length;
  const averageExpense = expenseCount ? expenses / expenseCount : 0;
  const categoryTotals = monthlyTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((acc, transaction) => {
      acc[transaction.category] = (acc[transaction.category] || 0) + transaction.amount;
      return acc;
    }, {});
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  const ratio = income ? (expenses / income) * 100 : 0;

  const templates = [
    {
      badge: 'Momentum',
      message: savings >= 0
        ? `You saved ${formatCurrency(savings)} this month and your momentum looks strong.`
        : `You are ${formatCurrency(Math.abs(savings))} above your income this month. A lighter week could help.`,
      hint: 'A calm review today is better than a rushed one tomorrow.'
    },
    {
      badge: 'Biggest spend',
      message: topCategory
        ? `${topCategory[0]} is taking the largest share of your spending at ${formatCurrency(topCategory[1])}.`
        : 'Your spending is still very light, which is a great place to start.',
      hint: 'Small tweaks in one category often improve the whole month.'
    },
    {
      badge: 'Average expense',
      message: expenseCount
        ? `Your average expense this month is ${formatCurrency(averageExpense)}, which is a helpful benchmark.`
        : 'Add a few expenses to unlock a more personal monthly snapshot.',
      hint: 'Consistency beats intensity when you are tracking money.'
    },
    {
      badge: 'Balance check',
      message: income > 0
        ? `You spent roughly ${ratio.toFixed(0)}% of your income this month.`
        : 'Your income is still empty, so the next entry will shape the story.',
      hint: 'A simple weekly check-in keeps your finances feeling effortless.'
    }
  ];

  const insight = templates[state.insightIndex % templates.length];
  dom.insightBadge.textContent = insight.badge;
  dom.insightMessage.textContent = insight.message;
  dom.insightHint.textContent = insight.hint;
}

function syncFeedbackSettings() {
  if (dom.celebrationsToggle) {
    dom.celebrationsToggle.checked = state.celebrationsEnabled;
  }
}

function celebrateMoneyAdded() {
  if (!state.celebrationsEnabled) {
    return;
  }

  playConfettiSound();
}

function launchConfettiBurst() {
  const overlay = document.createElement('div');
  overlay.className = 'confetti-overlay';

  const colors = ['#f59e0b', '#22c55e', '#3b82f6', '#f43f5e', '#8b5cf6', '#fef08a', '#06b6d4', '#fb7185', '#a3e635'];
  const shapes = ['shape-circle', 'shape-rect', 'shape-strip'];
  const particlesPerSide = 220;
  const viewportHeight = window.innerHeight;

  const createBurst = (side) => {
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < particlesPerSide; i += 1) {
      const piece = document.createElement('span');
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      piece.className = `confetti-piece ${shape}`;

      const size = 6 + Math.random() * 10;
      piece.style.width = `${size}px`;
      piece.style.height = shape === 'shape-strip' ? `${size * 2.4}px` : `${size * 1.5}px`;
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];

      const originTop = 55 + Math.random() * 35; // launch from the lower half of the screen
      piece.style.top = `${originTop}%`;
      if (side === 'left') {
        piece.style.left = `${-4 - Math.random() * 4}%`;
      } else {
        piece.style.right = `${-4 - Math.random() * 4}%`;
      }

      const spreadX = 45 + Math.random() * 55; // vw travelled inward across the screen
      const tx = side === 'left' ? spreadX : -spreadX;
      const peakY = -(70 + Math.random() * 130);
      const finalY = peakY + (120 + Math.random() * (viewportHeight * 0.55));
      const rot = (Math.random() > 0.5 ? 1 : -1) * (720 + Math.random() * 720);
      const duration = 2.6 + Math.random() * 1.8; // slowed down so it reads as a burst, not a blur
      const delay = Math.random() * 0.4;

      piece.style.setProperty('--tx', `${tx}vw`);
      piece.style.setProperty('--peak-y', `${peakY}px`);
      piece.style.setProperty('--ty', `${finalY}px`);
      piece.style.setProperty('--rot', `${rot}deg`);
      piece.style.setProperty('--duration', `${duration}s`);
      piece.style.setProperty('--delay', `${delay}s`);

      fragment.appendChild(piece);
    }

    overlay.appendChild(fragment);
  };

  createBurst('left');
  createBurst('right');

  document.body.appendChild(overlay);
  window.setTimeout(() => overlay.remove(), 5200);
}

function playConfettiSound() {
  if (typeof window.AudioContext === 'undefined' && typeof window.webkitAudioContext === 'undefined') {
    return;
  }

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const now = audioContext.currentTime;

  // Two soft cannon "pops", one for each side, slightly offset
  [0, 0.09].forEach((offset) => {
    const pop = audioContext.createOscillator();
    const popGain = audioContext.createGain();
    pop.type = 'triangle';
    pop.frequency.setValueAtTime(190, now + offset);
    pop.frequency.exponentialRampToValueAtTime(55, now + offset + 0.14);
    popGain.gain.setValueAtTime(0.0001, now + offset);
    popGain.gain.exponentialRampToValueAtTime(0.06, now + offset + 0.01);
    popGain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.2);
    pop.connect(popGain);
    popGain.connect(audioContext.destination);
    pop.start(now + offset);
    pop.stop(now + offset + 0.22);
  });

  // Sparkly ascending arpeggio right after the pops, for the dopamine hit
  const notes = [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98];
  notes.forEach((freq, index) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const start = now + 0.16 + index * 0.07;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.05, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(start);
    osc.stop(start + 0.34);
  });

  window.setTimeout(() => audioContext.close(), 1200);
}

function playExpenseAddedSound() {
  if (typeof window.AudioContext === 'undefined' && typeof window.webkitAudioContext === 'undefined') {
    return;
  }

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const now = audioContext.currentTime;

  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.exponentialRampToValueAtTime(340, now + 0.12);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + 0.18);

  window.setTimeout(() => audioContext.close(), 400);
}

function renderCharts() {
  renderCategoryChart();
  renderMonthlyChart();
}

function renderCategoryChart() {
  const expensesByCategory = state.transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((acc, transaction) => {
      acc[transaction.category] = (acc[transaction.category] || 0) + transaction.amount;
      return acc;
    }, {});

  const labels = Object.keys(expensesByCategory);
  const data = Object.values(expensesByCategory);

  if (state.categoryChart) {
    state.categoryChart.destroy();
  }

  const ctx = document.getElementById('categoryChart');
  const isBarMode = state.insightIndex % 2 === 1;
  const chartType = isBarMode ? 'bar' : 'doughnut';

  state.categoryChart = new Chart(ctx, {
    type: chartType,
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: ['#3b82f6', '#22c55e', '#ef4444', '#8b5cf6', '#f59e0b', '#06b6d4', '#a3e635', '#f43f5e', '#64748b'],
          borderColor: '#ffffff',
          borderWidth: 2,
          borderRadius: chartType === 'bar' ? 8 : 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: chartType === 'doughnut' ? '68%' : undefined,
      layout: {
        padding: {
          top: 8,
          bottom: 8,
          left: 8,
          right: 8
        }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 10,
            padding: 10,
            font: {
              size: 11
            }
          }
        },
        tooltip: {
          callbacks: {
            label(context) {
              return `${context.label}: ${formatCurrency(context.raw)}`;
            }
          }
        }
      },
      scales: chartType === 'bar' ? {
        y: {
          beginAtZero: true,
          ticks: {
            callback(value) {
              return formatCurrency(value);
            }
          }
        }
      } : undefined
    },
    plugins: [valueLabelsPlugin]
  });
}

function renderMonthlyChart() {
  const monthlyData = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - index);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const earnings = state.transactions
      .filter((transaction) => transaction.type === 'income' && transaction.date.startsWith(monthKey))
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const expenses = state.transactions
      .filter((transaction) => transaction.type === 'expense' && transaction.date.startsWith(monthKey))
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      earnings,
      expenses,
      savings: earnings - expenses
    };
  }).reverse();

  if (state.monthlyChart) {
    state.monthlyChart.destroy();
  }

  const ctx = document.getElementById('monthlyChart');
  state.monthlyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthlyData.map((item) => item.month),
      datasets: [
        {
          label: 'Earnings',
          data: monthlyData.map((item) => item.earnings),
          backgroundColor: '#22c55e'
        },
        {
          label: 'Expenses',
          data: monthlyData.map((item) => item.expenses),
          backgroundColor: '#ef4444'
        },
        {
          label: 'Savings',
          data: monthlyData.map((item) => item.savings),
          backgroundColor: '#3b82f6'
        }
      ]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true } }
    }
  });
}

function toggleCustomThemePanel() {
  if (!dom.customThemePanel) return;

  dom.customThemePanel.classList.toggle('hidden');
  const expanded = !dom.customThemePanel.classList.contains('hidden');
  dom.customThemeBtn?.setAttribute('aria-expanded', String(expanded));
  dom.customThemeBtn?.classList.toggle('active', expanded);
}

function updateCustomThemeFromInputs() {
  state.palette = 'custom';
  state.customColors = {
    accent: dom.accentColorInput?.value || state.customColors.accent,
    income: dom.incomeColorInput?.value || state.customColors.income,
    text: dom.textColorInput?.value || state.customColors.text,
    background: dom.backgroundColorInput?.value || state.customColors.background,
    surface: dom.surfaceColorInput?.value || state.customColors.surface
  };
  saveState();
  applyTheme();
}

function applyTheme() {
  document.body.classList.toggle('dark', state.theme === 'dark');
  dom.themeToggle.innerHTML = state.theme === 'dark' ? '🌙' : '☀️';
  updateFabVisibility(document.querySelector('.view.active')?.id || 'homeView');

  dom.themeOptions.forEach((button) => {
    button.classList.toggle('active', button.dataset.theme === state.theme);
  });

  dom.paletteOptions.forEach((button) => {
    button.classList.toggle('active', button.dataset.palette === state.palette);
  });

  if (dom.paletteSection) {
    dom.paletteSection.hidden = state.theme === 'dark';
  }

  if (dom.customThemeSection) {
    dom.customThemeSection.hidden = state.theme === 'dark';
  }

  const paletteMap = {
    classic: {
      accent: '#3b82f6',
      income: '#22c55e',
      text: state.theme === 'dark' ? '#f8fafc' : '#172033',
      background: state.theme === 'dark' ? '#07111f' : '#f5f7fa',
      surface: state.theme === 'dark' ? '#0f172a' : '#ffffff',
      surface2: state.theme === 'dark' ? '#111c30' : '#f8fafc',
      border: state.theme === 'dark' ? '#243244' : '#e5e7eb',
      muted: state.theme === 'dark' ? '#94a3b8' : '#6b7280'
    },
    ocean: {
      accent: '#0f766e',
      income: '#38bdf8',
      text: state.theme === 'dark' ? '#f8fafc' : '#0f172a',
      background: state.theme === 'dark' ? '#03131d' : '#f0f9ff',
      surface: state.theme === 'dark' ? '#0f172a' : '#ffffff',
      surface2: state.theme === 'dark' ? '#142d3f' : '#e0f2fe',
      border: state.theme === 'dark' ? '#21455b' : '#bae6fd',
      muted: state.theme === 'dark' ? '#93c5fd' : '#475569'
    },
    sunset: {
      accent: '#f97316',
      income: '#ec4899',
      text: state.theme === 'dark' ? '#fff7ed' : '#1f2937',
      background: state.theme === 'dark' ? '#1f0f0d' : '#fff7ed',
      surface: state.theme === 'dark' ? '#2a1414' : '#ffffff',
      surface2: state.theme === 'dark' ? '#39211b' : '#ffedd5',
      border: state.theme === 'dark' ? '#6f3b22' : '#fed7aa',
      muted: state.theme === 'dark' ? '#fbbf24' : '#6b7280'
    },
    forest: {
      accent: '#166534',
      income: '#84cc16',
      text: state.theme === 'dark' ? '#f0fdf4' : '#052e16',
      background: state.theme === 'dark' ? '#03110a' : '#f4fdf7',
      surface: state.theme === 'dark' ? '#0d1f13' : '#ffffff',
      surface2: state.theme === 'dark' ? '#12321b' : '#e8f5e9',
      border: state.theme === 'dark' ? '#2d4a32' : '#bbf7d0',
      muted: state.theme === 'dark' ? '#86efac' : '#4b5563'
    },
    custom: {
      accent: state.customColors.accent,
      income: state.customColors.income,
      text: state.customColors.text,
      background: state.customColors.background,
      surface: state.customColors.surface,
      surface2: state.customColors.surface,
      border: state.theme === 'dark' ? '#314d69' : '#dbeafe',
      muted: state.theme === 'dark' ? '#cbd5e1' : '#64748b'
    }
  };

  const colors = paletteMap[state.palette] || paletteMap.classic;
  document.documentElement.style.setProperty('--accent', colors.accent);
  document.documentElement.style.setProperty('--income', colors.income);
  document.documentElement.style.setProperty('--text', colors.text);
  document.documentElement.style.setProperty('--bg', colors.background);
  document.documentElement.style.setProperty('--surface', colors.surface);
  document.documentElement.style.setProperty('--surface-2', colors.surface2);
  document.documentElement.style.setProperty('--border', colors.border);
  document.documentElement.style.setProperty('--muted', colors.muted);
  document.documentElement.style.setProperty('--shadow', state.theme === 'dark'
    ? '0 12px 32px rgba(2, 6, 23, 0.35)'
    : '0 10px 30px rgba(15, 23, 42, 0.08)');

  if (dom.accentColorInput) {
    dom.accentColorInput.value = state.customColors.accent;
  }
  if (dom.incomeColorInput) {
    dom.incomeColorInput.value = state.customColors.income;
  }
  if (dom.backgroundColorInput) {
    dom.backgroundColorInput.value = state.customColors.background;
  }
  if (dom.surfaceColorInput) {
    dom.surfaceColorInput.value = state.customColors.surface;
  }
  if (dom.textColorInput) {
    dom.textColorInput.value = state.customColors.text;
  }

  if (dom.customThemeBtn) {
    dom.customThemeBtn.classList.toggle('active', state.palette === 'custom' && !dom.customThemePanel?.classList.contains('hidden'));
  }
}

function setTheme(theme) {
  state.theme = theme;
  saveState();
  applyTheme();
}

function setPalette(palette) {
  state.palette = palette;
  saveState();
  applyTheme();
}

function toggleTheme() {
  const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
  setTheme(nextTheme);
}

function maybeShowOnboarding() {
  const hasOnboarded = localStorage.getItem(ONBOARDING_KEY);
  if (!hasOnboarded) {
    dom.onboardingModal?.classList.remove('hidden');
  }
}

function completeOnboarding(theme) {
  setTheme(theme);
  localStorage.setItem(ONBOARDING_KEY, 'true');
  dom.onboardingModal?.classList.add('hidden');
}

function openClearDataConfirm() {
  dom.confirmModal?.classList.remove('hidden');
}

function closeClearDataConfirm() {
  dom.confirmModal?.classList.add('hidden');
}

function confirmClearData() {
  state.transactions = [];
  state.goals = [];
  saveState();
  render();
  closeClearDataConfirm();
}

function exportTransactionsCSV() {
  if (!state.transactions.length) {
    alert('No transactions to export yet.');
    return;
  }

  const rows = [
    ['title', 'amount', 'category', 'type', 'date'],
    ...state.transactions.map((transaction) => [transaction.title, transaction.amount, transaction.category, transaction.type, transaction.date])
  ];

  const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'transactions.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function selectPdfPeriod(period) {
  state.pdfPeriod = period;
  state.pdfStart = '';
  state.pdfEnd = '';
  dom.pdfRangeButtons.forEach((button) => button.classList.toggle('active', button.dataset.pdfPeriod === period));
  dom.pdfStartDateInput.value = '';
  dom.pdfEndDateInput.value = '';
  dom.customPdfRangePanel.classList.add('hidden');
  dom.togglePdfRangeBtn.textContent = 'Choose custom range';
}

function togglePdfCustomRange() {
  const isHidden = dom.customPdfRangePanel.classList.contains('hidden');
  dom.customPdfRangePanel.classList.toggle('hidden');
  dom.togglePdfRangeBtn.textContent = isHidden ? 'Hide custom range' : 'Choose custom range';
  if (isHidden) {
    state.pdfPeriod = 'custom';
    dom.pdfRangeButtons.forEach((button) => button.classList.remove('active'));
  }
}

function exportTransactionsPDF() {
  const summary = getSummary();
  const { start, end } = getPdfRange();
  const filteredTransactions = state.transactions.filter((transaction) => {
    const date = new Date(transaction.date);
    return date >= start && date <= end;
  });

  const rows = filteredTransactions.length
    ? filteredTransactions
        .slice(0, 80)
        .map((transaction) => {
          const sign = transaction.type === 'income' ? '+' : '-';
          const typeClass = transaction.type === 'income' ? 'income-row' : 'expense-row';
          return `
            <tr class="${typeClass}">
              <td>${transaction.title}</td>
              <td>${transaction.category}</td>
              <td>${transaction.type === 'income' ? 'Income' : 'Expense'}</td>
              <td>${sign} ${formatCurrency(transaction.amount)}</td>
            </tr>`;
        })
        .join('')
    : '<tr><td colspan="4" class="empty">No transactions found for this range.</td></tr>';

  const generatedAt = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (!printWindow) {
    alert('Please allow popups to export a PDF.');
    return;
  }

  printWindow.document.write(`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Wallo Summary</title>
        <style>
          @page { size: A4; margin: 12mm; }
          body { font-family: Inter, Arial, sans-serif; margin: 0; padding: 24px; color: #111827; background: #fff; }
          .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 16px; }
          .header h1 { margin: 0 0 6px; font-size: 22px; }
          .muted { color: #6b7280; font-size: 12px; margin: 2px 0; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 16px; }
          .summary-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; background: #f9fafb; }
          .summary-card strong { display: block; font-size: 16px; margin-top: 4px; }
          .summary-card.balance { background: #eff6ff; border-color: #bfdbfe; }
          .summary-card.income { background: #ecfdf5; border-color: #a7f3d0; }
          .summary-card.expense { background: #fef2f2; border-color: #fecaca; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #e5e7eb; }
          th { background: #f3f4f6; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; }
          .income-row td:last-child { color: #16a34a; font-weight: 600; }
          .expense-row td:last-child { color: #dc2626; font-weight: 600; }
          .empty { color: #6b7280; text-align: center; padding: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Wallo Summary</h1>
          <p class="muted">Generated on ${generatedAt}</p>
          <p class="muted">Range: ${getPdfLabel()}</p>
        </div>
        <div class="summary-grid">
          <div class="summary-card balance">
            <div class="muted">Balance</div>
            <strong>${formatCurrency(summary.balance)}</strong>
          </div>
          <div class="summary-card income">
            <div class="muted">Income</div>
            <strong>${formatCurrency(summary.income)}</strong>
          </div>
          <div class="summary-card expense">
            <div class="muted">Expenses</div>
            <strong>${formatCurrency(summary.expenses)}</strong>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Type</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function getPdfRange() {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);

  if (state.pdfPeriod === 'week') {
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(today.getDate() + diff);
    end.setDate(today.getDate() + (day === 0 ? 0 : 7 - day));
  } else if (state.pdfPeriod === 'month') {
    start.setDate(1);
    end.setMonth(today.getMonth() + 1, 0);
  } else if (state.pdfPeriod === 'custom' && state.pdfStart && state.pdfEnd) {
    start.setTime(new Date(`${state.pdfStart}T00:00:00`).getTime());
    end.setTime(new Date(`${state.pdfEnd}T23:59:59`).getTime());
  } else {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

function getPdfLabel() {
  const formatPdfDate = (date) => new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);

  const { start, end } = getPdfRange();

  if (state.pdfPeriod === 'week') {
    return `This Week (${formatPdfDate(start)} to ${formatPdfDate(end)})`;
  }

  if (state.pdfPeriod === 'month') {
    return `This Month (${formatPdfDate(start)} to ${formatPdfDate(end)})`;
  }

  if (state.pdfPeriod === 'custom' && state.pdfStart && state.pdfEnd) {
    return `Custom Range (${formatPdfDate(start)} to ${formatPdfDate(end)})`;
  }

  return `Today (${formatPdfDate(start)})`;
}

function importTransactionsCSV(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = reader.result;
      if (typeof text !== 'string') return;

      const rows = text.split(/\r?\n/).filter(Boolean);
      const parsedTransactions = rows.slice(1).map((row) => {
        const [title, amount, category, type, date] = row.split(',').map((item) => item.replace(/^"|"$/g, ''));
        return {
          id: Date.now().toString() + Math.random(),
          title,
          amount: Number(amount),
          category,
          type,
          date: date || new Date().toISOString()
        };
      });

      state.transactions = [...state.transactions, ...parsedTransactions];
      saveState();
      render();
      alert('Transactions imported successfully.');
    } catch (error) {
      alert('Could not import CSV. Please use the expected format.');
    }
  };

  reader.readAsText(file);
}

init();
