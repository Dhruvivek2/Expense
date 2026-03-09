// app.js — shared utilities, theme, navigation, categories cache

const API = '/api';
let categoriesCache = [];

// ==================== Toast ====================
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  const icons = { success: '✅', error: '❌', warning: '⚠️' };
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    setTimeout(() => toast.remove(), 350);
  }, 3500);
}

// ==================== Loading ====================
function showLoading() { document.getElementById('loading-overlay').classList.remove('hidden'); }
function hideLoading() { document.getElementById('loading-overlay').classList.add('hidden'); }

// ==================== API helpers ====================
async function apiFetch(url, options = {}) {
  const res = await fetch(API + url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Request failed');
  return json;
}

// ==================== Format helpers ====================
function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

// ==================== Theme ====================
function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

document.getElementById('theme-toggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon(next);
});

// ==================== Tab Navigation ====================
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach((s) => s.classList.remove('active'));
  const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  const section = document.getElementById(`tab-${tabId}`);
  if (btn) btn.classList.add('active');
  if (section) section.classList.add('active');
}

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    switchTab(tab);
    if (tab === 'transactions') loadTransactions();
    if (tab === 'budget') loadBudgets();
    if (tab === 'reports') loadReport();
    if (tab === 'dashboard') loadDashboard();
  });
});

document.getElementById('view-all-btn').addEventListener('click', () => {
  switchTab('transactions');
  loadTransactions();
});

document.getElementById('quick-add-btn').addEventListener('click', () => openTransactionModal());
document.getElementById('add-transaction-btn').addEventListener('click', () => openTransactionModal());

// ==================== Categories ====================
async function loadCategories() {
  try {
    const res = await apiFetch('/categories');
    categoriesCache = res.data || [];
    populateCategorySelects();
  } catch (e) {
    console.error('Failed to load categories', e);
  }
}

function populateCategorySelects() {
  const selects = ['tx-category', 'filter-category', 'budget-category', 'report-category'];
  selects.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const current = el.value;
    const firstOption = el.options[0];
    el.innerHTML = '';
    if (firstOption && firstOption.value === '') el.appendChild(firstOption.cloneNode(true));
    categoriesCache.forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = cat.name;
      opt.textContent = `${cat.icon || ''} ${cat.name}`;
      el.appendChild(opt);
    });
    if (current) el.value = current;
  });
}

function getCategoryIcon(name) {
  const cat = categoriesCache.find((c) => c.name === name);
  return cat ? cat.icon || '📦' : '📦';
}

function getCategoryColor(name) {
  const cat = categoriesCache.find((c) => c.name === name);
  return cat ? cat.color || '#6C63FF' : '#6C63FF';
}

// ==================== Dashboard Summary ====================
async function loadDashboard() {
  try {
    showLoading();
    const [summaryRes, recentRes] = await Promise.all([
      apiFetch('/reports/summary'),
      apiFetch('/transactions?limit=5&sort=date&order=desc'),
    ]);

    const { income, expense, balance } = summaryRes.data;
    document.getElementById('total-income').textContent = formatCurrency(income.total);
    document.getElementById('total-expenses').textContent = formatCurrency(expense.total);
    document.getElementById('net-balance').textContent = formatCurrency(balance);

    const savingsRate = income.total > 0 ? ((balance / income.total) * 100).toFixed(1) : '0';
    document.getElementById('savings-rate').textContent = `${savingsRate}%`;

    renderRecentTransactions(recentRes.data || []);
    renderCharts(summaryRes.data);
  } catch (e) {
    showToast('Failed to load dashboard', 'error');
  } finally {
    hideLoading();
  }
}

function renderRecentTransactions(transactions) {
  const container = document.getElementById('recent-transactions-list');
  if (!transactions.length) {
    container.innerHTML = '<div class="empty-state">No transactions yet. Add your first transaction!</div>';
    return;
  }
  container.innerHTML = transactions
    .map(
      (tx) => `
    <div class="transaction-item">
      <div class="tx-icon tx-icon-${tx.type}">${getCategoryIcon(tx.category)}</div>
      <div class="tx-info">
        <div class="tx-title">${escapeHtml(tx.title)}</div>
        <div class="tx-meta">${formatDate(tx.date)} · ${escapeHtml(tx.category)}</div>
      </div>
      <div class="tx-amount ${tx.type}">${tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}</div>
    </div>`
    )
    .join('');
}

// ==================== Escape HTML ====================
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ==================== Init ====================
(async function init() {
  initTheme();
  await loadCategories();
  await loadDashboard();
})();
