/**
 * Saif's Personal Expense Tracker Management System
 * Main Application Controller & Visualizations
 * Author: Saif Shaik (saifshaik27)
 */

// Application State
let appState = {
    selectedMonth: new Date().getMonth() + 1, // 1-12
    selectedYear: new Date().getFullYear(),
    categories: [],
    recentTransactions: [],
    allTransactions: []
};

// Chart.js references
let trendChartInstance = null;
let categoryDonutInstance = null;
let reportCategoryChartInstance = null;
let searchDebounceTimer = null;

// Currency Formatter
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(amount);
};

// API Request Helper with Auth Token
async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    if (!token) {
        window.location.href = 'login.html';
        return null;
    }

    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...(options.headers || {})
        }
    };

    try {
        const response = await fetch(endpoint, config);

        if (response.status === 401 || response.status === 403) {
            clearSession();
            window.location.href = 'login.html';
            return null;
        }

        const data = await response.json();
        return data;
    } catch (err) {
        console.error(`API Error on ${endpoint}:`, err);
        showToast('Network error or server unreachable', 'error');
        return null;
    }
}

// Toast Notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-exclamation';
    if (type === 'warning') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ==============================================================
// INITIALIZATION & NAVIGATION
// ==============================================================

document.addEventListener('DOMContentLoaded', async () => {
    if (!isAuthenticated()) return;

    // Display user profile info in sidebar
    const user = getUser();
    if (user) {
        document.getElementById('sidebar-user-name').innerText = user.name || 'Saif Shaik';
        document.getElementById('sidebar-user-email').innerText = user.email || 'saif@example.com';
        document.getElementById('sidebar-user-avatar').innerText = (user.name || 'S').charAt(0).toUpperCase();
    }

    // Initialize global month picker with current year-month
    const monthPicker = document.getElementById('global-month-picker');
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (monthPicker) {
        monthPicker.value = currentMonthStr;
    }

    // Set today's date in transaction modal
    const txnDateInput = document.getElementById('txn-date');
    if (txnDateInput) {
        txnDateInput.value = now.toISOString().slice(0, 10);
    }

    // Set budget year default
    const budgetYearInput = document.getElementById('budget-year');
    if (budgetYearInput) {
        budgetYearInput.value = now.getFullYear();
    }
    const budgetMonthSelect = document.getElementById('budget-month');
    if (budgetMonthSelect) {
        budgetMonthSelect.value = now.getMonth() + 1;
    }

    // Initial load: Fetch categories and refresh Dashboard
    await fetchCategories();
    await refreshCurrentView();
});

// Navigation router
function navigate(viewName) {
    const views = ['dashboard', 'transactions', 'categories', 'budgets', 'reports'];
    views.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) el.classList.remove('active');
    });

    const activeView = document.getElementById(`view-${viewName}`);
    if (activeView) activeView.classList.add('active');

    // Update active nav link
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
        if (item.getAttribute('href') === `#${viewName}`) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Update topbar title
    const titles = {
        'dashboard': 'Dashboard Overview',
        'transactions': 'Transactions Management',
        'categories': 'Categories Management',
        'budgets': 'Monthly Budget Manager',
        'reports': 'Financial Spending Reports'
    };
    document.getElementById('page-title').innerText = titles[viewName] || 'Dashboard';

    // Trigger view-specific loads
    if (viewName === 'dashboard') loadDashboard();
    if (viewName === 'transactions') loadTransactionsTable();
    if (viewName === 'categories') renderCategoriesView();
    if (viewName === 'budgets') loadBudgetsView();
    if (viewName === 'reports') loadReportsView();

    // Close mobile sidebar if open
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

function onGlobalMonthChange() {
    const picker = document.getElementById('global-month-picker');
    if (!picker.value) return;

    const [year, month] = picker.value.split('-').map(num => parseInt(num));
    appState.selectedMonth = month;
    appState.selectedYear = year;

    refreshCurrentView();
}

function refreshCurrentView() {
    const activeNav = document.querySelector('.sidebar-nav .nav-item.active');
    const viewName = activeNav ? activeNav.getAttribute('href').replace('#', '') : 'dashboard';
    navigate(viewName);
}

// ==============================================================
// 1. DASHBOARD VIEW CONTROLLER
// ==============================================================

