// admin.js - WireNest Admin Dashboard Logic

// Determine backend URL dynamically
const hostname = window.location.hostname;
const protocol = window.location.protocol;

// If we are on Vercel, we need to point to the deployed backend URL.
const isProduction = hostname.includes('vercel.app') || hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('192.168.');

const BACKEND_URL = isProduction 
    ? 'https://wirenest-backend.onrender.com' // Replace with actual production backend URL
    : 'http://localhost:8001';

let currentSession = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log("Admin Dashboard Initialized");
    const isAuthenticated = restoreAdminSession();

    // Only load confidential dashboard data if the admin is definitively logged in
    if (isAuthenticated) {
        refreshData();
    }
});

function switchTab(e, tabId) {
    // Update navigation styles
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
    });
    e.currentTarget.classList.add('active');

    // Show correct tab content
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(`tab-${tabId}`).classList.add('active');
}

function showLoader(show) {
    document.getElementById('adminLoader').style.display = show ? 'flex' : 'none';
}

function showNotification(message) {
    const notification = document.getElementById('notification');
    const msgElement = document.getElementById('notificationMessage');

    if (notification && msgElement) {
        msgElement.textContent = message;
        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

// Session Management
async function restoreAdminSession() {
    const isAdminLoggedIn = localStorage.getItem('wirenestAdminLoggedIn') === 'true';
    const email = localStorage.getItem('wirenestAdminEmail');
    const name = localStorage.getItem('wirenestAdminName');
    const avatar = localStorage.getItem('wirenestAdminAvatar');

    if (!isAdminLoggedIn) {
        // Show login overlay
        document.getElementById('adminLoginOverlay').style.display = 'flex';
        document.querySelector('.admin-layout').style.display = 'none';
        document.querySelector('.admin-navbar').style.display = 'none';
        return false;
    }

    // Hide login overlay, show dashboard
    document.getElementById('adminLoginOverlay').style.display = 'none';
    document.querySelector('.admin-layout').style.display = 'flex';
    document.querySelector('.admin-navbar').style.display = 'block';

    // Restoring Admin Profile Identity
    // The user specifically requested to hide the 'superadmin' dynamic name and enforce the 'A' / 'Admin' aesthetic
    document.getElementById('profileMenuName').textContent = 'Admin User';
    document.getElementById('profileMenuEmail').textContent = 'admin@wirenest.com';

    const isValidAvatar = avatar && avatar !== 'null' && avatar !== 'undefined' && avatar.trim() !== '';
    const avatarContainer = document.getElementById('profileAvatar');
    const menuAvatarContainer = document.getElementById('profileMenuAvatar');

    const firstLetter = 'A'; // Hardcoded aesthetic override

    if (isValidAvatar) {
        const safeFallback = `<span class="profile-letter" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:white;font-weight:600;background:var(--primary-color);border-radius:50%;">${firstLetter}</span>`.replace(/'/g, "\\'");
        const imgHtml = `<img src="${avatar}" alt="Admin" referrerpolicy="no-referrer" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.outerHTML = '${safeFallback}'">`;

        avatarContainer.innerHTML = imgHtml;
        if (menuAvatarContainer) {
            menuAvatarContainer.style.display = 'flex';
            menuAvatarContainer.innerHTML = imgHtml;
        }
    } else {
        const letterHtml = `<span class="profile-letter" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:white;font-weight:600;background:var(--primary-color);border-radius:50%;">${firstLetter}</span>`;
        avatarContainer.innerHTML = letterHtml;
        if (menuAvatarContainer) {
            menuAvatarContainer.style.display = 'flex';
            menuAvatarContainer.innerHTML = letterHtml;
        }
    }

    return true;
}

function toggleProfileDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Close profile dropdown when clicking outside
document.addEventListener('click', function (event) {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown && !dropdown.contains(event.target)) {
        dropdown.classList.remove('show');
    }
});

async function handleLogout() {
    try {
        // Destroy the live Supabase session via backend
        await fetch(`${BACKEND_URL}/auth/logout`, { method: 'POST' });
    } catch (err) {
        console.error("Backend logout error:", err);
    }

    // Clear local authentication state
    localStorage.removeItem('wirenestAdminLoggedIn');
    localStorage.removeItem('wirenestAdminEmail');
    localStorage.removeItem('wirenestAdminName');
    localStorage.removeItem('wirenestAdminAvatar');
    window.location.reload();
}

// Authentication Flow
async function handleAdminLogin(event) {
    event.preventDefault();

    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;

    showLoader(true);
    try {
        const response = await fetch(`${BACKEND_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('wirenestAdminLoggedIn', 'true');
            localStorage.setItem('wirenestAdminEmail', data.admin.email);
            localStorage.setItem('wirenestAdminName', data.admin.name);
            localStorage.setItem('wirenestAdminAvatar', data.admin.avatar || '');

            showNotification('Admin login successful!');

            // Reload to restore session
            window.location.reload();
        } else {
            showNotification(data.error || 'Invalid admin credentials');
        }
    } catch (err) {
        console.error("Login failure:", err);
        showNotification('Unable to connect to backend service.');
    } finally {
        showLoader(false);
    }
}

// Data Fetching
async function refreshData() {
    showLoader(true);
    try {
        await Promise.all([
            fetchTableData('users'),
            fetchTableData('categories'),
            fetchTableData('normal_products'),
            fetchTableData('customized_products'),
            fetchTableData('stock'),
            fetchTableData('cart'),
            fetchTableData('orders'),
            fetchTableData('order_details'),
            fetchTableData('order_items')
        ]);
    } catch (error) {
        console.error("Dashboard refresh error:", error);
        showNotification("Failed to fetch dashboard data");
    } finally {
        showLoader(false);
    }
}

async function fetchStats() {
    // For now, we'll populate mock stats until orders endpoint is ready
    document.getElementById('statOrders').textContent = '24';
    document.getElementById('statRevenue').textContent = '$3,450';
}

// Generic Universal API Fetcher
async function fetchTableData(table) {
    try {
        const response = await fetch(`${BACKEND_URL}/admin/data/${table}`);
        const data = await response.json();

        if (data.success) {
            window[`${table}Data`] = data.data; // Store in memory for edits

            if (table === 'users') renderUsersTable(data.data);
            else if (table === 'categories') renderCategoriesTable(data.data);
            else if (table === 'normal_products') renderNormalProductsTable(data.data);
            else if (table === 'customized_products') renderCustomizedProductsTable(data.data);
            else if (table === 'stock') renderStockTable(data.data);
            else if (table === 'cart') renderCartTable(data.data);
            else if (table === 'orders') renderOrdersTable(data.data);
            else if (table === 'order_details') renderOrderDetailsTable(data.data);
            else if (table === 'order_items') renderOrderItemsTable(data.data);

            if (table === 'users') document.getElementById('statUsers').textContent = data.data.length;
            if (table === 'orders') document.getElementById('statOrders').textContent = data.data.length;
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error(`Error fetching ${table}:`, error);
        const tbody = document.getElementById(`${table}TableBody`);
        if (tbody) tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:red;">Error loading ${table}</td></tr>`;
    }
}

function renderUsersTable(data) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';
    if (!data || data.length === 0) return tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No users found</td></tr>`;

    data.forEach(item => {
        const initial = (item.full_name || item.email || 'U').charAt(0).toUpperCase();
        const avatarHtml = (item.avatar_url && item.avatar_url !== 'null')
            ? `<img src="${item.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
            : `<span>${initial}</span>`;

        tbody.innerHTML += `
            <tr>
                <td><div class="table-avatar">${avatarHtml}</div></td>
                <td>${item.full_name || 'Anonymous'}</td>
                <td>${item.email || 'N/A'}</td>
                <td>${new Date(item.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn-sm btn-danger" onclick="deleteRecord('users', '${item.id}')">Delete</button>
                </td>
            </tr>`;
    });
}

