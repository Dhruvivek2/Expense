// charts.js — Chart.js visualizations

let categoryChartInstance = null;
let monthlyChartInstance = null;
let dailyChartInstance = null;

function destroyChart(instance) {
  if (instance) instance.destroy();
}

function getThemeColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    text: style.getPropertyValue('--text').trim(),
    textMuted: style.getPropertyValue('--text-muted').trim(),
  };
}

async function renderCharts(summaryData) {
  await renderCategoryChart(summaryData);
  await renderMonthlyChart();
  await renderDailyChart();
}

// ==================== Category Doughnut ====================
async function renderCategoryChart(summaryData) {
  const canvas = document.getElementById('categoryChart');
  destroyChart(categoryChartInstance);

  const expenseByCategory = {};
  (summaryData.byCategory || []).forEach((item) => {
    if (item._id.type === 'expense') {
      expenseByCategory[item._id.category] = (expenseByCategory[item._id.category] || 0) + item.total;
    }
  });

  const labels = Object.keys(expenseByCategory);
  const values = Object.values(expenseByCategory);

  if (!labels.length) {
    canvas.parentElement.innerHTML = '<div class="empty-state">No expense data for chart</div>';
    return;
  }

  const colors = labels.map((l) => getCategoryColor(l));

  categoryChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: 'var(--card)' }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: getThemeColors().text } },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(ctx.raw)}`,
          },
        },
      },
    },
  });
}

// ==================== Monthly Bar Chart ====================
async function renderMonthlyChart() {
  const canvas = document.getElementById('monthlyChart');
  destroyChart(monthlyChartInstance);

  try {
    const res = await apiFetch('/reports/monthly');
    const raw = res.data || [];

    const monthMap = {};
    raw.forEach((item) => {
      const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { income: 0, expense: 0 };
      monthMap[key][item._id.type] = item.total;
    });

    const sortedKeys = Object.keys(monthMap).sort();
    const labels = sortedKeys.map((k) => {
      const [y, m] = k.split('-');
      return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' });
    });
    const incomeData = sortedKeys.map((k) => monthMap[k].income || 0);
    const expenseData = sortedKeys.map((k) => monthMap[k].expense || 0);

    if (!sortedKeys.length) {
      canvas.parentElement.innerHTML = '<div class="empty-state">No monthly data yet</div>';
      return;
    }

    monthlyChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Income', data: incomeData, backgroundColor: 'rgba(46,204,113,0.7)', borderRadius: 6 },
          { label: 'Expenses', data: expenseData, backgroundColor: 'rgba(231,76,60,0.7)', borderRadius: 6 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: getThemeColors().text } },
        },
        scales: {
          x: { ticks: { color: getThemeColors().textMuted }, grid: { display: false } },
          y: { ticks: { color: getThemeColors().textMuted }, beginAtZero: true },
        },
      },
    });
  } catch (e) {
    canvas.parentElement.innerHTML = '<div class="empty-state">Failed to load monthly data</div>';
  }
}

// ==================== Daily Line Chart ====================
async function renderDailyChart() {
  const canvas = document.getElementById('dailyChart');
  destroyChart(dailyChartInstance);

  try {
    const res = await apiFetch('/reports/daily');
    const raw = res.data || [];

    if (!raw.length) {
      canvas.parentElement.innerHTML = '<div class="empty-state">No daily spending data this month</div>';
      return;
    }

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const dayMap = {};
    raw.forEach((d) => { dayMap[d._id.day] = d.total; });
    const values = labels.map((d) => dayMap[d] || 0);

    dailyChartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Daily Expenses',
            data: values,
            borderColor: '#6C63FF',
            backgroundColor: 'rgba(108,99,255,0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: getThemeColors().text } },
        },
        scales: {
          x: { ticks: { color: getThemeColors().textMuted }, grid: { display: false } },
          y: { ticks: { color: getThemeColors().textMuted }, beginAtZero: true },
        },
      },
    });
  } catch (e) {
    canvas.parentElement.innerHTML = '<div class="empty-state">Failed to load daily data</div>';
  }
}