async function loadDashboard() {
    const { selectedMonth, selectedYear } = appState;

    // 1. Load Financial Summary
    const summaryRes = await apiRequest(`/api/reports/summary?month=${selectedMonth}&year=${selectedYear}`);
    if (summaryRes && summaryRes.success) {
        const s = summaryRes.data;
        document.getElementById('dash-total-balance').innerText = formatCurrency(s.net_balance);
        document.getElementById('dash-total-income').innerText = `+${formatCurrency(s.total_income)}`;
        document.getElementById('dash-total-expense').innerText = `-${formatCurrency(s.total_expense)}`;
        document.getElementById('dash-savings-rate').innerText = `Savings Rate: ${s.savings_rate}%`;
        document.getElementById('dash-income-count').innerText = `${s.transaction_count} total entries`;
    }

    // 2. Load Budget Watch Status
    const budgetRes = await apiRequest(`/api/budgets/status?month=${selectedMonth}&year=${selectedYear}`);
    if (budgetRes && budgetRes.success) {
        renderBudgetBanner(budgetRes.data);
    }

    // 3. Load Trend Chart (Income vs Expense)
    await renderTrendChart(selectedYear);

    // 4. Load Category Doughnut Chart
    await renderCategoryDonutChart(selectedMonth, selectedYear);

    // 5. Load Recent 5 Transactions
    await loadRecentTransactions(selectedMonth, selectedYear);
}

function renderBudgetBanner(budget) {
    const limitEl = document.getElementById('dash-budget-limit');
    const remainingEl = document.getElementById('dash-budget-remaining');
    const fillEl = document.getElementById('budget-progress-fill');
    const spentLabel = document.getElementById('budget-spent-label');
    const limitLabel = document.getElementById('budget-limit-label');
    const alertPill = document.getElementById('budget-alert-pill');
    const periodLabel = document.getElementById('budget-banner-period');

    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    periodLabel.innerText = `${monthNames[budget.month]} ${budget.year}`;

    limitEl.innerText = formatCurrency(budget.monthly_limit);
    remainingEl.innerText = `Remaining: ${formatCurrency(budget.remaining_budget)}`;
    spentLabel.innerText = `Spent: ${formatCurrency(budget.total_spent)} (${budget.percentage_used}%)`;
    limitLabel.innerText = `Limit: ${formatCurrency(budget.monthly_limit)}`;

    // Progress bar fill width
    const fillWidth = Math.min(budget.percentage_used, 100);
    fillEl.style.width = `${fillWidth}%`;

    // Visual Alert States
    fillEl.className = 'progress-bar-fill';
    alertPill.className = 'alert-pill d-none';

    if (budget.monthly_limit === 0) {
        alertPill.className = 'alert-pill warning';
        alertPill.innerHTML = '<i class="fa-solid fa-circle-info"></i> No monthly budget set for this period. Click "Adjust Budget" to set a limit!';
    } else if (budget.is_over_budget) {
        fillEl.classList.add('danger');
        alertPill.className = 'alert-pill danger';
        alertPill.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Warning: You have exceeded your monthly budget by ${formatCurrency(budget.total_spent - budget.monthly_limit)}!`;
    } else if (budget.is_near_limit) {
        fillEl.classList.add('warning');
        alertPill.className = 'alert-pill warning';
        alertPill.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Notice: You have used ${budget.percentage_used}% of your budget limit. Watch remaining expenses!`;
    }
}

async function renderTrendChart(year) {
    const res = await apiRequest(`/api/reports/monthly-trend?year=${year}`);
    if (!res || !res.success) return;

    const labels = res.data.map(d => d.month_name);
    const incomeData = res.data.map(d => d.income);
    const expenseData = res.data.map(d => d.expense);

    const ctx = document.getElementById('trendChart');
    if (!ctx) return;

    if (trendChartInstance) trendChartInstance.destroy();

    trendChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Income ($)',
                    data: incomeData,
                    backgroundColor: '#10b981',
                    borderRadius: 6
                },
                {
                    label: 'Expense ($)',
                    data: expenseData,
                    backgroundColor: '#f43f5e',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { boxWidth: 12, font: { weight: 600 } } },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: $${context.raw.toLocaleString()}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f1f5f9' },
                    ticks: { callback: (val) => `$${val}` }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

