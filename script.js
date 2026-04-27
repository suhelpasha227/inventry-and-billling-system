class InventoryApp {
    constructor() {
        this.products = JSON.parse(localStorage.getItem('inventory_products')) || [];
        this.bills = JSON.parse(localStorage.getItem('inventory_bills')) || [];
        this.currentBill = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateDashboard();
        this.switchTab('dashboard');
        this.loadSampleData();
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.currentTarget.dataset.tab));
        });

        // Product Modal
        document.getElementById('addProductBtn').addEventListener('click', () => this.openProductModal());
        document.getElementById('productForm').addEventListener('submit', (e) => this.saveProduct(e));
        document.querySelector('.close-btn').addEventListener('click', () => this.closeProductModal());

        // Inventory
        document.getElementById('searchProduct').addEventListener('input', () => this.renderProducts());
        document.getElementById('filterCategory').addEventListener('change', () => this.renderProducts());

        // Billing
        document.getElementById('addItemBtn').addEventListener('click', () => this.addItemToBill());
        document.getElementById('saveBillBtn').addEventListener('click', () => this.saveBill());
        document.getElementById('itemQty').addEventListener('input', () => this.calculateBillTotal());

        // Reports
        document.getElementById('filterBtn').addEventListener('click', () => this.renderReports());

        // Global
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
        document.getElementById('clearDataBtn').addEventListener('click', () => this.clearAllData());
        
        // Close modal on outside click
        document.getElementById('productModal').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) this.closeProductModal();
        });
    }

    switchTab(tabName) {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');

        if (tabName === 'inventory') this.renderProducts();
        if (tabName === 'billing') this.updateProductSelect();
        if (tabName === 'reports') this.renderReports();
        if (tabName === 'dashboard') this.updateDashboard();
    }

    // Products Management
    openProductModal(editProduct = null) {
        const modal = document.getElementById('productModal');
        const title = document.getElementById('modalTitle');
        
        if (editProduct) {
            title.textContent = 'Edit Product';
            document.getElementById('prodName').value = editProduct.name;
            document.getElementById('prodCategory').value = editProduct.category;
            document.getElementById('prodStock').value = editProduct.stock;
            document.getElementById('prodPrice').value = editProduct.price;
        } else {
            title.textContent = 'Add New Product';
            document.getElementById('productForm').reset();
        }
        
        modal.style.display = 'block';
    }

    closeProductModal() {
        document.getElementById('productModal').style.display = 'none';
    }

    saveProduct(e) {
        e.preventDefault();
        const product = {
            id: document.getElementById('prodName').value.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
            name: document.getElementById('prodName').value,
            category: document.getElementById('prodCategory').value,
            stock: parseInt(document.getElementById('prodStock').value),
            price: parseFloat(document.getElementById('prodPrice').value)
        };

        const existingIndex = this.products.findIndex(p => p.id === product.id);
        if (existingIndex > -1) {
            this.products[existingIndex] = product;
        } else {
            this.products.push(product);
        }

        this.saveData();
        this.renderProducts();
        this.updateDashboard();
        this.closeProductModal();
        this.updateProductSelect();
    }

    renderProducts() {
        const tbody = document.querySelector('#productsTable tbody');
        const searchTerm = document.getElementById('searchProduct').value.toLowerCase();
        const categoryFilter = document.getElementById('filterCategory').value;

        const filteredProducts = this.products.filter(product => 
            product.name.toLowerCase().includes(searchTerm) &&
            (!categoryFilter || product.category === categoryFilter)
        );

        tbody.innerHTML = filteredProducts.map(product => `
            <tr>
                <td>${product.id.slice(-8)}</td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td class="${product.stock < 5 ? 'low-stock' : ''}">
                    ${product.stock}
                </td>
                <td>₹${product.price.toLocaleString()}</td>
                <td>
                    <button onclick="app.openProductModal(${JSON.stringify(product)})" 
                            class="btn btn-secondary" style="padding:8px 12px; font-size:0.9rem;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="app.deleteProduct('${product.id}')" 
                            class="btn btn-danger" style="padding:8px 12px; font-size:0.9rem;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="6" style="text-align:center; padding:40px; color:#666;">No products found</td></tr>';

        this.updateCategoryFilter();
    }

    deleteProduct(id) {
        if (confirm('Delete this product? This cannot be undone.')) {
            this.products = this.products.filter(p => p.id !== id);
            this.saveData();
            this.renderProducts();
            this.updateDashboard();
            this.updateProductSelect();
        }
    }

    updateCategoryFilter() {
        const categories = [...new Set(this.products.map(p => p.category))];
        const select = document.getElementById('filterCategory');
        select.innerHTML = '<option value="">All Categories</option>' + 
            categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }

    // Billing
    updateProductSelect() {
        const select = document.getElementById('productSelect');
        select.innerHTML = '<option value="">Select Product</option>' + 
            this.products.map(p => 
                `<option value="${p.id}" data-price="${p.price}" data-name="${p.name}">${p.name} - ₹${p.price}</option>`
            ).join('');
    }

    addItemToBill() {
        const productSelect = document.getElementById('productSelect');
        const qtyInput = document.getElementById('itemQty');
        const productId = productSelect.value;
        const quantity = parseInt(qtyInput.value);

        if (!productId || !quantity || quantity <= 0) {
            alert('Please select a product and valid quantity');
            return;
        }

        const product = this.products.find(p => p.id === productId);
        if (product.stock < quantity) {
            alert(`Only ${product.stock} items available in stock`);
            return;
        }

        const existingItem = this.currentBill.find(item => item.id === productId);
        if (existingItem) {
            if (existingItem.stock < existingItem.quantity + quantity) {
                alert('Not enough stock available');
                return;
            }
            existingItem.quantity += quantity;
        } else {
            this.currentBill.push({
                id: product.id,
                name: product.name,
                price: product.price,
                quantity,
                stock: product.stock
            });
        }

        this.renderBillItems();
        this.calculateBillTotal();
        qtyInput.value = '';
        productSelect.value = '';
    }

    renderBillItems() {
        const container = document.getElementById('billItems');
        container.innerHTML = this.currentBill.map((item, index) => `
            <div class="bill-item">
                <div>
                    <strong>${item.name}</strong>
                    <div style="font-size:0.9rem; color:#666;">
                        ₹${item.price} × ${item.quantity} = ₹${(item.price * item.quantity).toLocaleString()}
                    </div>
                </div>
                <button onclick="app.removeBillItem(${index})" class="btn btn-danger" style="padding:8px 12px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('') || '<div style="text-align:center; padding:40px; color:#666;">No items added</div>';
    }

    removeBillItem(index) {
        this.currentBill.splice(index, 1);
        this.renderBillItems();
        this.calculateBillTotal();
    }

    calculateBillTotal() {
        const subtotal = this.currentBill.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const gst = subtotal * 0.18;
        const total = subtotal + gst;

        document.getElementById('subtotal').textContent = `₹${subtotal.toLocaleString()}`;
        document.getElementById('gst').textContent = `₹${gst.toLocaleString()}`;
        document.getElementById('grandTotal').textContent = `₹${total.toLocaleString()}`;
    }

    saveBill() {
        if (this.currentBill.length === 0) {
            alert('Please add items to bill first');
            return;
        }

        const customerName = document.getElementById('customerName').value.trim() || 'Customer';
        const customerPhone = document.getElementById('customerPhone').value.trim();
        const subtotal = this.currentBill.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const gst = subtotal * 0.18;
        const total = subtotal + gst;

        const bill = {
            id: 'BILL-' + Date.now(),
            date: new Date().toISOString(),
            customerName,
            customerPhone,
            items: [...this.currentBill],
            subtotal,
            gst,
            total,
            billNumber: `INV${String(this.bills.length + 1).padStart(4, '0')}`
        };

        // Update stock
        this.currentBill.forEach(item => {
            const product = this.products.find(p => p.id === item.id);
            product.stock -= item.quantity;
        });

        this.bills.unshift(bill);
        this.currentBill = [];
        
        this.saveData();
        this.updateDashboard();
        this.clearBillForm();

        // Show bill preview
        this.printBill(bill);
        alert('✅ Bill saved successfully!');
    }

    clearBillForm() {
        document.getElementById('customerName').value = '';
        document.getElementById('customerPhone').value = '';
        document.getElementById('billItems').innerHTML = '';
        document.getElementById('subtotal').textContent = '₹0';
        document.getElementById('gst').textContent = '₹0';
        document.getElementById('grandTotal').textContent = '₹0';
    }

    printBill(bill) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Bill #${bill.billNumber}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; max-width: 500px; margin: 0 auto; }
                    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                    .bill-details { margin-bottom: 30px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                    .total-section { background: #f8f9fa; padding: 20px; border-radius: 8px; }
                    .grand-total { font-size: 1.5rem; font-weight: bold; color: #333; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>InventoryPro</h2>
                    <p>Bill #${bill.billNumber} | ${new Date(bill.date).toLocaleDateString()}</p>
                </div>
                <div class="bill-details">
                    <strong>Customer:</strong> ${bill.customerName}<br>
                    ${bill.customerPhone ? `<strong>Phone:</strong> ${bill.customerPhone}` : ''}
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bill.items.map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td>${item.quantity}</td>
                                <td>₹${item.price.toLocaleString()}</td>
                                <td>₹${(item.price * item.quantity).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="total-section">
                    <div style="display:flex; justify-content:space-between;">
                        <span>Subtotal:</span> <span>₹${bill.subtotal.toLocaleString()}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span>GST (18%):</span> <span>₹${bill.gst.toLocaleString()}</span>
                    </div>
                    <div class="grand-total" style="display:flex; justify-content:space-between; margin-top:15px;">
                        <span>Total:</span> <span>₹${bill.total.toLocaleString()}</span>
                    </div>
                </div>
                <div style="text-align:center; margin-top:30px; font-size:0.9rem; color:#666;">
                    Thank you for your business!
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }

    // Dashboard
    updateDashboard() {
        const totalProducts = this.products.length;
        const lowStock = this.products.filter(p => p.stock < 5).length;
        const totalSales = this.bills.reduce((sum, bill) => sum + bill.total, 0);
        const totalBills = this.bills.length;

        document.getElementById('totalProducts').textContent = totalProducts;
        document.getElementById('lowStock').textContent = lowStock;
        document.getElementById('totalSales').textContent = `₹${totalSales.toLocaleString()}`;
        document.getElementById('totalBills').textContent = totalBills;

        this.renderRecentSales();
        this.renderLowStockAlert();
    }

    renderRecentSales() {
        const recent = this.bills.slice(0, 5);
        const container = document.getElementById('recentSales');
        container.innerHTML = recent.length ? recent.map(bill => `
            <div class="list-item">
                <div>
                    <strong>${bill.customerName}</strong>
                    <div style="font-size:0.9rem; color:#666;">${new Date(bill.date).toLocaleDateString()}</div>
                </div>
                <div>₹${bill.total.toLocaleString()}</div>
            </div>
        `).join('') : '<div style="text-align:center; padding:40px; color:#666;">No sales yet</div>';
    }

    renderLowStockAlert() {
        const lowStockItems = this.products.filter(p => p.stock < 5);
        const container = document.getElementById('lowStockAlert');
        container.innerHTML = lowStockItems.length ? lowStockItems.map(item => `
            <div class="list-item">
                <div>
                    <strong style="color:#ff6b6b;">${item.name}</strong>
                    <div style="font-size:0.9rem; color:#666;">${item.stock} left</div>
                </div>
                <div style="color:#ff6b6b;">⚠️</div>
            </div>
        `).join('') : '<div style="text-align:center; padding:40px; color:#28a745;">All stock levels good! ✅</div>';
    }

    // Reports
    renderReports() {
        const fromDate = document.getElementById('fromDate').value;
        const toDate = document.getElementById('toDate').value;
        
        let filteredBills = this.bills;
        if (fromDate && toDate) {
            const start = new Date(fromDate);
            const end = new Date(toDate);
            end.setDate(end.getDate() + 1);
            filteredBills = this.bills.filter(bill => {
                const billDate = new Date(bill.date);
                return billDate >= start && billDate <= end;
            });
        }

        const totalSales = filteredBills.reduce((sum, bill) => sum + bill.total, 0);
        const container = document.getElementById('reportsContent');
        
        container.innerHTML = `
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:25px; margin-bottom:30px;">
                <div class="stat-card" style="text-align:center;">
                    <div class="stat-icon" style="background:linear-gradient(135deg,#43e97b,#38f9d7); margin:0 auto 15px;">
                        <i class="fas fa-file-invoice"></i>
                    </div>
                    <h3>${filteredBills.length}</h3>
                    <p>Bills</p>
                </div>
                <div class="stat-card" style="text-align:center;">
                    <div class="stat-icon" style="background:linear-gradient(135deg,#4facfe,#00f2fe); margin:0 auto 15px;">
                        <i class="fas fa-indian-rupee-sign"></i>
                    </div>
                    <h3>₹${totalSales.toLocaleString()}</h3>
                    <p>Total Sales</p>
                </div>
            </div>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Bill #</th>
                            <th>Customer</th>
                            <th>Date</th>
                            <th>Total</th>
                            <th>Items</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredBills.map(bill => `
                            <tr>
                                <td>${bill.billNumber}</td>
                                <td>${bill.customerName}</td>
                                <td>${new Date(bill.date).toLocaleDateString()}</td>
                                <td>₹${bill.total.toLocaleString()}</td>
                                <td>${bill.items.length}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="5" style="text-align:center; padding:40px;">No data found</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    }

    // Data Management
    saveData() {
        localStorage.setItem('inventory_products', JSON.stringify(this.products));
        localStorage.setItem('inventory_bills', JSON.stringify(this.bills));
    }

    exportData() {
        const data = {
            products: this.products,
            bills: this.bills,
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    clearAllData() {
        if (confirm('⚠️ Delete ALL data? Products and bills will be lost forever!')) {
            localStorage.removeItem('inventory_products');
            localStorage.removeItem('inventory_bills');
            this.products = [];
            this.bills = [];
            this.saveData();
            this.updateDashboard();
            this.renderProducts();
            alert('🗑️ All data cleared!');
        }
    }

    loadSampleData() {
        if (this.products.length === 0) {
            this.products = [
                { id: 'rice-1', name: 'Basmati Rice', category: 'Grains', stock: 50, price: 120 },
                { id: 'oil-1', name: 'Cooking Oil', category: 'Oils', stock: 30, price: 180 },
                { id: 'sugar-1', name: 'Sugar', category: 'Sweeteners', stock: 8, price: 60 }
            ];
            this.saveData();
            this.renderProducts();
        }
    }
}

// Initialize App
const app = new InventoryApp();
window.app = app;