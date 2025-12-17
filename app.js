// Yakstra - Income & Expense Tracker with Multi-Currency Support
// Version 2.0.0

// ============= Data Model =============
class Transaction {
    constructor(id, title, amount, category, date, paymentMethod, description, type = 'expense', currency = 'USD') {
        this.id = id || Date.now().toString();
        this.title = title;
        this.amount = parseFloat(amount);
        this.category = category;
        this.date = date;
        this.paymentMethod = paymentMethod;
        this.description = description;
        this.type = type; // 'income' or 'expense'
        this.currency = currency;
    }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            amount: this.amount,
            category: this.category,
            date: this.date,
            paymentMethod: this.paymentMethod,
            description: this.description,
            type: this.type,
            currency: this.currency
        };
    }

    static fromJSON(json) {
        return new Transaction(
            json.id,
            json.title,
            json.amount,
            json.category,
            json.date,
            json.paymentMethod,
            json.description,
            json.type || 'expense',
            json.currency || 'USD'
        );
    }
}

// For backward compatibility
const Expense = Transaction;

// ============= Storage Service =============
class StorageService {
    static STORAGE_KEY = 'yakstra_transactions';
    static CURRENCY_KEY = 'yakstra_currency';

    static saveTransactions(transactions) {
        try {
            const data = transactions.map(t => t.toJSON());
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving transactions:', error);
            return false;
        }
    }

    static loadTransactions() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (!data) return [];
            const parsed = JSON.parse(data);
            return parsed.map(t => Transaction.fromJSON(t));
        } catch (error) {
            console.error('Error loading transactions:', error);
            return [];
        }
    }

    static saveCurrency(currency) {
        try {
            localStorage.setItem(this.CURRENCY_KEY, currency);
            return true;
        } catch (error) {
            console.error('Error saving currency:', error);
            return false;
        }
    }

    static loadCurrency() {
        try {
            return localStorage.getItem(this.CURRENCY_KEY) || 'USD';
        } catch (error) {
            console.error('Error loading currency:', error);
            return 'USD';
        }
    }

    static clearAll() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            return true;
        } catch (error) {
            console.error('Error clearing transactions:', error);
            return false;
        }
    }
}

// ============= Import/Export Service =============
class ImportExportService {
    static exportToJSON(transactions) {
        const data = transactions.map(t => t.toJSON());
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        this.downloadFile(blob, `yakstra_transactions_${this.getDateString()}.json`);
    }

    static exportToCSV(transactions) {
        const headers = ['ID', 'Type', 'Title', 'Amount', 'Currency', 'Category', 'Date', 'Payment Method', 'Description'];
        const rows = transactions.map(t => [
            t.id,
            t.type,
            t.title,
            t.amount,
            t.currency,
            t.category,
            t.date,
            t.paymentMethod,
            t.description || ''
        ]);

        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(cell => `"${cell}"`).join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        this.downloadFile(blob, `yakstra_transactions_${this.getDateString()}.csv`);
    }

    static async importFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    let transactions = [];

                    if (file.name.endsWith('.json')) {
                        transactions = this.parseJSON(content);
                    } else if (file.name.endsWith('.csv')) {
                        transactions = this.parseCSV(content);
                    } else {
                        throw new Error('Unsupported file format');
                    }

                    resolve(transactions);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    static parseJSON(content) {
        const data = JSON.parse(content);
        if (!Array.isArray(data)) {
            throw new Error('Invalid JSON format');
        }
        return data.map(item => Transaction.fromJSON(item));
    }

    static parseCSV(content) {
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSV file is empty');
        }

        const transactions = [];
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length >= 9) {
                transactions.push(new Transaction(
                    values[0],
                    values[2],
                    values[3],
                    values[5],
                    values[6],
                    values[7],
                    values[8],
                    values[1] || 'expense',
                    values[4] || 'USD'
                ));
            }
        }

        return transactions;
    }

    static parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());

        return values;
    }

    static downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    static getDateString() {
        return new Date().toISOString().split('T')[0];
    }
}