async function renderCategoryDonutChart(month, year) {
    const res = await apiRequest(`/api/reports/category-breakdown?month=${month}&year=${year}&type=expense`);
    const ctx = document.getElementById('categoryDonutChart');
    if (!ctx) return;

    if (categoryDonutInstance) categoryDonutInstance.destroy();

    if (!res || !res.success || res.data.length === 0) {
        // Draw empty placeholder
        categoryDonutInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['No Expenses Recorded'],
                datasets: [{ data: [1], backgroundColor: ['#e2e8f0'] }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
        return;
    }

    const labels = res.data.map(d => d.category_name);
    const dataValues = res.data.map(d => d.total_amount);
    const bgColors = [
        '#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6',
        '#06b6d4', '#f97316', '#64748b', '#14b8a6', '#6366f1'
    ];

    categoryDonutInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: bgColors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.label}: $${ctx.raw.toLocaleString()}`
                    }
                }
            }
        }
    });
}

async function loadRecentTransactions(month, year) {
    const tbody = document.getElementById('recent-transactions-tbody');
    const res = await apiRequest(`/api/transactions?month=${month}&year=${year}&limit=5`);

    if (!res || !res.success || res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No transactions found for this period. Click "+ New Transaction" to add!</td></tr>';
        return;
    }

    appState.recentTransactions = res.data;
    tbody.innerHTML = res.data.map(txn => createTransactionRowHTML(txn)).join('');
}

// ==============================================================
// 2. TRANSACTIONS VIEW & FILTERS
// ==============================================================

function debounceFilterTransactions() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        loadTransactionsTable();
    }, 300);
}

async function loadTransactionsTable() {
    const search = document.getElementById('filter-search').value;
    const type = document.getElementById('filter-type').value;
    const categoryId = document.getElementById('filter-category').value;
    const startDate = document.getElementById('filter-start-date').value;
    const endDate = document.getElementById('filter-end-date').value;

    let query = `/api/transactions?`;
    if (search) query += `&search=${encodeURIComponent(search)}`;
    if (type) query += `&type=${type}`;
    if (categoryId) query += `&categoryId=${categoryId}`;
    if (startDate) query += `&startDate=${startDate}`;
    if (endDate) query += `&endDate=${endDate}`;

    // If no custom date filter is set, default to selected global month & year
    if (!startDate && !endDate) {
        query += `&month=${appState.selectedMonth}&year=${appState.selectedYear}`;
    }

    const tbody = document.getElementById('transactions-full-tbody');
    const countBadge = document.getElementById('transactions-count-badge');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4">Fetching transactions...</td></tr>';

    const res = await apiRequest(query);

    if (!res || !res.success || res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No transactions match your criteria.</td></tr>';
        countBadge.innerText = '0 entries';
        return;
    }

    appState.allTransactions = res.data;
    countBadge.innerText = `${res.data.length} entries`;

    tbody.innerHTML = res.data.map(txn => createFullTransactionRowHTML(txn)).join('');
}

function createTransactionRowHTML(txn) {
    const isIncome = txn.transaction_type === 'income';
    const amountClass = isIncome ? 'text-income' : 'text-expense';
    const amountPrefix = isIncome ? '+' : '-';

    return `
        <tr>
            <td><strong>${txn.transaction_date}</strong></td>
            <td>${txn.description || '<em>No description</em>'}</td>
            <td><span class="badge-category">${txn.category_name || 'Uncategorized'}</span></td>
            <td><span class="badge badge-${txn.transaction_type}">${txn.transaction_type}</span></td>
            <td class="font-weight-bold ${amountClass}"><strong>${amountPrefix}${formatCurrency(txn.amount)}</strong></td>
            <td>
                <button class="btn-icon-action" onclick="openEditTransactionModal(${txn.transaction_id})" title="Edit">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn-icon-action danger" onclick="deleteTransaction(${txn.transaction_id})" title="Delete">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `;
}

function createFullTransactionRowHTML(txn) {
    const isIncome = txn.transaction_type === 'income';
    const amountClass = isIncome ? 'text-income' : 'text-expense';
    const amountPrefix = isIncome ? '+' : '-';

    return `
        <tr>
            <td><span class="text-muted">#${txn.transaction_id}</span></td>
            <td><strong>${txn.transaction_date}</strong></td>
            <td><span class="badge-category">${txn.category_name || 'Uncategorized'}</span></td>
            <td>${txn.description || '<em>No description</em>'}</td>
            <td><span class="badge badge-${txn.transaction_type}">${txn.transaction_type}</span></td>
            <td class="${amountClass}"><strong>${amountPrefix}${formatCurrency(txn.amount)}</strong></td>
            <td class="text-right">
                <button class="btn-icon-action" onclick="openEditTransactionModal(${txn.transaction_id})" title="Edit">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn-icon-action danger" onclick="deleteTransaction(${txn.transaction_id})" title="Delete">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `;
}

