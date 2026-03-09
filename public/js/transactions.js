// transactions.js — full CRUD for transactions

let currentPage = 1;
let totalPages = 1;

// ==================== Modal Open/Close ====================
function openTransactionModal(tx = null) {
  const modal = document.getElementById('transaction-modal');
  const titleEl = document.getElementById('modal-title');
  const form = document.getElementById('transaction-form');
  form.reset();
  document.getElementById('edit-id').value = '';
  document.getElementById('tx-date').value = todayISO();

  if (tx) {
    titleEl.textContent = 'Edit Transaction';
    document.getElementById('edit-id').value = tx._id;
    document.getElementById('tx-title').value = tx.title;
    document.getElementById('tx-amount').value = tx.amount;
    document.getElementById('tx-type').value = tx.type;
    document.getElementById('tx-category').value = tx.category;
    document.getElementById('tx-date').value = tx.date ? tx.date.split('T')[0] : todayISO();
    document.getElementById('tx-description').value = tx.description || '';
  } else {
    titleEl.textContent = 'Add Transaction';
  }

  modal.classList.add('open');
}

function closeTransactionModal() {
  document.getElementById('transaction-modal').classList.remove('open');
}

document.getElementById('modal-close-btn').addEventListener('click', closeTransactionModal);
document.getElementById('cancel-btn').addEventListener('click', closeTransactionModal);
document.getElementById('transaction-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeTransactionModal();
});

// ==================== Form Submit ====================
document.getElementById('transaction-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('edit-id').value;
  const payload = {
    title: document.getElementById('tx-title').value.trim(),
    amount: parseFloat(document.getElementById('tx-amount').value),
    type: document.getElementById('tx-type').value,
    category: document.getElementById('tx-category').value,
    date: document.getElementById('tx-date').value,
    description: document.getElementById('tx-description').value.trim(),
  };

  try {
    showLoading();
    if (id) {
      await apiFetch(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('Transaction updated!');
    } else {
      await apiFetch('/transactions', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Transaction added!');
    }
    closeTransactionModal();
    loadTransactions();
    loadDashboard();
  } catch (err) {
    showToast(err.message || 'Failed to save transaction', 'error');
  } finally {
    hideLoading();
  }
});

// ==================== Load Transactions ====================
async function loadTransactions(page = 1) {
  currentPage = page;
  const type = document.getElementById('filter-type').value;
  const category = document.getElementById('filter-category').value;
  const startDate = document.getElementById('filter-start').value;
  const endDate = document.getElementById('filter-end').value;

  const params = new URLSearchParams({ page, limit: 20, sort: 'date', order: 'desc' });
  if (type) params.set('type', type);
  if (category) params.set('category', category);
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);

  try {
    showLoading();
    const res = await apiFetch(`/transactions?${params}`);
    renderTransactionsTable(res.data || []);
    totalPages = res.pagination ? res.pagination.pages : 1;
    renderPagination(res.pagination);
  } catch (err) {
    showToast('Failed to load transactions', 'error');
  } finally {
    hideLoading();
  }
}

function renderTransactionsTable(transactions) {
  const tbody = document.getElementById('transactions-tbody');
  if (!transactions.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No transactions found</td></tr>';
    return;
  }
  tbody.innerHTML = transactions
    .map(
      (tx) => `
    <tr>
      <td>${formatDate(tx.date)}</td>
      <td>
        <strong>${escapeHtml(tx.title)}</strong>
        ${tx.description ? `<br><small style="color:var(--text-muted)">${escapeHtml(tx.description)}</small>` : ''}
      </td>
      <td>${getCategoryIcon(tx.category)} ${escapeHtml(tx.category)}</td>
      <td><span class="badge badge-${tx.type}">${tx.type}</span></td>
      <td class="text-right amount-${tx.type}">${tx.type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}</td>
      <td>
        <button class="btn-icon" onclick="editTransaction('${tx._id}')" title="Edit">✏️</button>
        <button class="btn-icon" onclick="deleteTransaction('${tx._id}')" title="Delete">🗑️</button>
      </td>
    </tr>`
    )
    .join('');
}

function renderPagination(pagination) {
  const container = document.getElementById('pagination');
  if (!pagination || pagination.pages <= 1) { container.innerHTML = ''; return; }
  const { page, pages } = pagination;
  let html = '';
  html += `<button class="page-btn" onclick="loadTransactions(${page - 1})" ${page <= 1 ? 'disabled' : ''}>‹ Prev</button>`;
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 2) {
      html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="loadTransactions(${i})">${i}</button>`;
    } else if (Math.abs(i - page) === 3) {
      html += `<span style="padding:6px 4px;color:var(--text-muted)">…</span>`;
    }
  }
  html += `<button class="page-btn" onclick="loadTransactions(${page + 1})" ${page >= pages ? 'disabled' : ''}>Next ›</button>`;
  container.innerHTML = html;
}

// ==================== Edit / Delete ====================
async function editTransaction(id) {
  try {
    showLoading();
    const res = await apiFetch(`/transactions/${id}`);
    if (res.data) openTransactionModal(res.data);
  } catch (err) {
    showToast('Failed to load transaction', 'error');
  } finally {
    hideLoading();
  }
}

async function deleteTransaction(id) {
  if (!confirm('Delete this transaction?')) return;
  try {
    showLoading();
    await apiFetch(`/transactions/${id}`, { method: 'DELETE' });
    showToast('Transaction deleted');
    loadTransactions(currentPage);
    loadDashboard();
  } catch (err) {
    showToast(err.message || 'Failed to delete', 'error');
  } finally {
    hideLoading();
  }
}

// ==================== Filter Buttons ====================
document.getElementById('apply-filters-btn').addEventListener('click', () => loadTransactions(1));
document.getElementById('clear-filters-btn').addEventListener('click', () => {
  document.getElementById('filter-type').value = '';
  document.getElementById('filter-category').value = '';
  document.getElementById('filter-start').value = '';
  document.getElementById('filter-end').value = '';
  loadTransactions(1);
});
