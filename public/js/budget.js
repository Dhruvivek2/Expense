// budget.js — budget goals management

(function () {
  // Populate month/year dropdowns
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const now = new Date();

  function populateBudgetMonthYear() {
    const monthSel = document.getElementById('budget-month');
    const yearSel = document.getElementById('budget-year');
    const setMonthSel = document.getElementById('budget-set-month');

    monthNames.forEach((name, i) => {
      const opt = document.createElement('option');
      opt.value = i + 1;
      opt.textContent = name;
      if (i + 1 === now.getMonth() + 1) opt.selected = true;
      monthSel.appendChild(opt);

      const opt2 = opt.cloneNode(true);
      setMonthSel.appendChild(opt2);
    });

    const currentYear = now.getFullYear();
    for (let y = currentYear - 2; y <= currentYear + 2; y++) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      if (y === currentYear) opt.selected = true;
      yearSel.appendChild(opt);
    }

    document.getElementById('budget-set-year').value = currentYear;
  }

  populateBudgetMonthYear();

  // ==================== Load Budgets ====================
  async function loadBudgets() {
    const month = document.getElementById('budget-month').value;
    const year = document.getElementById('budget-year').value;

    try {
      showLoading();
      const [budgetRes, txRes] = await Promise.all([
        apiFetch(`/budgets?month=${month}&year=${year}`),
        apiFetch(`/transactions?type=expense&limit=1000`),
      ]);

      const budgets = budgetRes.data || [];
      const transactions = txRes.data || [];

      // Calculate spending per category for the selected month/year
      const spending = {};
      transactions.forEach((tx) => {
        const d = new Date(tx.date);
        if (d.getMonth() + 1 === parseInt(month) && d.getFullYear() === parseInt(year)) {
          spending[tx.category] = (spending[tx.category] || 0) + tx.amount;
        }
      });

      renderBudgets(budgets, spending, month, year);
    } catch (err) {
      showToast('Failed to load budgets', 'error');
    } finally {
      hideLoading();
    }
  }

  window.loadBudgets = loadBudgets;

  function renderBudgets(budgets, spending, month, year) {
    const container = document.getElementById('budget-list');
    if (!budgets.length) {
      container.innerHTML = '<div class="empty-state">No budgets set. Click "+ Set Budget" to add one.</div>';
      return;
    }

    container.innerHTML = budgets.map((b) => {
      const spent = spending[b.category] || 0;
      const pct = Math.min((spent / b.amount) * 100, 100).toFixed(1);
      const rawPct = (spent / b.amount) * 100;
      const statusClass = rawPct >= 100 ? 'over-budget' : rawPct >= 80 ? 'warning' : '';
      const barClass = rawPct >= 100 ? 'over' : rawPct >= 80 ? 'warning' : '';
      const icon = getCategoryIcon(b.category);

      // Send email reminder if over 80%
      if (rawPct >= 80) {
        scheduleEmailReminder(b, spent);
      }

      return `
      <div class="budget-card ${statusClass}">
        <div class="budget-card-header">
          <div class="budget-category">
            <span>${icon}</span>
            <span>${escapeHtml(b.category)}</span>
            ${rawPct >= 100 ? '<span style="color:var(--expense)">⚠️ Over Budget!</span>' : rawPct >= 80 ? '<span style="color:var(--warning)">⚠️ Near Limit</span>' : ''}
          </div>
          <button class="btn-icon" onclick="deleteBudget('${b._id}')" title="Remove budget">🗑️</button>
        </div>
        <div class="budget-amounts">
          <span class="spent">Spent: ${formatCurrency(spent)}</span>
          <span>Budget: ${formatCurrency(b.amount)}</span>
        </div>
        <div class="progress-bar-wrapper">
          <div class="progress-bar ${barClass}" style="width:${pct}%"></div>
        </div>
        <div class="budget-pct">${pct}% used · ${formatCurrency(Math.max(0, b.amount - spent))} remaining</div>
      </div>`;
    }).join('');
  }

  // ==================== Budget Email Reminder ====================
  const sentReminders = new Set();

  async function scheduleEmailReminder(budget, spent) {
    const key = `${budget._id}-${Math.floor(spent)}`;
    if (sentReminders.has(key)) return;
    sentReminders.add(key);
    // Auto-send is disabled by default (would require user email)
    // Kept as infrastructure; can be triggered manually
  }

  // ==================== Delete Budget ====================
  window.deleteBudget = async function (id) {
    if (!confirm('Remove this budget goal?')) return;
    try {
      showLoading();
      await apiFetch(`/budgets/${id}`, { method: 'DELETE' });
      showToast('Budget removed');
      loadBudgets();
    } catch (err) {
      showToast(err.message || 'Failed to delete', 'error');
    } finally {
      hideLoading();
    }
  };

  // ==================== Budget Modal ====================
  function openBudgetModal() {
    document.getElementById('budget-form').reset();
    document.getElementById('budget-set-year').value = now.getFullYear();
    document.getElementById('budget-set-month').value = now.getMonth() + 1;
    populateBudgetCategorySelect();
    document.getElementById('budget-modal').classList.add('open');
  }

  function closeBudgetModal() {
    document.getElementById('budget-modal').classList.remove('open');
  }

  function populateBudgetCategorySelect() {
    const sel = document.getElementById('budget-category');
    const current = sel.value;
    sel.innerHTML = '';
    categoriesCache.forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = cat.name;
      opt.textContent = `${cat.icon || ''} ${cat.name}`;
      sel.appendChild(opt);
    });
    if (current) sel.value = current;
  }

  document.getElementById('add-budget-btn').addEventListener('click', openBudgetModal);
  document.getElementById('budget-modal-close').addEventListener('click', closeBudgetModal);
  document.getElementById('budget-cancel-btn').addEventListener('click', closeBudgetModal);
  document.getElementById('budget-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeBudgetModal();
  });

  document.getElementById('budget-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      category: document.getElementById('budget-category').value,
      amount: parseFloat(document.getElementById('budget-amount').value),
      month: parseInt(document.getElementById('budget-set-month').value),
      year: parseInt(document.getElementById('budget-set-year').value),
    };
    try {
      showLoading();
      await apiFetch('/budgets', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Budget saved!');
      closeBudgetModal();
      loadBudgets();
    } catch (err) {
      showToast(err.message || 'Failed to save budget', 'error');
    } finally {
      hideLoading();
    }
  });

  document.getElementById('load-budgets-btn').addEventListener('click', loadBudgets);
})();