// ============= Email Service =============
class EmailService {
    static shareViaEmail(subject, body) {
        const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
    }

    static generateMonthlyReport(transactions, currency) {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const monthTransactions = transactions.filter(t => {
            const date = new Date(t.date);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });

        const income = monthTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const expenses = monthTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const balance = income - expenses;

        const formatter = CurrencyService.getFormatter(currency);

        let body = `Yakstra Income & Expense Tracker - ${monthName} Report\n\n`;
        body += `MONTHLY SUMMARY\n`;
        body += `===============================\n`;
        body += `Total Income:    ${formatter.format(income)}\n`;
        body += `Total Expenses:  ${formatter.format(expenses)}\n`;
        body += `Balance:         ${formatter.format(balance)}\n\n`;

        body += `INCOME DETAILS (${monthTransactions.filter(t => t.type === 'income').length} transactions)\n`;
        body += `===============================\n`;
        const incomeItems = monthTransactions.filter(t => t.type === 'income');
        if (incomeItems.length > 0) {
            incomeItems.forEach(t => {
                body += `${t.date} - ${t.title}: ${formatter.format(t.amount)}\n`;
            });
        } else {
            body += `No income recorded\n`;
        }

        body += `\nEXPENSE DETAILS (${monthTransactions.filter(t => t.type === 'expense').length} transactions)\n`;
        body += `===============================\n`;
        const expenseItems = monthTransactions.filter(t => t.type === 'expense');
        if (expenseItems.length > 0) {
            expenseItems.forEach(t => {
                body += `${t.date} - ${t.title} (${t.category}): ${formatter.format(t.amount)}\n`;
            });
        } else {
            body += `No expenses recorded\n`;
        }

        body += `\n===============================\n`;
        body += `Generated by Yakstra - Multi-Currency Income & Expense Tracker`;

        return { subject: `Monthly Financial Report - ${monthName}`, body };
    }
}

// ============= Currency Service =============
class CurrencyService {
    static CURRENCIES = {
        USD: { symbol: '$', name: 'US Dollar', code: 'USD' },
        CAD: { symbol: 'CA$', name: 'Canadian Dollar', code: 'CAD' },
        EUR: { symbol: '€', name: 'Euro', code: 'EUR' },
        GBP: { symbol: '£', name: 'British Pound', code: 'GBP' },
        INR: { symbol: '₹', name: 'Indian Rupee', code: 'INR' },
        JPY: { symbol: '¥', name: 'Japanese Yen', code: 'JPY' },
        AUD: { symbol: 'A$', name: 'Australian Dollar', code: 'AUD' },
        CNY: { symbol: '¥', name: 'Chinese Yuan', code: 'CNY' },
        KWD: { symbol: 'KD', name: 'Kuwaiti Dinar', code: 'KWD' },
        BHD: { symbol: 'BD', name: 'Bahraini Dinar', code: 'BHD' },
        AED: { symbol: 'AED', name: 'UAE Dirham', code: 'AED' },
        SAR: { symbol: 'SAR', name: 'Saudi Riyal', code: 'SAR' },
        CHF: { symbol: 'CHF', name: 'Swiss Franc', code: 'CHF' },
        SGD: { symbol: 'S$', name: 'Singapore Dollar', code: 'SGD' },
        MXN: { symbol: 'MX$', name: 'Mexican Peso', code: 'MXN' },
        BRL: { symbol: 'R$', name: 'Brazilian Real', code: 'BRL' }
    };

    static getFormatter(currencyCode) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currencyCode
        });
    }

    static getAllCurrencies() {
        return Object.entries(this.CURRENCIES).map(([code, info]) => ({
            code,
            ...info
        }));
    }
}

// ============= Categories =============
const EXPENSE_CATEGORIES = [
    'Food & Dining', 'Transportation', 'Shopping', 'Bills & Utilities',
    'Healthcare', 'Entertainment', 'Travel', 'Education', 'Others'
];

const INCOME_CATEGORIES = [
    'Salary', 'Freelance', 'Business', 'Investments', 'Rental',
    'Gifts', 'Refunds', 'Others'
];