function renderCategoriesTable(data) {
    const tbody = document.getElementById('categoriesTableBody');
    tbody.innerHTML = '';
    if (!data || data.length === 0) return tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No categories found</td></tr>`;

    data.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td style="font-weight:600;">${item.name}</td>
                <td style="color:var(--text-secondary);">${item.description || 'N/A'}</td>
                <td>${new Date(item.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn-sm btn-primary" onclick="openCrudModal('categories', '${item.id}')">Edit</button>
                    <button class="btn-sm btn-danger" onclick="deleteRecord('categories', '${item.id}')">Delete</button>
                </td>
            </tr>`;
    });
}

function renderNormalProductsTable(data) {
    const tbody = document.getElementById('normal_productsTableBody');
    tbody.innerHTML = '';
    if (!data || data.length === 0) return tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No products found</td></tr>`;

    data.forEach(item => {
        let imgHtml = `<div style="width:40px;height:40px;background:#eee;border-radius:4px;"></div>`;
        if (item.images && item.images.length > 0) {
            let firstImg = item.images[0];
            if (firstImg && firstImg.includes('/uploads/')) {
                firstImg = `${BACKEND_URL}${firstImg.substring(firstImg.indexOf('/uploads/'))}`;
            } else if (!firstImg.startsWith('http')) {
                firstImg = firstImg.startsWith('images') ? '../' + firstImg : firstImg;
            }
            imgHtml = `<img src="${firstImg}" style="width:40px;height:40px;border-radius:4px;object-fit:cover;">`;
        }
        tbody.innerHTML += `
            <tr>
                <td><div class="table-avatar" style="border-radius:4px;">${imgHtml}</div></td>
                <td style="font-weight:500;">${item.name}</td>
                <td style="color:var(--text-secondary); text-transform:capitalize;">${item.size || 'N/A'}</td>
                <td style="font-weight:600;">₹${item.price}</td>
                <td>
                    <button class="btn-sm btn-primary" onclick="openCrudModal('normal_products', '${item.id}')">Edit</button>
                    <button class="btn-sm btn-danger" onclick="deleteRecord('normal_products', '${item.id}')">Delete</button>
                </td>
            </tr>`;
    });
}

function renderCustomizedProductsTable(data) {
    const tbody = document.getElementById('customized_productsTableBody');
    tbody.innerHTML = '';
    if (!data || data.length === 0) return tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No customized products found</td></tr>`;

    data.forEach(item => {
        let imgHtml = `<div style="width:40px;height:40px;background:#eee;border-radius:4px;"></div>`;
        if (item.images && item.images.length > 0) {
            let firstImg = item.images[0];
            if (firstImg && firstImg.includes('/uploads/')) {
                firstImg = `${BACKEND_URL}${firstImg.substring(firstImg.indexOf('/uploads/'))}`;
            } else if (!firstImg.startsWith('http')) {
                firstImg = firstImg.startsWith('images') ? '../' + firstImg : firstImg;
            }
            imgHtml = `<img src="${firstImg}" style="width:40px;height:40px;border-radius:4px;object-fit:cover;">`;
        }
        let pricePreview = "Dynamic";
        if (item.customization_options && item.customization_options.sizes) {
            pricePreview = `S:₹${item.customization_options.sizes["small/1 roll"] || 0} | M:₹${item.customization_options.sizes["medium/2 roll"] || 0} | L:₹${item.customization_options.sizes["large/3 roll"] || 0}`;
        }

        tbody.innerHTML += `
            <tr>
                <td><div class="table-avatar" style="border-radius:4px;">${imgHtml}</div></td>
                <td style="font-weight:500;">${item.name}</td>
                <td style="font-weight:600; font-size: 13px; color: var(--primary-color);">${pricePreview}</td>
                <td>
                    <button class="btn-sm btn-primary" onclick="openCrudModal('customized_products', '${item.id}')">Edit</button>
                    <button class="btn-sm btn-danger" onclick="deleteRecord('customized_products', '${item.id}')">Delete</button>
                </td>
            </tr>`;
    });
}