function resetTransactionFilters() {
    document.getElementById('filter-search').value = '';
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-category').value = '';
    document.getElementById('filter-start-date').value = '';
    document.getElementById('filter-end-date').value = '';
    loadTransactionsTable();
}

async function exportTransactionsCSV() {
    const token = getToken();
    if (!token) return;

    try {
        const response = await fetch('/api/reports/export-csv', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to download CSV');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `saif_expense_report_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('CSV report downloaded successfully!', 'success');
    } catch (err) {
        showToast('Error downloading CSV report', 'error');
    }
}

// ==============================================================
// 3. CATEGORIES MANAGEMENT
// ==============================================================

async function fetchCategories() {
    const res = await apiRequest('/api/categories');
    if (res && res.success) {
        appState.categories = res.data;
        populateCategoryDropdowns();
    }
}

function populateCategoryDropdowns() {
    // 1. Transaction Modal category dropdown
    const txnType = document.getElementById('txn-type').value || 'expense';
    const txnCategorySelect = document.getElementById('txn-category');

    if (txnCategorySelect) {
        const filtered = appState.categories.filter(c => c.category_type === txnType);
        txnCategorySelect.innerHTML = '<option value="">Select Category</option>' +
            filtered.map(c => `<option value="${c.category_id}">${c.category_name}</option>`).join('');
    }

    // 2. Filter Category dropdown in transactions view
    const filterCatSelect = document.getElementById('filter-category');
    if (filterCatSelect) {
        filterCatSelect.innerHTML = '<option value="">All Categories</option>' +
            appState.categories.map(c => `<option value="${c.category_id}">${c.category_name} (${c.category_type})</option>`).join('');
    }
}

function renderCategoriesView() {
    const expenseList = document.getElementById('expense-categories-list');
    const incomeList = document.getElementById('income-categories-list');
    const countExpense = document.getElementById('badge-count-expense');
    const countIncome = document.getElementById('badge-count-income');

    const expenseCats = appState.categories.filter(c => c.category_type === 'expense');
    const incomeCats = appState.categories.filter(c => c.category_type === 'income');

    countExpense.innerText = `${expenseCats.length} categories`;
    countIncome.innerText = `${incomeCats.length} categories`;

    expenseList.innerHTML = expenseCats.map(c => `
        <div class="category-chip">
            <span>${c.category_name}</span>
            <button class="btn-del-cat" onclick="deleteCategory(${c.category_id}, '${c.category_name}')" title="Delete Category">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
    `).join('') || '<p class="text-muted">No expense categories yet.</p>';

    incomeList.innerHTML = incomeCats.map(c => `
        <div class="category-chip">
            <span>${c.category_name}</span>
            <button class="btn-del-cat" onclick="deleteCategory(${c.category_id}, '${c.category_name}')" title="Delete Category">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
    `).join('') || '<p class="text-muted">No income categories yet.</p>';
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    const name = document.getElementById('cat-name').value;
    const type = document.getElementById('cat-type').value;

    const res = await apiRequest('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ category_name: name, category_type: type })
    });

    if (res && res.success) {
        showToast('Category created successfully!', 'success');
        closeCategoryModal();
        await fetchCategories();
        renderCategoriesView();
    } else {
        showToast(res ? res.message : 'Failed to create category', 'error');
    }
}

async function deleteCategory(id, name) {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) return;

    const res = await apiRequest(`/api/categories/${id}`, { method: 'DELETE' });
    if (res && res.success) {
        showToast('Category deleted successfully!', 'success');
        await fetchCategories();
        renderCategoriesView();
    } else {
        showToast(res ? res.message : 'Cannot delete category', 'error');
    }
}

// ==============================================================
// 4. BUDGETS MANAGEMENT
// ==============================================================