// ============= App Controller =============
class YakstraApp {
    constructor() {
        this.transactions = [];
        this.currentTransaction = null;
        this.currency = 'USD';
        this.filters = {
            category: '',
            month: '',
            type: ''
        };

        this.init();
    }

    init() {
        this.loadTransactions();
        this.loadCurrency();
        this.setupEventListeners();
        this.setupTheme();
        this.populateCurrencySelectors();
        this.updateUI();
        this.setDefaultDate();
    }

    loadTransactions() {
        this.transactions = StorageService.loadTransactions();
    }

    loadCurrency() {
        this.currency = StorageService.loadCurrency();
    }

    saveTransactions() {
        StorageService.saveTransactions(this.transactions);
    }

    saveCurrency() {
        StorageService.saveCurrency(this.currency);
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.closest('.tab').dataset.tab));
        });

        // Add transaction buttons
        document.getElementById('addExpenseBtn').addEventListener('click', () => this.openModal('expense'));
        document.getElementById('addIncomeBtn').addEventListener('click', () => this.openModal('income'));

        // Modal controls
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('transactionForm').addEventListener('submit', (e) => this.handleSubmit(e));

        // Transaction type toggle
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.toggleTransactionType(e));
        });

        // Currency selectors
        document.getElementById('currencySelector').addEventListener('change', (e) => {
            this.currency = e.target.value;
            this.saveCurrency();
            this.updateUI();
        });

        document.getElementById('currencySelectorSettings')?.addEventListener('change', (e) => {
            this.currency = e.target.value;
            document.getElementById('currencySelector').value = this.currency;
            this.saveCurrency();
            this.updateUI();
        });

        // Email report
        document.getElementById('emailReportBtn').addEventListener('click', () => {
            this.sendMonthlyReport();
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        // Filters
        document.getElementById('typeFilter').addEventListener('change', (e) => {
            this.filters.type = e.target.value;
            this.renderTransactions();
        });

        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.renderTransactions();
        });

        document.getElementById('monthFilter').addEventListener('change', (e) => {
            this.filters.month = e.target.value;
            this.renderTransactions();
        });

        // Import/Export
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile').addEventListener('change', (e) => {
            this.handleImport(e.target.files[0]);
        });

        document.getElementById('exportJsonBtn').addEventListener('click', () => {
            ImportExportService.exportToJSON(this.transactions);
        });

        document.getElementById('exportCsvBtn').addEventListener('click', () => {
            ImportExportService.exportToCSV(this.transactions);
        });

        document.getElementById('clearDataBtn').addEventListener('click', () => {
            this.clearAllData();
        });

        // Close modal on outside click
        document.getElementById('transactionModal').addEventListener('click', (e) => {
            if (e.target.id === 'transactionModal') {
                this.closeModal();
            }
        });

        this.populateCategoryFilter();
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('yakstra_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('yakstra_theme', next);
        this.updateThemeIcon(next);
    }

    updateThemeIcon(theme) {
        const icon = document.querySelector('.theme-icon');
        icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabName);
        });

        if (tabName === 'statistics') {
            this.renderStatistics();
        }
    }

    toggleTransactionType(e) {
        e.preventDefault();
        const type = e.currentTarget.dataset.type;
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });
        document.getElementById('transactionType').value = type;
        this.updateCategories(type);
    }

    updateCategories(type) {
        const select = document.getElementById('transactionCategory');
        select.innerHTML = '<option value="">Select a category</option>';

        const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = this.getCategoryIcon(cat, type) + ' ' + cat;
            select.appendChild(option);
        });
    }

    openModal(type = 'expense', transaction = null) {
        this.currentTransaction = transaction;
        const modal = document.getElementById('transactionModal');
        const form = document.getElementById('transactionForm');

        // Set transaction type
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === (transaction?.type || type));
        });
        document.getElementById('transactionType').value = transaction?.type || type;
        this.updateCategories(transaction?.type || type);

        if (transaction) {
            document.getElementById('modalTitle').textContent = `Edit ${transaction.type === 'income' ? 'Income' : 'Expense'}`;
            document.getElementById('submitBtnText').textContent = 'Update Transaction';
            document.getElementById('transactionTitle').value = transaction.title;
            document.getElementById('transactionAmount').value = transaction.amount;
            document.getElementById('transactionCategory').value = transaction.category;
            document.getElementById('transactionDate').value = transaction.date;
            document.getElementById('paymentMethod').value = transaction.paymentMethod;
            document.getElementById('transactionDescription').value = transaction.description || '';
        } else {
            document.getElementById('modalTitle').textContent = `Add ${type === 'income' ? 'Income' : 'Expense'}`;
            document.getElementById('submitBtnText').textContent = 'Add Transaction';
            form.reset();
            this.setDefaultDate();
            document.getElementById('transactionType').value = type;
        }

        modal.classList.add('active');
    }

    closeModal() {
        document.getElementById('transactionModal').classList.remove('active');
        document.getElementById('transactionForm').reset();
        this.currentTransaction = null;
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('transactionDate').value = today;
    }

    handleSubmit(e) {
        e.preventDefault();

        const transaction = new Transaction(
            this.currentTransaction?.id,
            document.getElementById('transactionTitle').value,
            document.getElementById('transactionAmount').value,
            document.getElementById('transactionCategory').value,
            document.getElementById('transactionDate').value,
            document.getElementById('paymentMethod').value,
            document.getElementById('transactionDescription').value,
            document.getElementById('transactionType').value,
            this.currency
        );

        if (this.currentTransaction) {
            const index = this.transactions.findIndex(t => t.id === this.currentTransaction.id);
            if (index !== -1) {
                this.transactions[index] = transaction;
            }
        } else {
            this.transactions.push(transaction);
        }

        this.saveTransactions();
        this.updateUI();
        this.closeModal();
    }

    deleteTransaction(id) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            this.transactions = this.transactions.filter(t => t.id !== id);
            this.saveTransactions();
            this.updateUI();
        }
    }

    async handleImport(file) {
        if (!file) return;

        try {
            const imported = await ImportExportService.importFromFile(file);

            if (confirm(`Import ${imported.length} transactions? This will add to your existing data.`)) {
                this.transactions = [...this.transactions, ...imported];
                this.saveTransactions();
                this.updateUI();
                alert('Import successful!');
            }

            document.getElementById('importFile').value = '';
        } catch (error) {
            alert('Import failed: ' + error.message);
            console.error('Import error:', error);
        }
    }

    clearAllData() {
        if (confirm('Are you sure you want to delete ALL transactions? This cannot be undone!')) {
            if (confirm('This is your final warning. Delete everything?')) {
                this.transactions = [];
                StorageService.clearAll();
                this.updateUI();
            }
        }
    }

    sendMonthlyReport() {
        const report = EmailService.generateMonthlyReport(this.transactions, this.currency);
        EmailService.shareViaEmail(report.subject, report.body);
    }

    updateUI() {
        this.updateSummary();
        this.renderRecentTransactions();
        this.renderTransactions();
        this.updateCurrencyDisplay();
    }

    updateCurrencyDisplay() {
        document.getElementById('currencySelector').value = this.currency;
        const settingsSelector = document.getElementById('currencySelectorSettings');
        if (settingsSelector) {
            settingsSelector.value = this.currency;
        }
    }

    updateSummary() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const monthTransactions = this.transactions.filter(t => {
            const date = new Date(t.date);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });

        const monthIncome = monthTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const monthExpenses = monthTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const balance = monthIncome - monthExpenses;

        document.getElementById('monthlyIncome').textContent = this.formatCurrency(monthIncome);
        document.getElementById('monthlyExpenses').textContent = this.formatCurrency(monthExpenses);
        document.getElementById('monthlyBalance').textContent = this.formatCurrency(balance);
        document.getElementById('monthlyBalance').style.color = balance >= 0 ? 'var(--success)' : 'var(--danger)';

        ['currentMonth1', 'currentMonth2', 'currentMonth3'].forEach(id => {
            const elem = document.getElementById(id);
            if (elem) elem.textContent = monthName;
        });
    }

    renderRecentTransactions() {
        const container = document.getElementById('recentTransactions');
        const recent = this.transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        if (recent.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <p>No transactions yet. Click the buttons to add income or expenses!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = recent.map(t => this.renderTransactionCard(t)).join('');
        this.attachTransactionEventListeners();
    }

    renderTransactions() {
        const container = document.getElementById('allTransactions');
        let filtered = [...this.transactions];

        if (this.filters.type) {
            filtered = filtered.filter(t => t.type === this.filters.type);
        }

        if (this.filters.category) {
            filtered = filtered.filter(t => t.category === this.filters.category);
        }

        if (this.filters.month) {
            const [year, month] = this.filters.month.split('-');
            filtered = filtered.filter(t => {
                const date = new Date(t.date);
                return date.getFullYear() === parseInt(year) &&
                    (date.getMonth() + 1) === parseInt(month);
            });
        }

        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💼</div>
                    <p>No transactions match your filters</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(t => this.renderTransactionCard(t)).join('');
        this.attachTransactionEventListeners();
    }

    renderTransactionCard(transaction) {
        const icon = this.getCategoryIcon(transaction.category, transaction.type);
        const formattedDate = new Date(transaction.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        const typeClass = transaction.type === 'income' ? 'transaction-income' : 'transaction-expense';
        const typeLabel = transaction.type === 'income' ? '💵 Income' : '💳 Expense';

        return `
            <div class="transaction-item ${typeClass}" data-id="${transaction.id}">
                <div class="transaction-info">
                    <div class="transaction-icon">${icon}</div>
                    <div class="transaction-details">
                        <div class="transaction-title">${transaction.title}</div>
                        <div class="transaction-meta">
                            <span>${typeLabel}</span>
                            <span>📅 ${formattedDate}</span>
                            <span>🏷️ ${transaction.category}</span>
                        </div>
                    </div>
                </div>
                <div class="transaction-amount-section">
                    <div class="transaction-amount ${transaction.type}">${this.formatCurrency(transaction.amount)}</div>
                    <div class="transaction-actions">
                        <button class="transaction-action-btn edit-btn" data-id="${transaction.id}">Edit</button>
                        <button class="transaction-action-btn delete delete-btn" data-id="${transaction.id}">Delete</button>
                    </div>
                </div>
            </div>
        `;
    }

    attachTransactionEventListeners() {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.target.dataset.id;
                const transaction = this.transactions.find(t => t.id === id);
                if (transaction) this.openModal(transaction.type, transaction);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.target.dataset.id;
                this.deleteTransaction(id);
            });
        });
    }

    renderStatistics() {
        this.renderIncomeExpenseChart();
        this.renderCategoryChart();
        this.renderTopCategories();
    }

    renderIncomeExpenseChart() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthTransactions = this.transactions.filter(t => {
            const date = new Date(t.date);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });

        const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expenses = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

        const canvas = document.getElementById('incomeExpenseChart');
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = 300;

        const data = { Income: income, Expenses: expenses };
        const colors = { Income: '#10B981', Expenses: '#EF4444' };

        this.drawPieChart(ctx, data, colors, canvas.width, canvas.height);

        const legend = document.getElementById('incomeExpenseLegend');
        legend.innerHTML = `
            <div class="legend-item">
                <div class="legend-color" style="background: #10B981"></div>
                <span>Income: ${this.formatCurrency(income)}</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: #EF4444"></div>
                <span>Expenses: ${this.formatCurrency(expenses)}</span>
            </div>
        `;
    }

    renderCategoryChart() {
        const expenses = this.transactions.filter(t => t.type === 'expense');
        const categoryTotals = {};

        expenses.forEach(t => {
            if (!categoryTotals[t.category]) {
                categoryTotals[t.category] = 0;
            }
            categoryTotals[t.category] += t.amount;
        });

        const canvas = document.getElementById('categoryChart');
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = 300;

        const colors = this.getCategoryColors();
        this.drawPieChart(ctx, categoryTotals, colors, canvas.width, canvas.height);

        const legend = document.getElementById('categoryLegend');
        const total = Object.values(categoryTotals).reduce((s, v) => s + v, 0);

        let legendHTML = '';
        Object.entries(categoryTotals).forEach(([category, amount]) => {
            const percentage = total > 0 ? ((amount / total) * 100).toFixed(1) : 0;
            legendHTML += `
                <div class="legend-item">
                    <div class="legend-color" style="background: ${colors[category] || '#999'}"></div>
                    <span>${category}: ${this.formatCurrency(amount)} (${percentage}%)</span>
                </div>
            `;
        });
        legend.innerHTML = legendHTML || '<p>No expense data available</p>';
    }

    drawPieChart(ctx, data, colors, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 20;

        const total = Object.values(data).reduce((sum, val) => sum + val, 0);
        if (total === 0) {
            ctx.fillStyle = '#999';
            ctx.font = '16px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('No data available', centerX, centerY);
            return;
        }

        let currentAngle = -Math.PI / 2;

        Object.entries(data).forEach(([key, amount]) => {
            const sliceAngle = (amount / total) * 2 * Math.PI;

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.lineTo(centerX, centerY);
            ctx.fillStyle = colors[key] || '#999';
            ctx.fill();

            currentAngle += sliceAngle;
        });
    }

    renderTopCategories() {
        const expenses = this.transactions.filter(t => t.type === 'expense');
        const categoryTotals = {};

        expenses.forEach(t => {
            if (!categoryTotals[t.category]) {
                categoryTotals[t.category] = 0;
            }
            categoryTotals[t.category] += t.amount;
        });

        const sorted = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        const container = document.getElementById('topCategories');

        if (sorted.length === 0) {
            container.innerHTML = '<p>No expense data available</p>';
            return;
        }

        container.innerHTML = sorted.map(([category, amount]) => `
            <div class="top-item">
                <span class="top-item-label">${this.getCategoryIcon(category, 'expense')} ${category}</span>
                <span class="top-item-value">${this.formatCurrency(amount)}</span>
            </div>
        `).join('');
    }

    populateCurrencySelectors() {
        const currencies = CurrencyService.getAllCurrencies();

        [document.getElementById('currencySelector'), document.getElementById('currencySelectorSettings')].forEach(select => {
            if (!select) return;

            select.innerHTML = '';
            currencies.forEach(curr => {
                const option = document.createElement('option');
                option.value = curr.code;
                option.textContent = `${curr.symbol} ${curr.code} - ${curr.name}`;
                select.appendChild(option);
            });

            select.value = this.currency;
        });
    }

    populateCategoryFilter() {
        const select = document.getElementById('categoryFilter');
        const allCategories = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])].sort();

        allCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            select.appendChild(option);
        });
    }

    getCategoryIcon(category, type) {
        const expenseIcons = {
            'Food & Dining': '🍔',
            'Transportation': '🚗',
            'Shopping': '🛍️',
            'Bills & Utilities': '💡',
            'Healthcare': '🏥',
            'Entertainment': '🎬',
            'Travel': '✈️',
            'Education': '📚',
            'Others': '📦'
        };

        const incomeIcons = {
            'Salary': '💼',
            'Freelance': '💻',
            'Business': '🏢',
            'Investments': '📈',
            'Rental': '🏠',
            'Gifts': '🎁',
            'Refunds': '💰',
            'Others': '💵'
        };

        const icons = type === 'income' ? incomeIcons : expenseIcons;
        return icons[category] || '📦';
    }

    getCategoryColors() {
        return {
            'Food & Dining': '#EF4444',
            'Transportation': '#3B82F6',
            'Shopping': '#8B5CF6',
            'Bills & Utilities': '#F59E0B',
            'Healthcare': '#EC4899',
            'Entertainment': '#10B981',
            'Travel': '#06B6D4',
            'Education': '#6366F1',
            'Others': '#6B7280'
        };
    }

    formatCurrency(amount) {
        return CurrencyService.getFormatter(this.currency).format(amount);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.yakstraApp = new YakstraApp();
});
