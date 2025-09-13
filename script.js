document.addEventListener('DOMContentLoaded', () => {
            const balanceEl = document.getElementById('balance');
            const incomeEl = document.getElementById('income');
            const expenseEl = document.getElementById('expense');
            const transactionListEl = document.getElementById('transaction-list');
            const form = document.getElementById('transaction-form');
            const textInput = document.getElementById('text');
            const amountInput = document.getElementById('amount');
            const categoryInput = document.getElementById('category');
            const dateInput = document.getElementById('date');
            const searchInput = document.getElementById('search');

            const editModal = document.getElementById('edit-modal');
            const editModalContent = document.getElementById('edit-modal-content');
            const closeModalBtn = document.getElementById('close-modal');
            const cancelEditBtn = document.getElementById('cancel-edit');
            const editForm = document.getElementById('edit-form');
            const editIdInput = document.getElementById('edit-id');
            const editText = document.getElementById('edit-text');
            const editAmount = document.getElementById('edit-amount');
            const editCategory = document.getElementById('edit-category');
            const editDate = document.getElementById('edit-date');

            const categories = {
                income: ['Salary', 'Gifts', 'Investments', 'Freelance', 'Other'],
                expense: ['Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Health', 'Housing', 'Other']
            };

            let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
            let expenseChart;

            const populateCategories = () => {
                const allCategories = [...categories.income, ...categories.expense];
                const uniqueCategories = [...new Set(allCategories)];
                
                const populateSelect = (selectElement) => {
                    selectElement.innerHTML = '<option value="">Select Category</option>';
                    uniqueCategories.forEach(cat => {
                        const option = document.createElement('option');
                        option.value = cat;
                        option.textContent = cat;
                        selectElement.appendChild(option);
                    });
                }
                
                populateSelect(categoryInput);
                populateSelect(editCategory);
            };

            const formatCurrency = (number) => {
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                }).format(number);
            };

            const generateID = () => {
                return Math.floor(Math.random() * 1000000);
            };
            
            const updateSummary = () => {
                const amounts = transactions.map(t => t.amount);
                const total = amounts.reduce((acc, item) => (acc += item), 0);
                const income = amounts.filter(item => item > 0).reduce((acc, item) => (acc += item), 0);
                const expense = amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) * -1;

                balanceEl.textContent = formatCurrency(total);
                incomeEl.textContent = formatCurrency(income);
                expenseEl.textContent = formatCurrency(expense);
            };

            const addTransactionDOM = (transaction) => {
                const sign = transaction.amount < 0 ? '-' : '+';
                const item = document.createElement('li');
                item.classList.add('flex', 'justify-between', 'items-center', 'p-3', 'rounded-lg', 'cursor-pointer', 'transition-colors', 'hover:bg-slate-100');
                item.dataset.id = transaction.id;
                
                const amountColor = transaction.amount < 0 ? 'text-red-500' : 'text-green-500';

                item.innerHTML = `
                    <div class="flex items-center gap-3">
                        <div class="font-bold ${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}">${transaction.amount < 0 ? '▼' : '▲'}</div>
                        <div>
                            <span class="font-semibold block">${transaction.text}</span>
                            <small class="text-slate-500">${new Date(transaction.date).toLocaleDateString()} - ${transaction.category}</small>
                        </div>
                    </div>
                    <span class="font-bold ${amountColor}">${sign}${formatCurrency(Math.abs(transaction.amount))}</span>
                `;
                transactionListEl.appendChild(item);
            };

            const renderTransactions = (transactionsToRender) => {
                transactionListEl.innerHTML = '';
                if(transactionsToRender.length === 0) {
                     transactionListEl.innerHTML = `<p class="text-center text-slate-500 p-4">No transactions yet.</p>`;
                } else {
                    transactionsToRender.forEach(addTransactionDOM);
                }
            };
            
            const updateChart = () => {
                const expenseData = transactions
                    .filter(t => t.amount < 0)
                    .reduce((acc, t) => {
                        acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
                        return acc;
                    }, {});

                const chartLabels = Object.keys(expenseData);
                const chartValues = Object.values(expenseData);

                if (expenseChart) {
                    expenseChart.destroy();
                }

                if (chartLabels.length === 0) {
                    return;
                }

                const ctx = document.getElementById('expense-chart').getContext('2d');
                expenseChart = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: chartLabels,
                        datasets: [{
                            label: 'Expense by Category',
                            data: chartValues,
                            backgroundColor: [
                                '#4f46e5', '#ec4899', '#f97316', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444'
                            ],
                            borderColor: '#fff',
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        let label = context.label || '';
                                        if (label) {
                                            label += ': ';
                                        }
                                        if (context.parsed !== null) {
                                            label += formatCurrency(context.parsed);
                                        }
                                        return label;
                                    }
                                }
                            }
                        }
                    }
                });
            };

            const saveTransactionsToLocalStorage = () => {
                localStorage.setItem('transactions', JSON.stringify(transactions));
            };
            
            const updateUI = () => {
                const searchTerm = searchInput.value.toLowerCase();
                const filteredTransactions = transactions.filter(t =>
                    t.text.toLowerCase().includes(searchTerm) ||
                    t.category.toLowerCase().includes(searchTerm)
                );
                
                filteredTransactions.sort((a,b) => new Date(b.date) - new Date(a.date));

                updateSummary();
                renderTransactions(filteredTransactions);
                updateChart();
                saveTransactionsToLocalStorage();
            };

            const addTransaction = (e) => {
                e.preventDefault();

                if (textInput.value.trim() === '' || amountInput.value.trim() === '' || categoryInput.value === '' || dateInput.value === '') {
                    alert('Please fill in all fields.');
                    return;
                }

                const newTransaction = {
                    id: generateID(),
                    text: textInput.value,
                    amount: +amountInput.value,
                    category: categoryInput.value,
                    date: dateInput.value
                };

                transactions.push(newTransaction);
                updateUI();
                form.reset();
                dateInput.valueAsDate = new Date();
            };
            
            const removeTransaction = (id) => {
                transactions = transactions.filter(t => t.id !== id);
                updateUI();
            };
            
            const openEditModal = (id) => {
                const transaction = transactions.find(t => t.id === id);
                if (!transaction) return;

                editIdInput.value = transaction.id;
                editText.value = transaction.text;
                editAmount.value = transaction.amount;
                editCategory.value = transaction.category;
                editDate.value = transaction.date;

                editModal.classList.remove('modal-hidden');
                editModal.classList.add('modal-visible');
                editModalContent.classList.add('modal-content-enter-active');
            };

            const closeEditModal = () => {
                editModal.classList.remove('modal-visible');
                editModal.classList.add('modal-hidden');
                editModalContent.classList.remove('modal-content-enter-active');
            };
            
            const handleEditSubmit = (e) => {
                e.preventDefault();
                const id = +editIdInput.value;
                transactions = transactions.map(t =>
                    t.id === id
                        ? {
                            ...t,
                            text: editText.value,
                            amount: +editAmount.value,
                            category: editCategory.value,
                            date: editDate.value
                        }
                        : t
                );
                updateUI();
                closeEditModal();
            };
            
            form.addEventListener('submit', addTransaction);
            searchInput.addEventListener('input', updateUI);
            closeModalBtn.addEventListener('click', closeEditModal);
            cancelEditBtn.addEventListener('click', closeEditModal);
            editForm.addEventListener('submit', handleEditSubmit);

            transactionListEl.addEventListener('click', (e) => {
                const item = e.target.closest('li');
                if (item) {
                    const transactionId = +item.dataset.id;
                    openEditModal(transactionId);
                }
            });

            const init = () => {
                populateCategories();
                dateInput.valueAsDate = new Date();
                updateUI();
            };

            init();
        });