function renderStockTable(data) {
    const tbody = document.getElementById('stockTableBody');
    tbody.innerHTML = '';
    if (!data || data.length === 0) return tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No stock data found</td></tr>`;

    data.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td style="font-family:monospace;font-size:12px;">${item.product_id.substring(0, 8)}...</td>
                <td><span style="background:var(--bg-secondary);padding:2px 6px;border-radius:4px;font-size:12px;">${item.product_type}</span></td>
                <td style="font-weight:bold; color:${item.quantity < 10 ? 'red' : 'inherit'}">${item.quantity}</td>
                <td style="font-size:13px;color:var(--text-secondary);">${new Date(item.last_updated).toLocaleString()}</td>
                <td>
                    <button class="btn-sm btn-primary" onclick="openCrudModal('stock', '${item.id}')">Update</button>
                    <button class="btn-sm btn-danger" onclick="deleteRecord('stock', '${item.id}')">Delete</button>
                </td>
            </tr>`;
    });
}

function renderCartTable(data) {
    console.log("Rendering Cart Table with data:", data);
    const tbody = document.getElementById('cartTableBody');
    tbody.innerHTML = '';
    if (!data || data.length === 0) return tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No active carts found</td></tr>`;

    data.forEach(item => {
        const specs = item.customization_choices ? JSON.stringify(item.customization_choices).replace(/[{"}]/g, '').replace(/:/g, ': ') : 'None';
        const date = new Date(item.created_at).toLocaleString();

        let finalPriceText = "Calculating...";
        let finalPrice = 0;

        // Prioritize explicit price stored in cart payload
        if (item.customization_choices && item.customization_choices.price !== undefined) {
            finalPrice = parseFloat(item.customization_choices.price) * item.quantity;
            finalPriceText = `₹${finalPrice.toFixed(2)}`;
        } else {
            // Fallback: Dynamically compute relational Final Price using memory caches for legacy un-migrated cart items
            if (item.product_type === 'normal' && window['normal_productsData']) {
                const prod = window['normal_productsData'].find(p => p.id === item.product_id);
                if (prod) {
                    finalPrice = prod.price * item.quantity;
                    finalPriceText = `₹${finalPrice.toFixed(2)}`;
                }
            } else if (item.product_type === 'customized' && window['customized_productsData']) {
                const prod = window['customized_productsData'].find(p => p.id === item.product_id);
                if (prod && prod.customization_options && prod.customization_options.sizes) {
                    const sizeMapping = item.customization_choices?.size || 'small/1 roll';
                    const unitPrice = prod.customization_options.sizes[sizeMapping] || prod.base_price || 0;
                    finalPrice = unitPrice * item.quantity;
                    finalPriceText = `₹${finalPrice.toFixed(2)}`;
                }
            }
        }

        tbody.innerHTML += `
            <tr>
                <td style="font-family:monospace;font-size:12px;">${item.user_id ? item.user_id.substring(0, 8) + '...' : 'Guest'}</td>
                <td style="font-family:monospace;font-size:12px;">${item.product_id ? item.product_id.substring(0, 8) + '...' : 'N/A'}</td>
                <td><span style="background:var(--bg-secondary);padding:2px 6px;border-radius:4px;font-size:12px;">${item.product_type}</span></td>
                <td style="font-weight:bold;">${item.quantity}</td>
                <td style="color:var(--primary-color); font-weight:600;">${finalPriceText}</td>
                <td style="font-size:12px; color:var(--text-secondary); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${specs}</td>
                <td style="font-size:12px; color:var(--text-secondary);">${date}</td>
                <td>
                    <button class="btn-sm btn-danger" onclick="deleteRecord('cart', '${item.id}')">Clear</button>
                </td>
            </tr>`;
    });
}

function renderOrdersTable(data) {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = '';
    if (!data || data.length === 0) return tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No orders found</td></tr>`;

    data.forEach(item => {
        let receiptHtml = 'No Receipt';
        const receiptUrl = item.payment_screenshot_url || (item.shipping_address && item.shipping_address.payment_screenshot_url);

        if (receiptUrl) {
            // Check if it's an absolute URL or a relative path from our backend
            const imgUrl = receiptUrl.startsWith('http')
                ? receiptUrl
                : `${BACKEND_URL}${receiptUrl}`;

            receiptHtml = `<a href="${imgUrl}" target="_blank">
                <img src="${imgUrl}" alt="Receipt" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #ccc;">
            </a>`;
        }

        let actionsHtml = '';
        if (item.status === 'pending') {
            actionsHtml = `
                <button class="btn-sm btn-primary" style="margin-right: 5px; background-color: #28a745;" onclick="updateOrderStatus(this, '${item.id}', 'processing')">Confirm Payment</button>
                <button class="btn-sm btn-danger" onclick="updateOrderStatus(this, '${item.id}', 'rejected')">Reject</button>
            `;
        } else if (item.status === 'processing') {
            actionsHtml = `<button class="btn-sm btn-primary" style="background-color: #17a2b8;" onclick="updateOrderStatus(this, '${item.id}', 'shipped')">Mark Shipped</button>`;
        } else if (item.status === 'shipped') {
            actionsHtml = `<button class="btn-sm btn-primary" style="background-color: #ffc107; color: #000;" onclick="updateOrderStatus(this, '${item.id}', 'delivered')">Mark Delivered</button>`;
        } else {
            actionsHtml = `<button class="btn-sm" style="background-color: #6c757d; color: white;" disabled>${item.status.toUpperCase()}</button>`;
        }

        let displayStatus = item.status.toUpperCase();
        if (item.status === 'processing') displayStatus = 'PAYMENT CONFIRMED';

        tbody.innerHTML += `
            <tr>
                <td style="font-family:monospace;font-size:12px;font-weight:bold;">${item.id.substring(0, 8)}</td>
                <td style="font-family:monospace;font-size:12px;">${item.user_id ? item.user_id.substring(0, 8) + '...' : 'Guest'}</td>
                <td style="font-weight:600;color:var(--primary-color);">₹${item.total_amount}</td>
                <td><span style="border: 1px solid #ddd; padding:2px 6px; border-radius:4px; font-size:12px; font-weight:bold;">${displayStatus}</span></td>
                <td>${receiptHtml}</td>
                <td>${actionsHtml}</td>
            </tr>`;
    });
}

