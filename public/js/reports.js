// reports.js — reports & CSV export

async function loadReport() {
  const type = document.getElementById('report-type').value;
  const category = document.getElementById('report-category').value;
  const startDate = document.getElementById('report-start').value;
  const endDate = document.getElementById('report-end').value;

  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (category) params.set('category', category);
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);

  try {
    showLoading();
    const res = await apiFetch(`/reports/summary?${params}`);
    const { income, expense, balance, byCategory } = res.data;

    document.getElementById('rpt-income').textContent = formatCurrency(income.total);
    document.getElementById('rpt-expense').textContent = formatCurrency(expense.total);
    document.getElementById('rpt-balance').textContent = formatCurrency(balance);

    const avgAll = income.count + expense.count > 0
      ? (income.total + expense.total) / (income.count + expense.count)
      : 0;
    document.getElementById('rpt-avg').textContent = formatCurrency(avgAll);

    renderCategoryBreakdown(byCategory);
  } catch (err) {
    showToast('Failed to load report', 'error');
  } finally {
    hideLoading();
  }
}

function renderCategoryBreakdown(byCategory) {
  const container = document.getElementById('report-categories');
  if (!byCategory || !byCategory.length) {
    container.innerHTML = '<div class="empty-state">No data for selected filters</div>';
    return;
  }

  // Group by category, sum totals
  const grouped = {};
  byCategory.forEach((item) => {
    const key = item._id.category;
    if (!grouped[key]) grouped[key] = { income: 0, expense: 0 };
    grouped[key][item._id.type] = item.total;
  });

  const maxTotal = Math.max(...Object.values(grouped).map((g) => g.income + g.expense), 1);

  const rows = Object.entries(grouped)
    .sort((a, b) => (b[1].income + b[1].expense) - (a[1].income + a[1].expense))
    .map(([cat, vals]) => {
      const total = vals.income + vals.expense;
      const pct = ((total / maxTotal) * 100).toFixed(1);
      const color = getCategoryColor(cat);
      const icon = getCategoryIcon(cat);
      return `
      <div class="cat-row">
        <div class="cat-name" title="${escapeHtml(cat)}">${icon} ${escapeHtml(cat)}</div>
        <div class="cat-bar-wrap">
          <div class="cat-bar" style="width:${pct}%;background:${color}"></div>
        </div>
        <div class="cat-total">${formatCurrency(total)}</div>
      </div>`;
    })
    .join('');

  container.innerHTML = rows;
}

// ==================== CSV Export ====================
document.getElementById('export-csv-btn').addEventListener('click', exportCSV);

async function exportCSV() {
  try {
    showLoading();
    const type = document.getElementById('report-type').value;
    const category = document.getElementById('report-category').value;
    const startDate = document.getElementById('report-start').value;
    const endDate = document.getElementById('report-end').value;

    const params = new URLSearchParams({ limit: 1000 });
    if (type) params.set('type', type);
    if (category) params.set('category', category);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    const res = await apiFetch(`/transactions?${params}`);
    const transactions = res.data || [];

    if (!transactions.length) {
      showToast('No transactions to export', 'warning');
      return;
    }

    const header = ['Date', 'Title', 'Category', 'Type', 'Amount', 'Description'];
    const rows = transactions.map((tx) => [
      formatDate(tx.date),
      `"${(tx.title || '').replace(/"/g, '""')}"`,
      tx.category,
      tx.type,
      tx.amount.toFixed(2),
      `"${(tx.description || '').replace(/"/g, '""')}"`,
    ]);

    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported!');
  } catch (err) {
    showToast('Failed to export CSV', 'error');
  } finally {
    hideLoading();
  }
}

// ==================== Filters ====================
document.getElementById('run-report-btn').addEventListener('click', loadReport);