async function loadBudgetsView() {
    const { selectedMonth, selectedYear } = appState;
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    document.getElementById('budget-view-period-title').innerText = `${monthNames[selectedMonth]} ${selectedYear}`;

    // Load status for current selected period
    const res = await apiRequest(`/api/budgets/status?month=${selectedMonth}&year=${selectedYear}`);
    if (res && res.success) {
        const b = res.data;
        document.getElementById('budget-view-limit').innerText = formatCurrency(b.monthly_limit);
        document.getElementById('budget-view-spent').innerText = formatCurrency(b.total_spent);
        document.getElementById('budget-view-remaining').innerText = formatCurrency(b.remaining_budget);
        document.getElementById('budget-view-pct').innerText = `${b.percentage_used}% of budget spent`;

        const fillEl = document.getElementById('budget-view-fill');
        const pill = document.getElementById('budget-status-pill');

        fillEl.style.width = `${Math.min(b.percentage_used, 100)}%`;
        fillEl.className = 'progress-bar-fill';

        if (b.monthly_limit === 0) {
            pill.className = 'status-indicator text-muted';
            pill.innerText = 'No Budget Set';
        } else if (b.is_over_budget) {
            fillEl.classList.add('danger');
            pill.className = 'status-indicator text-expense';
            pill.innerText = 'Over Budget!';
        } else if (b.is_near_limit) {
            fillEl.classList.add('warning');
            pill.className = 'status-indicator';
            pill.style.color = '#d97706';
            pill.innerText = 'Near Limit (80%+)';
        } else {
            pill.className = 'status-indicator text-income';
            pill.innerText = 'On Track';
        }
    }

    // Load full budget history list
    const historyRes = await apiRequest('/api/budgets');
    const tbody = document.getElementById('budgets-history-tbody');
    if (historyRes && historyRes.success && historyRes.data.length > 0) {
        tbody.innerHTML = historyRes.data.map(b => `
            <tr>
                <td><strong>${monthNames[b.month]} ${b.year}</strong></td>
                <td><span class="text-primary font-weight-bold">${formatCurrency(b.monthly_limit)}</span></td>
                <td>
                    <button class="btn-icon-action danger" onclick="deleteBudget(${b.budget_id})" title="Delete Budget">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } else {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted">No budget history records.</td></tr>';
    }
}

async function handleBudgetSubmit(e) {
    e.preventDefault();
    const month = document.getElementById('budget-month').value;
    const year = document.getElementById('budget-year').value;
    const limit = document.getElementById('budget-limit').value;

    const res = await apiRequest('/api/budgets', {
        method: 'POST',
        body: JSON.stringify({ monthly_limit: limit, month, year })
    });

    if (res && res.success) {
        showToast(res.message, 'success');
        closeBudgetModal();
        await loadDashboard();
        await loadBudgetsView();
    } else {
        showToast(res ? res.message : 'Failed to save budget', 'error');
    }
}

async function deleteBudget(id) {
    if (!confirm('Are you sure you want to delete this budget record?')) return;
    const res = await apiRequest(`/api/budgets/${id}`, { method: 'DELETE' });
    if (res && res.success) {
        showToast('Budget deleted successfully', 'success');
        loadBudgetsView();
        loadDashboard();
    }
}

// ==============================================================
// 5. SPEND REPORTS VIEW
// ==============================================================

async function loadReportsView() {
    const { selectedMonth, selectedYear } = appState;

    // 1. Financial Inflow/Outflow Summary
    const summaryRes = await apiRequest(`/api/reports/summary?month=${selectedMonth}&year=${selectedYear}`);
    if (summaryRes && summaryRes.success) {
        const s = summaryRes.data;
        document.getElementById('rep-income').innerText = formatCurrency(s.total_income);
        document.getElementById('rep-expense').innerText = formatCurrency(s.total_expense);
        document.getElementById('rep-net').innerText = formatCurrency(s.net_balance);
        document.getElementById('rep-rate').innerText = `${s.savings_rate}%`;
    }

    // 2. Category Share Breakdown
    const catRes = await apiRequest(`/api/reports/category-breakdown?month=${selectedMonth}&year=${selectedYear}&type=expense`);
    const tbody = document.getElementById('reports-category-tbody');
    const ctx = document.getElementById('reportCategoryChart');

    if (reportCategoryChartInstance) reportCategoryChartInstance.destroy();

    if (!catRes || !catRes.success || catRes.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">No expense records found for this period.</td></tr>';
        return;
    }

    tbody.innerHTML = catRes.data.map(item => `
        <tr>
            <td><strong>${item.category_name}</strong></td>
            <td>${item.count} items</td>
            <td class="text-expense"><strong>${formatCurrency(item.total_amount)}</strong></td>
            <td>
                <div style="display:flex; align-items:center; gap:8px;">
                    <span>${item.percentage}%</span>
                    <div class="progress-bar-bg" style="width: 70px; height: 6px;">
                        <div class="progress-bar-fill" style="width: ${item.percentage}%;"></div>
                    </div>
                </div>
            </td>
        </tr>
    `).join('');

    // Render visual pie chart
    const labels = catRes.data.map(d => d.category_name);
    const dataValues = catRes.data.map(d => d.total_amount);
    const bgColors = ['#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#f97316', '#64748b'];

    reportCategoryChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: bgColors.slice(0, labels.length)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } }
            }
        }
    });
}

// ==============================================================
// 6. TRANSACTION MODALS & ACTIONS
// ==============================================================

function openTransactionModal() {
    document.getElementById('txn-edit-id').value = '';
    document.getElementById('modal-txn-title').innerHTML = '<i class="fa-solid fa-receipt"></i> Add Transaction';
    document.getElementById('btn-save-txn').innerText = 'Save Transaction';
    document.getElementById('txn-amount').value = '';
    document.getElementById('txn-description').value = '';
    document.getElementById('txn-date').value = new Date().toISOString().slice(0, 10);
    setTransactionType('expense');

    document.getElementById('modal-transaction').classList.remove('d-none');
}

function setTransactionType(type) {
    document.getElementById('txn-type').value = type;
    const btnExpense = document.getElementById('type-btn-expense');
    const btnIncome = document.getElementById('type-btn-income');

    if (type === 'income') {
        btnIncome.className = 'btn-type active-income';
        btnExpense.className = 'btn-type';
    } else {
        btnExpense.className = 'btn-type active-expense';
        btnIncome.className = 'btn-type';
    }

    populateCategoryDropdowns();
}

async function openEditTransactionModal(id) {
    const res = await apiRequest(`/api/transactions/${id}`);
    if (!res || !res.success) {
        showToast('Could not load transaction details', 'error');
        return;
    }

    const txn = res.data;
    document.getElementById('txn-edit-id').value = txn.transaction_id;
    document.getElementById('modal-txn-title').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Transaction';
    document.getElementById('btn-save-txn').innerText = 'Update Transaction';

    setTransactionType(txn.transaction_type);
    document.getElementById('txn-amount').value = txn.amount;
    document.getElementById('txn-date').value = txn.transaction_date;
    document.getElementById('txn-description').value = txn.description || '';
    document.getElementById('txn-category').value = txn.category_id;

    document.getElementById('modal-transaction').classList.remove('d-none');
}

function closeTransactionModal() {
    document.getElementById('modal-transaction').classList.add('d-none');
}

async function handleTransactionSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('txn-edit-id').value;
    const amount = document.getElementById('txn-amount').value;
    const transaction_type = document.getElementById('txn-type').value;
    const category_id = document.getElementById('txn-category').value;
    const description = document.getElementById('txn-description').value;
    const transaction_date = document.getElementById('txn-date').value;

    const payload = {
        amount,
        transaction_type,
        category_id,
        description,
        transaction_date
    };

    let res;
    if (editId) {
        res = await apiRequest(`/api/transactions/${editId}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
    } else {
        res = await apiRequest('/api/transactions', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    if (res && res.success) {
        showToast(editId ? 'Transaction updated successfully!' : 'Transaction saved successfully!', 'success');
        closeTransactionModal();
        refreshCurrentView();
    } else {
        showToast(res ? res.message : 'Error saving transaction', 'error');
    }
}

async function deleteTransaction(id) {
    if (!confirm('Are you sure you want to delete this transaction record?')) return;

    const res = await apiRequest(`/api/transactions/${id}`, { method: 'DELETE' });
    if (res && res.success) {
        showToast('Transaction removed successfully!', 'success');
        refreshCurrentView();
    } else {
        showToast(res ? res.message : 'Failed to delete transaction', 'error');
    }
}

// Category Modal
function openCategoryModal() {
    document.getElementById('cat-name').value = '';
    document.getElementById('modal-category').classList.remove('d-none');
}

function closeCategoryModal() {
    document.getElementById('modal-category').classList.add('d-none');
}

// Budget Modal
function openBudgetModal() {
    document.getElementById('budget-limit').value = '';
    document.getElementById('modal-budget').classList.remove('d-none');
}

function closeBudgetModal() {
    document.getElementById('modal-budget').classList.add('d-none');
}