function renderOrderDetailsTable(data) {
    const tbody = document.getElementById('order_detailsTableBody');
    tbody.innerHTML = '';
    if (!data || data.length === 0) return tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No addresses found</td></tr>`;

    data.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td style="font-family:monospace;font-size:12px;font-weight:bold;color:var(--primary-color);">${item.order_id ? item.order_id.substring(0, 8) + '...' : 'Unknown'}</td>
                <td style="font-weight:bold;">${item.name}</td>
                <td>
                    <div style="font-size:12px;">📞 ${item.mobile}</div>
                    <div style="font-size:12px;color:var(--text-secondary);">✉️ ${item.email}</div>
                </td>
                <td style="font-size:12px; max-width: 200px; white-space: normal;">${item.address}</td>
                <td style="font-size:12px;">
                    <div style="font-weight:600;">${item.city}</div>
                    <div style="color:var(--text-secondary);">${item.pincode}</div>
                </td>
            </tr>`;
    });
}

function renderOrderItemsTable(data) {
    const tbody = document.getElementById('order_itemsTableBody');
    tbody.innerHTML = '';
    if (!data || data.length === 0) return tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No order items found</td></tr>`;

    data.forEach(item => {
        const specs = item.customization_choices ? JSON.stringify(item.customization_choices).replace(/[{"}]/g, '').replace(/:/g, ': ') : 'None';
        const date = new Date(item.created_at).toLocaleString();

        tbody.innerHTML += `
            <tr>
                <td style="font-family:monospace;font-size:12px;font-weight:bold;color:var(--primary-color);">${item.order_id ? item.order_id.substring(0, 8) + '...' : 'Unknown'}</td>
                <td style="font-family:monospace;font-size:12px;">${item.product_id ? item.product_id.substring(0, 8) + '...' : 'Unknown'}</td>
                <td><span style="background:var(--bg-secondary);padding:2px 6px;border-radius:4px;font-size:12px;">${item.product_type}</span></td>
                <td style="font-weight:bold;">${item.quantity}</td>
                <td style="color:var(--primary-color); font-weight:600;">₹${item.price_at_purchase}</td>
                <td style="font-size:12px; color:var(--text-secondary); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${specs}</td>
                <td style="font-size:12px; color:var(--text-secondary);">${date}</td>
            </tr>`;
    });
}

// Global Order Status Updater
window.updateOrderStatus = async function (btn, orderId, newStatus) {
    if (!confirm(`Are you sure you want to change this order's status to ${newStatus.toUpperCase()}?`)) return;

    try {
        const response = await fetch(`${BACKEND_URL}/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) throw new Error("Failed to update status");

        btn.textContent = "Saved";
        btn.disabled = true;

        // Soft reload the dashboard
        setTimeout(() => {
            refreshData();
        }, 1000);

    } catch (err) {
        console.error("Status Update Error:", err);
        alert("Execution failed.");
    }
}


/* =========================================
   UNIVERSAL CRUD MODAL CONTROLLER 
========================================= */
let currentCrudTable = null;
let currentCrudId = null;

function openCrudModal(table, existingDataOrId = null) {
    let existingData = null;
    if (typeof existingDataOrId === 'string') {
        const cache = window[`${table}Data`] || [];
        existingData = cache.find(t => t.id == existingDataOrId) || null;
    } else {
        existingData = existingDataOrId;
    }

    currentCrudTable = table;
    currentCrudId = existingData ? existingData.id : null;

    document.getElementById('crudModalTitle').textContent = existingData ? `Edit ${table.replace('_', ' ')}` : `Add ${table.replace('_', ' ')}`;
    const form = document.getElementById('crudForm');
    form.innerHTML = ''; // Clear previous inputs

    // Generate Universal Inputs based on Table
    let fields = [];
    if (table === 'categories') {
        fields = [
            { id: 'name', label: 'Category Name', type: 'text', required: true },
            { id: 'description', label: 'Description', type: 'textarea' }
        ];
    } else if (table === 'normal_products') {
        fields = [
            { id: 'name', label: 'Product Name', type: 'text', required: true },
            { id: 'short_description', label: 'Short Description', type: 'text' },
            { id: 'long_description', label: 'Detailed Description', type: 'textarea' },
            { id: 'price', label: 'Price (₹)', type: 'number', required: true },
            { id: 'size', label: 'Size', type: 'text' },
            { id: 'colors', label: 'Colors (JSON Array)', type: 'textarea', help: 'e.g. ["red", "blue"]' },
            { id: 'images', label: 'Images (JSON Array)', type: 'textarea', help: 'Array containing 3-4 image URLs' },
            { id: 'is_active', label: 'Is Active', type: 'checkbox', default: true }
        ];
    } else if (table === 'customized_products') {
        fields = [
            { id: 'name', label: 'Product Name', type: 'text', required: true },
            { id: 'short_description', label: 'Short Description', type: 'text' },
            { id: 'long_description', label: 'Detailed Description', type: 'textarea' },
            { id: 'price_small', label: 'Price: Small / 1 Roll (₹)', type: 'number', required: true },
            { id: 'price_medium', label: 'Price: Medium / 2 Roll (₹)', type: 'number', required: true },
            { id: 'price_large', label: 'Price: Large / 3 Roll (₹)', type: 'number', required: true },
            { id: 'colors', label: 'Colors (JSON Array - Min 6)', type: 'textarea', default: '[\n  "red",\n  "blue",\n  "green",\n  "yellow",\n  "black",\n  "white"\n]', required: true },
            { id: 'max_colors', label: 'Max Selectable Colors', type: 'number', default: 1, required: true },
            { id: 'images', label: 'Images (JSON Array)', type: 'textarea', help: 'Array containing image URLs' },
            { id: 'is_active', label: 'Is Active', type: 'checkbox', default: true }
        ];
    } else if (table === 'stock') {
        fields = [
            { id: 'product_id', label: 'Product ID (UUID)', type: 'text', required: true },
            { id: 'product_type', label: 'Type (normal / customized)', type: 'text', required: true },
            { id: 'quantity', label: 'Quantity', type: 'number', required: true }
        ];
    } else if (table === 'orders') {
        fields = [
            { id: 'status', label: 'Order Status (pending, processing, shipped, delivered, cancelled)', type: 'text', required: true }
        ];
    }

    // Render Fields
    fields.forEach(f => {
        let val = existingData ? existingData[f.id] : (f.default !== undefined ? f.default : '');

        // Custom parser for Customized Products UI extraction
        if (table === 'customized_products' && existingData && existingData.customization_options) {
            const opts = existingData.customization_options;
            if (f.id === 'price_small') val = opts.sizes?.["small/1 roll"] || '';
            if (f.id === 'price_medium') val = opts.sizes?.["medium/2 roll"] || '';
            if (f.id === 'price_large') val = opts.sizes?.["large/3 roll"] || '';
            if (f.id === 'colors') val = opts.colors || f.default;
            if (f.id === 'max_colors') val = opts.max_colors || f.default;
        }

        if (typeof val === 'object' && val !== null) val = JSON.stringify(val, null, 2); // Flatten JSON inputs nicely

        // Escape quotes to prevent breaking the HTML structural boundaries
        let safeVal = '';
        if (val !== undefined && val !== null) {
            safeVal = String(val).replace(/'/g, "&#39;").replace(/"/g, "&quot;");
        }

        let inputHtml = '';
        if (f.id === 'images') {
            let parsedVal = [];
            if (val && val !== '') {
                try {
                    parsedVal = typeof val === 'string' ? JSON.parse(val) : val;
                } catch (e) { }
            }
            if (!Array.isArray(parsedVal)) parsedVal = [];

            let slotsHtml = '';
            const labels = ['Main Image', 'Sub Image 1', 'Sub Image 2'];
            for (let i = 0; i < 3; i++) {
                const rawImgUrl = parsedVal[i] || '';
                let imgSrc = rawImgUrl;
                if (imgSrc && imgSrc.includes('/uploads/')) {
                    imgSrc = `${BACKEND_URL}${imgSrc.substring(imgSrc.indexOf('/uploads/'))}`;
                } else if (!imgSrc.startsWith('http') && imgSrc.trim() !== '') {
                    imgSrc = imgSrc.startsWith('images') ? '../' + imgSrc : imgSrc;
                }
                slotsHtml += `
                    <div style="margin-bottom: 10px; padding: 10px; border: 1px dashed #ccc; border-radius: 4px; background: #fafafa;">
                        <label style="font-size: 12px; font-weight: bold; color: var(--text-primary);">${labels[i]}</label>
                        <div style="display: flex; gap: 10px; align-items: center; margin-top: 5px;">
                            ${imgSrc ? `<img src="${imgSrc}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;">` : `<div style="width: 40px; height: 40px; background: #eee; border-radius: 4px; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #999;">Empty</div>`}
                            <div style="flex: 1;">
                                <input type="file" id="crud_image_${i}" class="form-control" style="width:100%;padding:4px;cursor:pointer;" accept="image/*">
                            </div>
                            <input type="hidden" id="crud_existing_image_${i}" value='${rawImgUrl.replace(/'/g, "&#39;").replace(/"/g, "&quot;") || ''}'>
                        </div>
                    </div>
                `;
            }

            inputHtml = `
                <div style="margin-top: 8px;">
                    <small style="color:#d97706;font-size:11px;display:block;margin-bottom:8px;">Upload images individually. Existing images are shown in the thumbnail.</small>
                    ${slotsHtml}
                </div>
            `;
        } else if (f.type === 'textarea') {
            inputHtml = `<textarea id="crud_${f.id}" class="form-control" style="width:100%;padding:8px;border-radius:4px;border:1px solid #ddd;min-height:80px;font-family:${f.id === 'colors' ? 'monospace' : 'inherit'};" ${f.required ? 'required' : ''}>${val !== undefined && val !== null ? String(val) : ''}</textarea>`;
        } else if (f.type === 'checkbox') {
            inputHtml = `<input type="checkbox" id="crud_${f.id}" ${val ? 'checked' : ''}>`;
        } else {
            inputHtml = `<input type="${f.type}" id="crud_${f.id}" class="form-control" style="width:100%;padding:8px;border-radius:4px;border:1px solid #ddd;" value="${safeVal}" ${f.required ? 'required' : ''}>`;
        }

        form.innerHTML += `
            <div class="form-group" style="margin-bottom: 12px; text-align: left;">
                <label style="display:block;margin-bottom:4px;font-size:13px;font-weight:600;color:var(--text-secondary);text-transform:capitalize;">${f.label}</label>
                ${inputHtml}
                ${f.help ? `<small style="color:#888;font-size:11px;">${f.help}</small>` : ''}
            </div>
        `;
    });

    form.innerHTML += `<button type="submit" class="btn-primary" style="width:100%;margin-top:15px;padding:10px;">Save Changes</button>`;
    document.getElementById('crudModalOverlay').classList.add('active');
}

function closeCrudModal() {
    document.getElementById('crudModalOverlay').classList.remove('active');
}

async function handleCrudSubmit(e) {
    e.preventDefault();
    const table = currentCrudTable;
    const id = currentCrudId;

    let payload = {};

    // 1. Intercept Physical File Uploads First
    let existingImages = [];
    let imagesToUpload = [];

    for (let i = 0; i < 3; i++) {
        const fileInput = document.getElementById(`crud_image_${i}`);
        const existingInput = document.getElementById(`crud_existing_image_${i}`);

        if (existingInput && existingInput.value) {
            existingImages[i] = existingInput.value;
        } else {
            existingImages[i] = "";
        }

        if (fileInput && fileInput.files.length > 0) {
            imagesToUpload.push({ index: i, file: fileInput.files[0] });
        }
    }

    let finalImagesArray = [...existingImages];

    if (imagesToUpload.length > 0) {
        showLoader(true);
        try {
            const formData = new FormData();
            imagesToUpload.forEach(item => {
                formData.append('images', item.file);
            });

            const uploadRes = await fetch(`${BACKEND_URL}/admin/upload`, {
                method: 'POST',
                body: formData
            });

            const uploadData = await uploadRes.json();
            if (uploadData.success && uploadData.urls) {
                // Map the returned URLs back to their correct slot index
                imagesToUpload.forEach((item, rawIndex) => {
                    finalImagesArray[item.index] = uploadData.urls[rawIndex];
                });
            } else {
                throw new Error("Image upload failed: " + uploadData.error);
            }
        } catch (err) {
            showNotification(err.message);
            showLoader(false);
            return; // Abort the whole sequence if images fail
        }
    }

    // Clean array
    payload.images = finalImagesArray.filter(url => url && url.trim() !== "");

    // 2. Process remaining standard text/number inputs
    const inputs = document.getElementById('crudForm').querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        const key = input.id.replace('crud_', '');

        // Skip explicitly handled variables
        if (key === 'images' || key.startsWith('image_') || key.startsWith('existing_image_')) return;

        if (input.type === 'checkbox') {
            payload[key] = input.checked;
        } else if (input.type === 'number') {
            payload[key] = parseFloat(input.value);
        } else {
            let val = input.value;
            // Attempt to parse JSON arrays silently
            if (val.startsWith('[') || val.startsWith('{')) {
                try { val = JSON.parse(val); } catch (e) { }
            }
            if (val !== undefined && val !== "") payload[key] = val;
        }
    });

    // Reconstruct customization_options structurally for Customized Products
    if (table === 'customized_products') {
        payload.customization_options = {
            sizes: {
                "small/1 roll": payload.price_small || 0,
                "medium/2 roll": payload.price_medium || 0,
                "large/3 roll": payload.price_large || 0
            },
            colors: payload.colors && Array.isArray(payload.colors) ? payload.colors : ["red", "blue", "green", "yellow", "black", "white"],
            max_colors: parseInt(payload.max_colors) || 1
        };
        // Remove explicitly mapped ghost UI fields
        delete payload.price_small;
        delete payload.price_medium;
        delete payload.price_large;
        delete payload.colors;
        delete payload.max_colors;
        payload.base_price = 0; // Deprecate the base price to 0 since Sizes calculate total
    }

    showLoader(true);
    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${BACKEND_URL}/admin/data/${table}/${id}` : `${BACKEND_URL}/admin/data/${table}`;

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.success) {
            showNotification('Saved successfully!');
            closeCrudModal();
            fetchTableData(table); // Refresh table dynamically
        } else {
            throw new Error(data.error);
        }
    } catch (err) {
        showNotification('Failed to save record: ' + err.message);
    } finally {
        showLoader(false);
    }
}

async function deleteRecord(table, id) {
    if (!confirm(`Are you sure you want to delete this record from ${table}? Action cannot be undone.`)) return;

    showLoader(true);
    try {
        const response = await fetch(`${BACKEND_URL}/admin/data/${table}/${id}`, { method: 'DELETE' });
        const data = await response.json();

        if (data.success) {
            showNotification('Record deleted!');
            fetchTableData(table); // Refresh table dynamically
        } else {
            throw new Error(data.error);
        }
    } catch (err) {
        showNotification('Failed to delete: ' + err.message);
    } finally {
        showLoader(false);
    }
}

// Auto-refresh when switching back to the Admin tab
window.addEventListener('focus', () => {
    if (localStorage.getItem('wirenestAdminLoggedIn') === 'true') {
        const activeTab = document.querySelector('.admin-tab.active');
        if (activeTab) {
            const tabId = activeTab.id.replace('tab-', '');
            // Silent refresh mapping
            if (tabId === 'users') fetchTableData('users', true);
            else if (tabId === 'categories') fetchTableData('categories', true);
            else if (tabId === 'products-normal') fetchTableData('normal_products', true);
            else if (tabId === 'products-custom') fetchTableData('customized_products', true);
            else if (tabId === 'stock') fetchTableData('stock', true);
            else if (tabId === 'cart') fetchTableData('cart', true);
            else if (tabId === 'orders') fetchTableData('orders', true);
            else if (tabId === 'dashboard') {
                ['users', 'normal_products', 'customized_products', 'orders'].forEach(t => fetchTableData(t, true));
            }
        }
    }
});
