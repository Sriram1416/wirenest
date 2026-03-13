// WireNest - Handcrafted Wire Baskets E-commerce JavaScript
// Pure vanilla JavaScript - No frameworks

// Global Supabase client
var supabaseClient;

// Determine backend URL dynamically based on where the frontend is being served
const hostname = window.location.hostname;
const protocol = window.location.protocol;

// If we are on Vercel, we need to point to the deployed backend URL.
const isProduction = hostname.includes('vercel.app') || hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('192.168.');

const BACKEND_URL = isProduction 
    ? 'https://wirenest-backend.onrender.com' // Replace with actual production backend URL
    : 'http://localhost:8001';

// DOM Elements (will be initialized after DOM loads)
let navbar, cartCount, cartPanel, cartOverlay, cartItems, cartTotal, productsGrid, loginSignupOverlay;

// Session Management - Use Supabase as single source of truth
// Mobile Menu Toggle
function toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    const hamburger = document.querySelector('.hamburger');
    if (navMenu && hamburger) {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
    }
}

let cart = [];
let currentSession = null;
let currentUser = null;
let customizationSelections = {
    size: null,
    colors: [] // Array to store multiple selected colors
};

// Block-wise pricing configuration for customization products
const customizationPriceConfig = {
    normal: {
        small: 120,
        medium: 250,
        large: 400
    },
    sivankan: {
        small: 180,
        medium: 550,
        large: 800
    },
    cross: {
        small: 220,
        medium: 650,
        large: 900
    },
    premium: {
        small: 300,
        medium: 850,
        large: 1200
    }
};

// Available colors for customization products
const customizationColors = ['green', 'yellow', 'red', 'blue', 'pink', 'black', 'white', 'gold', 'silver'];

// Price Configuration for Normal Products
const priceConfig = {
    normal: {
        small: 100,
        medium: 200,
        large: 300
    },
    sivankan: {
        small: 150,
        medium: 500,
        large: 700
    },
    cross: {
        small: 180,
        medium: 350,
        large: 600
    },
    premium: {
        small: 250,
        medium: 450,
        large: 800
    }
};

// Currency configuration
const currency = {
    symbol: '₹',
    code: 'INR'
};

// Live database driven products
let products = [];

// Customization Products (One per block)
const customizationProducts = [
    {
        id: 'custom-normal',
        name: 'Normal Block Customization',
        price: priceConfig.normal.small, // 100
        rating: 4.5,
        image: 'https://picsum.photos/150/150?random=100', // Main product image
        description: 'Customize your normal wire basket',
        blockType: 'normal',
        colors: ['green', 'yellow', 'red']
    },
    {
        id: 'custom-sivankan',
        name: 'Sivankan Block Customization',
        price: priceConfig.sivankan.small, // 150
        rating: 4.6,
        image: 'https://picsum.photos/150/150?random=100', // Main product image
        description: 'Customize your Sivankan wire basket',
        blockType: 'sivankan',
        colors: ['blue', 'pink']
    },
    {
        id: 'custom-cross',
        name: 'Cross Block Customization',
        price: priceConfig.cross.small, // 180
        rating: 4.7,
        image: 'https://picsum.photos/150/150?random=100', // Main product image
        description: 'Customize your cross pattern wire basket',
        blockType: 'cross',
        colors: ['yellow', 'black', 'white']
    },
    {
        id: 'custom-premium',
        name: 'Premium Block Customization',
        price: priceConfig.premium.small, // 250
        rating: 4.8,
        image: 'https://picsum.photos/150/150?random=100', // Main product image
        description: 'Customize your premium wire basket',
        blockType: 'premium',
        colors: ['gold', 'silver', 'black']
    }
];

// Setup Event Listeners
function setupEventListeners() {
    // Add event listener for back button
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('btn-back-to-products')) {
            e.preventDefault();
            e.stopPropagation();
            showMainProducts();
        }
    });

    // Add event listener for real-time search filtering
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    // Navbar scroll effect
    window.addEventListener('scroll', function () {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Handle window resize
    window.addEventListener('resize', function () {
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        const profileDropdown = document.querySelector('.profile-dropdown');

        if (window.innerWidth <= 768) {
            if (hamburger) hamburger.style.display = 'flex';
            if (profileDropdown) profileDropdown.style.display = 'flex';
        } else {
            if (hamburger) hamburger.style.display = 'none';
            if (navMenu) {
                navMenu.classList.remove('active');
                const hamburgerElement = document.querySelector('.hamburger');
                if (hamburgerElement) hamburgerElement.classList.remove('active');
            }
        }
    });

    // Close mobile menu when clicking on a link
    const navLinks = document.querySelectorAll('.nav-link');
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu) navMenu.classList.remove('active');
            if (hamburger) hamburger.classList.remove('active');
        });
    });
}

// Handle OAuth redirect manually through Backend Proxy
async function handleOAuthRedirect() {
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token')) {
        return; // No tokens to process
    }

    try {
        console.log('OAuth token found in URL, verifying with backend...');

        // Supabase implicit flow puts tokens in the hash like #access_token=...&refresh_token=...
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');

        if (!accessToken) return;

        // Clean up URL hash tokens immediately so it doesn't linger
        window.history.replaceState({}, document.title, window.location.pathname);

        // Verify with backend
        const response = await fetch(`${BACKEND_URL}/auth/user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: accessToken })
        });

        const data = await response.json();

        if (data.success && data.user) {
            console.log('OAuth session verified:', data.user.email);

            const email = data.user.email;
            const name = data.user.user_metadata?.full_name || data.user.user_metadata?.name || email.split('@')[0];
            const avatar = data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || '';

            localStorage.setItem('wirenestLoggedIn', 'true');
            localStorage.setItem('wirenestEmail', email);
            localStorage.setItem('wirenestName', name);
            localStorage.setItem('wirenestId', data.user.id);
            if (avatar) localStorage.setItem('wirenestAvatar', avatar);

            currentUser = data.user;
            currentSession = { user: data.user, access_token: accessToken };

            updateNavbarForSession({ user: data.user });
            showNotification('Successfully logged in with Google!');

            // Critical Sync Fix: Push local carts and fetch PostgreSQL UUIDs
            await loadCartFromStorage();
        } else {
            console.error('OAuth verification failed:', data.error);
            showNotification('Google login failed. Please try again.');
        }
    } catch (error) {
        console.error('OAuth redirect parsing error:', error);
        showNotification('Login verification failed. Is backend running?');
    }
}

async function fetchProductsFromDatabase() {
    try {
        const [normalRes, customRes] = await Promise.all([
            fetch(`${BACKEND_URL}/admin/data/normal_products`),
            fetch(`${BACKEND_URL}/admin/data/customized_products`)
        ]);

        const normalData = await normalRes.json();
        const customData = await customRes.json();

        let liveProducts = [];

        if (normalData.success && normalData.data) {
            const parsedNormal = normalData.data.map(p => {
                let parsedImages = [];
                if (typeof p.images === 'string') { try { parsedImages = JSON.parse(p.images); } catch (e) { } } else if (Array.isArray(p.images)) parsedImages = p.images;
                let parsedColors = [];
                if (typeof p.colors === 'string') { try { parsedColors = JSON.parse(p.colors); } catch (e) { } } else if (Array.isArray(p.colors)) parsedColors = p.colors;

                return {
                    id: p.id,
                    name: p.name,
                    price: parseFloat(p.price) || 0,
                    rating: 4.5,
                    image: parsedImages.length > 0 ? parsedImages[0] : 'https://picsum.photos/150/150?random=100',
                    galleryImages: parsedImages.length > 0 ? parsedImages : ['https://picsum.photos/150/150?random=100'],
                    description: p.short_description || p.long_description || 'Product Description',
                    blockType: 'normal',
                    size: p.size || 'medium',
                    colors: parsedColors
                };
            });
            liveProducts = liveProducts.concat(parsedNormal);
        }

        if (customData.success && customData.data) {
            const parsedCustom = customData.data.map(p => {
                let parsedImages = [];
                if (typeof p.images === 'string') { try { parsedImages = JSON.parse(p.images); } catch (e) { } } else if (Array.isArray(p.images)) parsedImages = p.images;
                let parsedOpts = {};
                if (typeof p.customization_options === 'string') { try { parsedOpts = JSON.parse(p.customization_options); } catch (e) { } } else if (typeof p.customization_options === 'object') parsedOpts = p.customization_options || {};

                return {
                    id: p.id,
                    name: p.name,
                    price: parseFloat(p.base_price) || 0,
                    rating: 4.8,
                    image: parsedImages.length > 0 ? parsedImages[0] : 'https://picsum.photos/150/150?random=200',
                    galleryImages: parsedImages.length > 0 ? parsedImages : ['https://picsum.photos/150/150?random=200'],
                    description: p.short_description || p.long_description || 'Customizable Product Description',
                    blockType: 'customized',
                    customization_options: parsedOpts
                };
            });
            liveProducts = liveProducts.concat(parsedCustom);
        }

        products = liveProducts;
        console.log(`Loaded ${products.length} cross-catalog products from database.`);
    } catch (err) {
        console.error('Failed to fetch live database products:', err);
    }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM loaded, initializing app...');

    // Initialize DOM elements first
    navbar = document.getElementById('navbar');
    cartCount = document.getElementById('cartCount');
    cartPanel = document.getElementById('cartPanel');
    cartOverlay = document.getElementById('cartOverlay');
    cartItems = document.getElementById('cartItems');
    cartTotal = document.getElementById('cartTotal');
    productsGrid = document.getElementById('productsGrid');
    loginSignupOverlay = document.getElementById('loginSignupOverlay');

    setTimeout(() => {
        // Handle potential OAuth Redirect before fully initializing UI
        handleOAuthRedirect().then(async () => {
            // Fetch live database products
            await fetchProductsFromDatabase();

            // Initialize app
            loadCartFromStorage();
            renderProducts();
            
            if (currentUser && currentUser.id !== 'local-user-restore') {
                fetchUserWishlistState();
            }
            
            updateCartCount();
            setupEventListeners();
        });
    }, 500);

    // Restore session using Supabase as single source of truth
    // Check localStorage first for immediate UI update
    const isLoggedIn = localStorage.getItem('wirenestLoggedIn') === 'true';
    const savedEmail = localStorage.getItem('wirenestEmail');
    const savedName = localStorage.getItem('wirenestName');
    const savedAvatar = localStorage.getItem('wirenestAvatar');
    const savedId = localStorage.getItem('wirenestId');

    if (isLoggedIn && savedEmail) {
        // Immediately set currentUser so cart checks work
        currentUser = {
            id: savedId,
            email: savedEmail,
            user_metadata: {
                name: savedName,
                avatar_url: savedAvatar,
                picture: savedAvatar
            }
        };
        updateNavbarForSession({ user: currentUser });

        // Load cart from DB if we have a valid user ID
        if (savedId) {
            loadCartFromStorage();
        }
    }

    setTimeout(() => {
        restoreSession();
    }, 100);
});

// Search Functionality
function handleSearch() {
    renderProducts();
}

// Render Products
function renderProducts() {
    console.log('=== RENDERING PRODUCTS ===');
    if (!productsGrid) return;

    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let displayProducts = products.filter(p => p.blockType === 'customized');

    if (searchTerm !== '') {
        displayProducts = displayProducts.filter(p =>
            (p.name && p.name.toLowerCase().includes(searchTerm)) ||
            (p.description && p.description.toLowerCase().includes(searchTerm))
        );
    }

    let html = `
        <div class="main-products-section" id="mainProductsSection">
            <div class="product-section">
                <div class="products-row">
                    ${displayProducts.map(product => {
                        let imgUrl = product.image;
                        if (!imgUrl.startsWith('http')) {
                            imgUrl = imgUrl.startsWith('images') ? imgUrl : `${BACKEND_URL}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
                        }
                        return `
                        <div class="product-card" onclick="showProductModal('${product.id}')" data-block-type="${product.blockType}" data-product-id="${product.id}">
                        <button class="wishlist-btn" onclick="event.stopPropagation(); toggleWishlist('${product.id}', '${product.blockType || 'customized'}', this)" aria-label="Add to Wishlist">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                        </button>
                        <div class="product-image">
                            <img src="${imgUrl}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">
                        </div>
                        <div class="product-info">
                            <h3>${product.name}</h3>
                            <div class="product-price">`;
                    }).join('')}
                                ${(() => {
            if (product.price !== undefined) return currency.symbol + product.price;
            const opts = product.customization_options || {};
            const sizes = opts.sizes || {};
            const prices = Object.values(sizes).map(v => parseFloat(v)).filter(v => !isNaN(v));
            if (prices.length > 0) {
                return `${currency.symbol}${Math.min(...prices)}`;
            }
            return 'Custom Pricing';
        })()}
                            </div>
                            <div class="product-colors" style="display: flex; gap: 5px; margin-top: 10px;">
                                ${(() => {
            const opts = product.customization_options || {};
            let colorArr = opts.colors || [];
            if (typeof colorArr === 'string') {
                try { colorArr = JSON.parse(colorArr); }
                catch (e) { colorArr = colorArr.split(',').map(s => s.trim()); }
            }
            if (!Array.isArray(colorArr)) colorArr = [];

            // Show up to 4 colors, then a +X indicator
            const displayColors = colorArr.slice(0, 4);
            const extraCount = colorArr.length - 4;

            let html = displayColors.map(c =>
                `<span style="width: 16px; height: 16px; border-radius: 50%; background: ${c}; border: 1px solid #ddd; display: inline-block;" title="${c}"></span>`
            ).join('');

            if (extraCount > 0) {
                html += `<span style="font-size: 11px; color: #888; margin-left: 2px;">+${extraCount}</span>`;
            }
            return html;
        })()}
                            </div>
                            <div class="product-actions" style="margin-top: 15px;">
                                <button class="btn-primary" style="width: 100%;" onclick="event.stopPropagation(); showProductModal('${product.id}')">Customize</button>
                            </div>
                        </div>
                    </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    // Legacy Customization Section block removed because Custom Products are now natively merged into the main products grid array.

    productsGrid.innerHTML = html;
}

// Filter products by category
function filterByCategory(category) {
    // Scroll to products section
    const shopSection = document.getElementById('shop');
    if (shopSection) {
        shopSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Optional: You could add highlighting or filtering logic here
    console.log(`Filtering by category: ${category} `);
}

// Show Customization Section
function showCustomizationSection() {
    // Scroll to products section as customization is now integrated
    const shopSection = document.getElementById('shop');
    if (shopSection) {
        shopSection.scrollIntoView({ behavior: 'smooth' });
    }
    document.body.style.overflow = 'auto';
}

// Show Main Products Section
function showMainProducts() {
    // Scroll to top of products section
    const shopSection = document.getElementById('shop');
    if (shopSection) {
        shopSection.scrollIntoView({ behavior: 'smooth' });
    }
    document.body.style.overflow = 'auto';
}


// Generate Star Rating
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let stars = '';

    for (let i = 0; i < fullStars; i++) {
        stars += '<span class="star">★</span>';
    }

    if (hasHalfStar) {
        stars += '<span class="star">☆</span>';
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
        stars += '<span class="star" style="opacity: 0.3;">★</span>';
    }

    return stars;
}

// Add to Cart (Normal Product)
function addToCart(productId) {
    console.log('🛒 DIRECT ADD TO CART - Product ID:', productId);

    const product = products.find(p => p.id === productId);
    if (!product) {
        console.log('❌ ERROR: Product not found for ID:', productId);
        return;
    }

    console.log('📦 Found Product:', JSON.stringify(product, null, 2));
    console.log('Product Size:', product.size);
    console.log('Product Block Type:', product.blockType);

    // Use the ACTUAL product price directly from the database load
    const finalPrice = parseFloat(product.price) || priceConfig[product.blockType]?.[product.size] || 0;

    console.log('Final Price:', finalPrice);

    const existingItem = cart.find(item =>
        item.productId === product.id &&
        !item.isCustomized &&
        !item.designType
    );

    if (existingItem) {
        console.log('🔄 Updating existing item quantity and refreshing live price');
        existingItem.quantity += 1;
        existingItem.price = finalPrice;
        existingItem.name = product.name;
        existingItem.image = product.image;
    } else {
        console.log('➕ Creating new cart item');
        const cartItem = {
            id: Date.now(),
            productId: product.id,
            name: product.name,
            price: finalPrice,
            quantity: 1,
            image: product.image,
            isCustomized: false,
            size: product.size,
            colors: product.colors,
            blockType: product.blockType
        };

        console.log('Cart Item Created:', JSON.stringify(cartItem, null, 2));
        cart.push(cartItem);
    }

    console.log('Cart After Add:', JSON.stringify(cart, null, 2));

    saveCartToStorage();
    updateCartCount();

    // Sync to DB if user is logged in
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.id && currentUser.id !== 'local-user-restore') {
        try {
            fetch(`${BACKEND_URL}/cart/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    product_id: product.id,
                    product_type: product.blockType || 'normal',
                    quantity: 1,
                    customization_choices: { size: product.size, colors: product.colors, price: finalPrice }
                })
            }).then(() => loadCartFromStorage());
        } catch (e) { console.error('DB Cart Sync Error (card button):', e); }
    }

    showNotification(`${product.name} (${product.size.charAt(0).toUpperCase() + product.size.slice(1)}) added to cart!`);
}

// Cart Functions
function openCart() {
    cartPanel.classList.add('active');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    renderCartItems();
}

function closeCart() {
    cartPanel.classList.remove('active');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = 'auto';

    // Reset to cart view when closing
    const cartView = document.getElementById('cartView');
    const buyView = document.getElementById('buyView');
    const cartHeaderTitle = document.getElementById('cartHeaderTitle');

    if (cartView) cartView.style.display = 'block';
    if (buyView) buyView.style.display = 'none';
    if (cartHeaderTitle) cartHeaderTitle.textContent = 'Shopping Cart';
}

function renderCartItems() {
    const cartItems = document.getElementById('cartItems');
    if (!cartItems) return;

    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-secondary);">Your cart is empty</p>';
        updateCartTotal();
        hideCheckoutButton();
        return;
    }

    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-image">
                ${item.image === 'basket-placeholder' ?
            '<div class="product-placeholder">BASKET</div>' :
            `<img src="${item.image}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover;">`
        }
            </div>
            <div class="cart-item-details">
                <div class="cart-item-name">${item.name}</div>
                ${item.size ? `<div style="color: var(--text-secondary); font-size: 14px;">Size: ${item.size.charAt(0).toUpperCase() + item.size.slice(1)}</div>` : ''}
                ${item.colors ? `<div style="color: var(--text-secondary); font-size: 14px;">Colors: ${Array.isArray(item.colors) ? item.colors.join(', ') : item.colors}</div>` : ''}
                ${item.isCustomized ? '<div style="color: var(--primary-color); font-size: 12px; font-weight: 600;">CUSTOMIZED</div>' : ''}
                <div style="color: var(--text-secondary); font-size: 14px; display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                    Quantity: 
                    <button class="btn-sm" style="padding: 2px 8px;" onclick="updateCartQuantity('${item.id}', -1)">-</button>
                    <span style="font-weight: bold; color: var(--text-primary);">${item.quantity}</span>
                    <button class="btn-sm" style="padding: 2px 8px;" onclick="updateCartQuantity('${item.id}', 1)">+</button>
                </div>
                <div style="color: var(--text-primary); font-weight: 600; margin-top: 4px;">Total: ₹${(item.price * item.quantity).toFixed(2)}</div>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">×</button>
        </div>
    `).join('');

    updateCartTotal();
    showCheckoutButton();
}

function updateCartTotal() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Update subtotal
    const cartSubtotal = document.getElementById('cartSubtotal');
    if (cartSubtotal) {
        cartSubtotal.textContent = subtotal.toFixed(2);
    }

    // Update item count
    const cartItemCount = document.getElementById('cartItemCount');
    if (cartItemCount) {
        cartItemCount.textContent = totalItems;
    }

    // Update grand total
    const cartTotal = document.getElementById('cartTotal');
    if (cartTotal) {
        cartTotal.textContent = subtotal.toFixed(2);
    }
}

function showCheckoutButton() {
    const checkoutBtn = document.querySelector('.btn-checkout');
    if (checkoutBtn) {
        checkoutBtn.style.display = 'block';
    }
}

function hideCheckoutButton() {
    const checkoutBtn = document.querySelector('.btn-checkout');
    if (checkoutBtn) {
        checkoutBtn.style.display = 'none';
    }
}

// Show Buy View (Checkout)
function showBuyView() {
    const cartView = document.getElementById('cartView');
    const buyView = document.getElementById('buyView');
    const cartHeaderTitle = document.getElementById('cartHeaderTitle');

    // Hide cart view and show buy view
    cartView.style.display = 'none';
    buyView.style.display = 'block';
    cartHeaderTitle.textContent = 'Checkout';

    // Render order summary
    renderOrderSummary();
}

// Render Order Summary in Buy View
function renderOrderSummary() {
    const orderSummaryItems = document.getElementById('orderSummaryItems');
    const orderTotal = document.getElementById('orderTotal');

    if (!orderSummaryItems || !orderTotal) return;

    if (cart.length === 0) {
        orderSummaryItems.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--text-secondary);">No items in cart</p>';
        orderTotal.textContent = '0';
        return;
    }

    orderSummaryItems.innerHTML = cart.map(item => `
        <div class="order-summary-item">
            <div class="order-item-image">
                ${item.image === 'basket-placeholder' ?
            '<div class="product-placeholder">BASKET</div>' :
            `<img src="${item.image}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover;">`
        }
            </div>
            <div class="order-item-details">
                <div class="order-item-name">${item.name}</div>
                <div class="order-item-info">Quantity: ${item.quantity}</div>
                ${item.size ? `<div class="order-item-info">Size: ${item.size.charAt(0).toUpperCase() + item.size.slice(1)}</div>` : ''}
                ${item.colors ? `<div class="order-item-info">Colors: ${Array.isArray(item.colors) ? item.colors.join(', ') : item.colors}</div>` : ''}
                ${item.isCustomized ? '<div class="order-item-info" style="color: var(--primary-color); font-weight: 600;">CUSTOMIZED</div>' : ''}
                <div class="order-item-price">Total: ₹${(item.price * item.quantity).toFixed(2)}</div>
            </div>
        </div>
    `).join('');

    // Update order total
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    orderTotal.textContent = total.toFixed(2);
}

// Proceed to Payment (Validates Form & Shows QR)
function proceedToPayment(event) {
    event.preventDefault();

    // Get form data
    const formData = {
        name: document.getElementById('customerName').value,
        mobile: document.getElementById('customerMobile').value,
        email: document.getElementById('customerEmail').value,
        address: document.getElementById('customerAddress').value,
        city: document.getElementById('customerCity').value,
        pincode: document.getElementById('customerPincode').value
    };

    // Validate form
    if (!formData.name || !formData.mobile || !formData.email || !formData.address || !formData.city || !formData.pincode) {
        showNotification('Please fill in all required fields');
        return;
    }

    // Save to window for final submit
    window.currentCheckoutAddress = formData;

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('paymentTotal').textContent = total.toFixed(2);

    // Generate a secure, exact-amount invoice QR code for the user
    const dynamicQrUrl = `${BACKEND_URL}/orders/qr?amount=${total.toFixed(2)}`;
    const qrImageElem = document.getElementById('paymentQrImage');
    if (qrImageElem) {
        qrImageElem.src = dynamicQrUrl;
    }

    // Bind the exact amount to the mobile intent launch URL
    const upiLinkElem = document.getElementById('upiPaymentLink');
    if (upiLinkElem) {
        // Enhance deep link compatibility by injecting a pseudo transaction reference
        upiLinkElem.href = `upi://pay?pa=9715058175@pthdfc&pn=WireNest&tr=WN${Date.now()}&am=${total.toFixed(2)}&cu=INR`;
        upiLinkElem.textContent = `Pay exactly ₹${total.toFixed(2)} via UPI App`;

        // Prevent scary browser errors if clicked on a Desktop PC
        upiLinkElem.onclick = function (e) {
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (!isMobile && window.innerWidth > 768) {
                e.preventDefault();
                showNotification("Please scan the QR code above. The 'Pay via App' button requires a mobile phone with a UPI app installed.", "info");
            }
        };
    }

    document.getElementById('buyView').style.display = 'none';
    document.getElementById('paymentView').style.display = 'block';
}

function backToShipping() {
    document.getElementById('paymentView').style.display = 'none';
    document.getElementById('buyView').style.display = 'block';
}

async function submitOrder(event) {
    event.preventDefault();

    const fileInput = document.getElementById('paymentScreenshot');
    if (!fileInput.files || fileInput.files.length === 0) {
        showNotification('Please upload your payment screenshot.');
        return;
    }

    const btn = document.getElementById('btnConfirmOrder');
    if (btn) {
        btn.textContent = "Processing...";
        btn.disabled = true;
    }

    try {
        const formData = new FormData();
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        formData.append('receipt', fileInput.files[0]);
        formData.append('user_id', (typeof currentUser !== 'undefined' && currentUser && currentUser.id) ? currentUser.id : null);
        formData.append('shipping_address', JSON.stringify(window.currentCheckoutAddress));
        formData.append('items', JSON.stringify(cart));
        formData.append('total_amount', total);

        const response = await fetch(`${BACKEND_URL}/orders/checkout`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error("Failed to submit order");

        showNotification('Order submitted! Awaiting Admin confirmation.');

        // Clear Cart
        cart = [];
        saveCartToStorage();
        updateCartCount();

        setTimeout(() => {
            closeCart();
            document.getElementById('paymentView').style.display = 'none';
            document.getElementById('buyView').style.display = 'block';
            document.getElementById('customerForm').reset();
            document.getElementById('paymentForm').reset();
            if (btn) {
                btn.textContent = "I Have Paid - Place Order";
                btn.disabled = false;
            }
        }, 2000);

    } catch (err) {
        console.error("Checkout Error:", err);
        showNotification("Failed to submit order. Try again.", "error");
        if (btn) {
            btn.textContent = "I Have Paid - Place Order";
            btn.disabled = false;
        }
    }
}


async function updateCartQuantity(itemId, change) {
    const item = cart.find(i => i.id === itemId || i.id === String(itemId) || i.id === Number(itemId));
    if (!item) return;

    const newQuantity = item.quantity + change;

    if (newQuantity <= 0) {
        removeFromCart(itemId);
        return;
    }

    item.quantity = newQuantity;

    if (typeof currentUser !== 'undefined' && currentUser && currentUser.id && currentUser.id !== 'local-user-restore') {
        // Skip DB update if the item.id is just a timestamp (not synchronized)
        if (typeof item.id === 'string' && item.id.length > 20) {
            try {
                await fetch(`${BACKEND_URL}/cart/update/${item.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quantity: newQuantity })
                });
            } catch (e) { console.error("DB Cart Update Error:", e); }
        }
    }

    saveCartToStorage();
    updateCartCount();
    renderCartItems();
}

async function removeFromCart(itemId) {
    cart = cart.filter(item => String(item.id) !== String(itemId));

    if (typeof currentUser !== 'undefined' && currentUser && currentUser.id && currentUser.id !== 'local-user-restore') {
        try {
            await fetch(`${BACKEND_URL}/cart/remove/${itemId}`, { method: 'DELETE' });
        } catch (e) { console.error("DB Cart Delete Error:", e); }
    }

    saveCartToStorage();
    updateCartCount();
    renderCartItems();
    showNotification('Item removed from cart');
}

function updateCartCount() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCount) {
        cartCount.textContent = totalItems;
    }
}

// Login/Signup Functions
function openLoginSignup() {
    // Check if user is already logged in
    if (currentUser || localStorage.getItem('wirenestLoggedIn') === 'true') {
        console.log('User is already logged in, not opening login modal');
        return;
    }

    const modal = document.getElementById('loginSignupModal');
    if (modal) {
        modal.classList.remove('hidden');
    } else {
        console.error('Login modal not found');
    }
}

function closeLoginSignup() {
    const modal = document.getElementById('loginSignupModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Card switching functions
function showLoginCard() {
    document.getElementById('loginCard').style.display = 'block';
    document.getElementById('signupCard').style.display = 'none';
}

function showSignupCard() {
    document.getElementById('loginCard').style.display = 'none';
    document.getElementById('signupCard').style.display = 'block';
}

// Login function - Supabase Authentication
window.handleLogin = async function (event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    // Validation
    if (!email || !password) {
        showNotification('Please fill in all fields');
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Please enter a valid email address');
        return;
    }



    // Show loading state
    showNotification('Logging in...');

    try {
        const response = await fetch(`${BACKEND_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!data.success) {
            console.error('Login error:', data.error);
            showNotification(data.error || 'Invalid email or password');
            return;
        }

        if (data.user) {
            closeLoginSignup();
            showNotification('Login successful!');

            // To maintain session state when proxying via backend, we also mock the session UI wrapper
            // using the returned backend user object until reloading.
            const mockSession = { user: data.user };
            updateNavbarForSession(mockSession);

            localStorage.setItem('wirenestLoggedIn', 'true');
            localStorage.setItem('wirenestEmail', email);
            localStorage.setItem('wirenestName', data.user.user_metadata?.name || email.split('@')[0]);
            localStorage.setItem('wirenestId', data.user.id);

            // Critical Sync Fix: Push local carts and fetch PostgreSQL UUIDs
            await loadCartFromStorage();
        }
    } catch (err) {
        console.error('Unexpected login error:', err);
        showNotification('An unexpected error occurred during login. Is the backend running?');
    }
}

async function handleSignup(event) {
    event.preventDefault();

    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    // Validation
    if (!name || !email || !password) {
        showNotification('Please fill in all fields');
        return;
    }

    // Name validation
    if (name.length < 2) {
        showNotification('Name must be at least 2 characters');
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Please enter a valid email address');
        return;
    }

    // Password validation
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters');
        return;
    }



    // Show loading state
    showNotification('Creating account...');

    // Sign up via Backend
    try {
        const response = await fetch(`${BACKEND_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
        });

        const data = await response.json();

        if (!data.success) {
            console.error('Signup error:', data.error);
            showNotification(data.error || 'Failed to create account. Check if backend is running.');
            return;
        }

        closeLoginSignup();

        // Automatically log the user in after successful signup
        if (data.user) {
            const mockSession = { user: data.user };
            updateNavbarForSession(mockSession);

            localStorage.setItem('wirenestLoggedIn', 'true');
            localStorage.setItem('wirenestEmail', email);
            localStorage.setItem('wirenestName', data.user.user_metadata?.name || name);
            localStorage.setItem('wirenestId', data.user.id);

            showNotification('Account created and logged in successfully!');

            // Critical Sync Fix: Push local carts and fetch PostgreSQL UUIDs
            await loadCartFromStorage();
        } else {
            showNotification('Account created successfully! You can now log in.');
        }

        // Clear form fields
        document.getElementById('signupName').value = '';
        document.getElementById('signupEmail').value = '';
        document.getElementById('signupPassword').value = '';

    } catch (err) {
        console.error('Unexpected signup error:', err);
        showNotification('An unexpected error occurred during signup. Is the backend running?');
    }
}


// Toggle Profile Dropdown
window.toggleProfileDropdown = function () {
    const dropdown = document.getElementById('profileDropdown');
    const menu = document.getElementById('profileMenu');

    // Check if user is logged in
    if (currentUser || localStorage.getItem('wirenestLoggedIn') === 'true') {
        // User is logged in - show dropdown menu
        if (dropdown && menu) {
            dropdown.classList.toggle('show');
        }
    } else {
        // User is not logged in - open login/signup modal
        openLoginSignup();
    }
};

// Close dropdown when clicking outside
document.addEventListener('click', function (event) {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown && !dropdown.contains(event.target)) {
        dropdown.classList.remove('show');
    }
});

// Logout function - Local Authentication
window.handleLogout = async function () {
    try {
        // Clear UI state
        localStorage.removeItem("wirenestLoggedIn");
        localStorage.removeItem("wirenestEmail");
        localStorage.removeItem("wirenestName");
        localStorage.removeItem("wirenestAvatar");
        localStorage.removeItem("wirenestId");
        localStorage.removeItem("wirenestCart");

        // Fully clear the browser memory list
        cart = [];
        updateCartCount();
        renderCartItems();

        // Clear user session
        currentUser = null;
        currentSession = null;

        // Immediately update profile to show icon
        const profileAvatar = document.getElementById("profileAvatar");
        const profileDropdown = document.getElementById("profileDropdown");

        if (profileAvatar) {
            profileAvatar.classList.remove("logged-in");
            profileAvatar.innerHTML = `
                <span class="profile-letter" id="profileLetter"></span>
                <span class="profile-icon" id="profileIcon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                </span>
            `;
        }

        if (profileDropdown) {
            profileDropdown.classList.remove("show");
        }

        const navMyOrders = document.getElementById('navMyOrders');
        if (navMyOrders) navMyOrders.style.display = 'none';

        console.log("Logout successful - profile icon restored");
    } catch (err) {
        console.error("Logout failed", err);
    }
};

// Session restore function - Local Authentication
async function restoreSession() {
    try {
        console.log('Restoring session from localStorage...');

        // Check if user is logged in via localStorage
        const isLoggedIn = localStorage.getItem('wirenestLoggedIn') === 'true';
        const savedEmail = localStorage.getItem('wirenestEmail');
        const savedName = localStorage.getItem('wirenestName');

        if (isLoggedIn && savedEmail && savedName) {
            console.log('Found stored session, restoring...');

            // Create mock session from localStorage
            const mockUser = {
                id: localStorage.getItem('wirenestId') || 'local-user-restore',
                email: savedEmail,
                user_metadata: {
                    name: savedName
                }
            };

            const mockSession = {
                user: mockUser,
                access_token: 'local-token-restore'
            };

            currentUser = mockUser;
            currentSession = mockSession;

            console.log('Session restored successfully');
            updateNavbarForSession(mockSession);
        } else {
            console.log('No stored session found');
            updateNavbarForSession(null);
        }
    } catch (error) {
        console.error('Session restore error:', error);
        updateNavbarForSession(null);
    }
}

// Google login function - Backend Proxy
async function loginWithGoogle() {
    showNotification('Redirecting to Google login...');

    try {
        const response = await fetch(`${BACKEND_URL}/auth/google`);
        const data = await response.json();

        if (data.success && data.url) {
            // Redirect the user to the Google OAuth page generated by our backend
            window.location.href = data.url;
        } else {
            console.error('Google login error:', data.error);
            showNotification('Failed to connect to Google');
        }
    } catch (error) {
        console.error('Unexpected Google login error:', error);
        showNotification('Failed to connect to Google. Is the backend running?');
    }
}

// Update navbar based on session state
// Toggle profile menu
function toggleProfileMenu() {
    const menu = document.getElementById('profileMenu');
    if (menu) {
        const isVisible = menu.style.display !== 'none';
        menu.style.display = isVisible ? 'none' : 'block';
    }
}

// Close profile menu when clicking outside
document.addEventListener('click', function (event) {
    const menu = document.getElementById('profileMenu');
    const wrapper = document.querySelector('.profile-dropdown-wrapper');

    if (menu && wrapper && !wrapper.contains(event.target)) {
        menu.style.display = 'none';
    }
});

function updateNavbarForSession(session) {
    const profileDropdown = document.getElementById('profileDropdown');
    const profileAvatar = document.getElementById('profileAvatar');

    if (session?.user) {
        currentUser = session.user;
        currentSession = session;

        const email = session.user.email;
        const name =
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            email.split('@')[0];

        const avatarUrl =
            session.user.user_metadata?.avatar_url ||
            session.user.user_metadata?.picture ||
            localStorage.getItem('wirenestAvatar');

        if (profileDropdown) {
            profileDropdown.style.display = 'flex';

            const navMyOrders = document.getElementById('navMyOrders');
            if (navMyOrders) navMyOrders.style.display = 'block';

            if (profileAvatar) {
                profileAvatar.classList.add('logged-in');
            }

            const profileMenuName = document.getElementById('profileMenuName');
            const profileMenuEmail = document.getElementById('profileMenuEmail');

            if (profileMenuName) profileMenuName.textContent = name;
            if (profileMenuEmail) profileMenuEmail.textContent = email;

            const profileMenuAvatar = document.getElementById('profileMenuAvatar');

            // Strictly validate that it's a real URL and not a stringified "null" or "undefined"
            const isValidAvatar = avatarUrl &&
                typeof avatarUrl === 'string' &&
                avatarUrl.trim() !== '' &&
                avatarUrl !== 'null' &&
                avatarUrl !== 'undefined';

            const firstLetter = name.charAt(0).toUpperCase();

            // Build a clean fallback string for email users or broken images
            const fallbackHtml = `<span class='profile-letter' style='display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:white;font-weight:600;background:var(--primary-color);border-radius:50%;'>${firstLetter}</span>`;

            if (isValidAvatar) {
                // Safely escape the fallback string for the onerror attribute without nested quote conflicts
                const safeFallback = fallbackHtml.replace(/'/g, "\\'");

                // Only the image is rendered. If it fails (403/404), it replaces ITSELF completely with the fallback HTML.
                const imgHtml = `<img src="${avatarUrl}" alt="Profile" referrerpolicy="no-referrer" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.outerHTML='${safeFallback}'">`;

                profileAvatar.innerHTML = imgHtml;
                if (profileMenuAvatar) profileMenuAvatar.innerHTML = imgHtml;
            } else {
                profileAvatar.innerHTML = fallbackHtml;
                if (profileMenuAvatar) profileMenuAvatar.innerHTML = fallbackHtml;
            }
        }
    } else {
        currentUser = null;
        currentSession = null;

        if (profileDropdown) profileDropdown.style.display = 'flex';
        if (profileAvatar) {
            profileAvatar.classList.remove('logged-in');
            profileAvatar.innerHTML = `
                <span class="profile-icon" id="profileIcon" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path>
                    </svg>
                </span>
            `;
        }
    }
}

/* -------------------- NEWSLETTER -------------------- */

function handleNewsletter(event) {
    event.preventDefault();
    const email = event.target.querySelector('input[type="email"]').value;
    if (email) {
        showNotification('Thank you for subscribing!');
        event.target.reset();
    }
}

/* -------------------- CUSTOM SIZE -------------------- */

function selectCustomSize(size) {
    customizationSelections.size = size;

    document
        .querySelectorAll('#customSizeOptions .size-option-btn')
        .forEach(btn => btn.classList.remove('selected'));

    const activeBtn = document.querySelector(
        `#customSizeOptions button[onclick = "selectCustomSize('${size}')"]`
    );
    if (activeBtn) activeBtn.classList.add('selected');

    if (currentProduct) {
        const newPrice =
            customizationPriceConfig[currentProduct.blockType][size];
        document.getElementById(
            'modalProductPrice'
        ).textContent = `${currency.symbol}${newPrice} `;
    }

    document.getElementById('sizeError').style.display = 'none';
}

/* -------------------- CUSTOM COLOR -------------------- */

function toggleCustomColor(color) {
    const colorIndex = customizationSelections.colors.indexOf(color);

    const btn = document.querySelector(
        `#customColorOptions.${color} `
    );

    if (colorIndex > -1) {
        customizationSelections.colors.splice(colorIndex, 1);
        if (btn) btn.classList.remove('selected');
    } else {
        const limit = currentProduct?.max_colors || 3;
        if (customizationSelections.colors.length < limit) {
            customizationSelections.colors.push(color);
            if (btn) btn.classList.add('selected');
        } else {
            showNotification(`You can only select up to ${limit} colors for this product.`);
            return;
        }
    }

    updateSelectedColorsDisplay();

    if (customizationSelections.colors.length >= 1) {
        document.getElementById('colorError').style.display = 'none';
    }
}

/* -------------------- UPDATE SELECTED COLORS -------------------- */

function updateSelectedColorsDisplay() {
    const display = document.getElementById('selectedColorsDisplay');
    if (customizationSelections.colors.length === 0) {
        display.textContent = 'No colors selected';
    } else {
        display.textContent =
            'Selected: ' +
            customizationSelections.colors
                .map(color =>
                    color.charAt(0).toUpperCase() + color.slice(1)
                )
                .join(', ');
    }
}

/* -------------------- ADD NORMAL PRODUCT -------------------- */

async function addNormalToCart() {
    if (!currentProduct) {
        showNotification('No product selected.');
        return;
    }

    const quantityInput = document.getElementById('modalQuantity');
    const quantity = quantityInput ? parseInt(quantityInput.value) : 1;

    const existingItem = cart.find(item => item.productId === currentProduct.id && !item.isCustomized);

    if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.price = parseFloat(currentProduct.price) || 0;
        existingItem.name = currentProduct.name;
        existingItem.image = currentProduct.image;
    } else {
        const cartItem = {
            id: Date.now(),
            productId: currentProduct.id,
            name: currentProduct.name,
            price: currentProduct.price,
            quantity: quantity,
            image: currentProduct.image,
            isCustomized: false,
            size: currentProduct.size,
            colors: currentProduct.colors,
            blockType: currentProduct.blockType || 'normal'
        };
        cart.push(cartItem);
    }

    saveCartToStorage();
    updateCartCount();

    if (typeof currentUser !== 'undefined' && currentUser && currentUser.id && currentUser.id !== 'local-user-restore') {
        try {
            await fetch(`${BACKEND_URL}/cart/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    product_id: currentProduct.id,
                    product_type: currentProduct.blockType || 'normal',
                    quantity: quantity,
                    customization_choices: { size: currentProduct.size, colors: currentProduct.colors, price: currentProduct.price }
                })
            });
            await loadCartFromStorage(); // Sync the UUIDs from Postgres immediately
        } catch (e) { console.error("DB Cart Sync Error:", e); }
    }

    showNotification(`${currentProduct.name} added to cart!`);
    closeProductModal();
}

/* -------------------- ADD CUSTOM PRODUCT -------------------- */

async function addCustomizedToCart() {
    const sizeRadio = document.querySelector('input[name="customSize"]:checked');
    const selectedColorBtns = document.querySelectorAll('.color-swatch-btn.active');

    const requiredColors = currentProduct?.max_colors || 3;

    if (!sizeRadio) {
        showNotification('Please select a Size.');
        return;
    }

    if (selectedColorBtns.length !== requiredColors) {
        showNotification(`Please select exactly ${requiredColors} colors. You have selected ${selectedColorBtns.length}.`);
        return;
    }

    const selectedSize = sizeRadio.value;
    const selectedColors = Array.from(selectedColorBtns).map(btn => btn.getAttribute('data-color'));
    const finalPrice = parseFloat(sizeRadio.getAttribute('data-price')) || 0;
    const quantity = parseInt(document.getElementById('customModalQuantity').value) || 1;

    const cartItem = {
        id: Date.now(),
        productId: currentProduct.id,
        name: currentProduct.name,
        price: finalPrice,
        quantity: quantity,
        size: selectedSize,
        colors: selectedColors,
        image: currentProduct.image,
        isCustomized: true,
        blockType: currentProduct.blockType || 'customized'
    };

    cart.push(cartItem);
    saveCartToStorage();
    updateCartCount();

    if (typeof currentUser !== 'undefined' && currentUser && currentUser.id && currentUser.id !== 'local-user-restore') {
        try {
            await fetch(`${BACKEND_URL}/cart/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    product_id: currentProduct.id,
                    product_type: currentProduct.blockType || 'customized',
                    quantity: quantity,
                    customization_choices: { size: selectedSize, colors: selectedColors, price: finalPrice }
                })
            });
            await loadCartFromStorage(); // Sync the UUIDs from Postgres immediately
        } catch (e) { console.error("DB Cart Sync Error:", e); }
    }

    showNotification(`Customized ${currentProduct.name} added to cart!`);
    closeProductModal();
}

// Live calculation for Custom Price Map
function calculateCustomPrice() {
    const sizeRadio = document.querySelector('input[name="customSize"]:checked');
    const selectedColorBtns = document.querySelectorAll('.color-swatch-btn.active');
    const btn = document.getElementById('btnAddToCartCustom');
    const priceDiv = document.getElementById('dynamicCustomPrice');

    if (sizeRadio && selectedColorBtns.length > 0) {
        const price = sizeRadio.getAttribute('data-price');
        if (priceDiv) priceDiv.textContent = `₹${price}`;

        if (btn) {
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.disabled = false;
        }
    } else {
        if (priceDiv) priceDiv.textContent = 'Price: Missing Selection';

        if (btn) {
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            btn.disabled = true;
        }
    }
}

// Custom Color Swatch Toggle Logic
window.toggleCustomColorSwatch = function (btn, maxColors) {
    // If it's already active, just deactivate it
    if (btn.classList.contains('active')) {
        btn.classList.remove('active');
        btn.style.outline = 'none';
        calculateCustomPrice();
        return;
    }

    // Check how many are currently active
    const activeBtns = document.querySelectorAll('.color-swatch-btn.active');
    if (activeBtns.length >= maxColors) {
        showNotification(`You can only select up to ${maxColors} color(s).`);
        return; // Prevent selection if max capacity is reached
    }

    // Add active state
    btn.classList.add('active');
    btn.style.outline = '3px solid #3b82f6';
    calculateCustomPrice();
};

// Quantity Modifiers for Modal
window.increaseQuantity = function () {
    const qtyInput = document.getElementById('modalQuantity');
    if (qtyInput) {
        let currentVal = parseInt(qtyInput.value) || 1;
        qtyInput.value = currentVal + 1;
    }
};

window.decreaseQuantity = function () {
    const qtyInput = document.getElementById('modalQuantity');
    if (qtyInput) {
        let currentVal = parseInt(qtyInput.value) || 1;
        if (currentVal > 1) {
            qtyInput.value = currentVal - 1;
        }
    }
};

window.increaseCustomQuantity = function () {
    const qtyInput = document.getElementById('customModalQuantity');
    if (qtyInput) {
        let currentVal = parseInt(qtyInput.value) || 1;
        qtyInput.value = currentVal + 1;
    }
};

window.decreaseCustomQuantity = function () {
    const qtyInput = document.getElementById('customModalQuantity');
    if (qtyInput) {
        let currentVal = parseInt(qtyInput.value) || 1;
        if (currentVal > 1) {
            qtyInput.value = currentVal - 1;
        }
    }
};

/* -------------------- PRODUCT MODAL -------------------- */

function showProductModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    currentProduct = product;
    document.getElementById('modalProductName').textContent = product.name;

    // Purge the description for a cleaner customized UI aesthetic
    const descEl = document.querySelector('.product-details-description');
    if (descEl) descEl.textContent = '';

    const staticPriceEl = document.getElementById('modalProductPrice');
    if (staticPriceEl) staticPriceEl.style.display = 'none';

    const dynPriceEl = document.getElementById('dynamicCustomPrice');
    if (dynPriceEl) {
        dynPriceEl.style.display = 'block';
        dynPriceEl.textContent = 'Price: Select Size';
    }

    try {
        const opts = product.customization_options || {};
        const sizes = opts.sizes || {};
        const colors = opts.colors || ["red", "blue", "green", "yellow", "black", "white"];
        const maxColors = opts.max_colors ? parseInt(opts.max_colors) : 1;
        currentProduct.max_colors = maxColors;

        // Inject sizing tiers
        document.getElementById('customSizeOptions').innerHTML = Object.entries(sizes).map(([key, val]) => `
            <label class="custom-size-pill">
                <input type="radio" name="customSize" value="${key}" data-price="${val}" onchange="calculateCustomPrice()" style="display:none;">
                <span class="pill-text">${key.charAt(0).toUpperCase() + key.slice(1)} <br><small>+₹${val}</small></span>
            </label>
        `).join('');

        // Inject new Color Swatch Buttons
        let colorsArray = ["red", "blue", "green", "yellow", "black", "white"];
        if (colors && colors.length > 0) {
            if (Array.isArray(colors)) {
                colorsArray = colors;
            } else if (typeof colors === 'string') {
                try { colorsArray = JSON.parse(colors); }
                catch (e) { colorsArray = colors.split(',').map(s => s.trim()); }
            }
        }

        // Remove empty strings and spaces from parsing string splits
        colorsArray = colorsArray.filter(c => c && c.trim() !== '');

        if (colorsArray.length === 0) {
            colorsArray = ["red", "blue", "green", "yellow", "black", "white"];
        }
        document.getElementById('customColorOptions').innerHTML = colorsArray.map(col => `
            <button class="color-swatch-btn" data-color="${col}" onclick="toggleCustomColorSwatch(this, ${maxColors})" 
                style="
                background: ${col}; 
                width: 32px; height: 32px; 
                border-radius: 50%; 
                border: 2px solid #ddd; 
                cursor: pointer; 
                margin-right: 10px; 
                margin-bottom: 10px;
                transition: transform 0.2s, outline 0.2s;"
                title="${col.charAt(0).toUpperCase() + col.slice(1)}"
            ></button>
        `).join('');

        // Append limit descriptor
        document.getElementById('customColorOptions').innerHTML += `<p style="font-size:11px; color:#888; width: 100%; margin-top: 5px;">Max ${maxColors} color(s) allowed</p>`;

    } catch (e) {
        console.error('Customization Injection Error:', e);
    }

    const btn = document.getElementById('btnAddToCartCustom');
    if (btn) {
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
        btn.disabled = true;
    }

    document.getElementById('productDetailsView').style.display = 'none';
    document.getElementById('customizationSection').style.display = 'block';

    showImageGallery(product);
    document.getElementById('customModalQuantity').value = 1;

    // Show modal
    document.getElementById('productModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function showImageGallery(product) {
    console.log('Showing image gallery for product:', product.name);

    const modalImageContainer = document.getElementById('modalProductImageContainer');

    // Load actual product images uploaded from the admin panel
    let referenceImages = [];
    if (product.galleryImages && product.galleryImages.length > 0) {
        referenceImages = product.galleryImages.filter(img => img && img.trim() !== '');
    }

    // Fallback if gallery is completely empty
    if (referenceImages.length === 0) {
        referenceImages = [product.image || 'https://picsum.photos/150/150?random=100'];
    }

    const getImgSrc = (img) => img.startsWith('http') ? img : (img.startsWith('images') ? img : '../' + img);

    // Create gallery with main image + 3 reference thumbnails
    modalImageContainer.innerHTML = `
        <div class="product-gallery">
            <div class="main-image-container" style="border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); margin-bottom: 15px; background: #fff;">
                <img id="mainGalleryImage" src="${getImgSrc(product.image)}" alt="${product.name}" style="width: 100%; height: 350px; object-fit: contain; cursor: pointer; transition: transform 0.3s ease;">
            </div>
            <div class="gallery-thumbnails" style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 5px;">
                ${referenceImages.map((img, index) => `
                    <div class="thumbnail ${index === 0 ? 'active' : ''}" onclick="focusImage('${getImgSrc(img)}', ${index})" style="width: 70px; height: 70px; border-radius: 8px; border: 2px solid ${index === 0 ? 'var(--primary-color)' : 'transparent'}; cursor: pointer; overflow: hidden; flex-shrink: 0; transition: all 0.2s ease;">
                        <img src="${getImgSrc(img)}" alt="Reference image ${index + 1}" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                `).join('')}
            </div>
        </div >
    `;

    // Store gallery data for navigation
    window.currentGalleryImages = referenceImages;
    window.currentImageIndex = 0;
}

function focusImage(imageSrc, index) {
    console.log('Focusing on image:', imageSrc, 'index:', index);

    // Update main image
    const mainImage = document.getElementById('mainGalleryImage');
    if (mainImage) {
        mainImage.src = imageSrc;
        // Force image reload to ensure change
        mainImage.onload = function () {
            console.log('Main image updated to:', imageSrc);
        };
    }

    // Update active thumbnail
    const thumbnails = document.querySelectorAll('.thumbnail');
    thumbnails.forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });

    // Update current index
    window.currentImageIndex = index;
}

function navigateGallery(direction) {
    const images = window.currentGalleryImages;
    if (!images || images.length === 0) return;

    let newIndex = window.currentImageIndex + direction;

    // Wrap around
    if (newIndex < 0) newIndex = images.length - 1;
    if (newIndex >= images.length) newIndex = 0;

    focusImage(images[newIndex], newIndex);
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
    document.body.style.overflow = 'auto';

    // Reset price views back to default
    const staticPriceEl = document.getElementById('modalProductPrice');
    if (staticPriceEl) staticPriceEl.style.display = 'block';

    const dynPriceEl = document.getElementById('dynamicCustomPrice');
    if (dynPriceEl) dynPriceEl.style.display = 'none';

    // Hide customization view if it exists
    const customizationView = document.getElementById('customizationProductView');
    if (customizationView) {
        customizationView.style.display = 'none';
    }

    // Show product details view
    const productDetailsView = document.getElementById('productDetailsView');
    if (productDetailsView) {
        productDetailsView.style.display = 'block';
    }
}

// --- SIZE GUIDE SYSTEM ---
function openSizeGuide() {
    const modal = document.getElementById('sizeGuideModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeSizeGuide() {
    const modal = document.getElementById('sizeGuideModal');
    if (modal) {
        modal.classList.remove('active');
        // Do not restore body overflow if the product modal is still open behind it
        const productModal = document.getElementById('productModal');
        if (!productModal || !productModal.classList.contains('active')) {
            document.body.style.overflow = 'auto';
        }
    }
}

/* -------------------- STORAGE -------------------- */

function saveCartToStorage() {
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.id && currentUser.id !== 'local-user-restore') {
        localStorage.removeItem('wirenestCart');
    } else {
        localStorage.setItem('wirenestCart', JSON.stringify(cart));
    }
}

async function loadCartFromStorage() {
    const stored = localStorage.getItem('wirenestCart');
    let localCart = [];
    if (stored) {
        try { localCart = JSON.parse(stored); } catch (e) { localCart = []; }
    }

    if (typeof currentUser !== 'undefined' && currentUser && currentUser.id && currentUser.id !== 'local-user-restore') {
        // Sync any un-uploaded guest cart items to the database
        if (localCart.length > 0) {
            for (let item of localCart) {
                // Skip if item.id is already a UUID (from a previous DB load)
                if (typeof item.id === 'string' && item.id.length > 20) continue;
                try {
                    await fetch(`${BACKEND_URL}/cart/add`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_id: currentUser.id,
                            product_id: item.productId,
                            product_type: item.blockType || (item.isCustomized ? 'customized' : 'normal'),
                            quantity: item.quantity || 1,
                            customization_choices: { size: item.size, colors: item.colors, price: item.price || 0 }
                        })
                    });
                } catch (e) { console.error("Guest cart DB upload failed:", e); }
            }
            // Clear the local cart so we don't re-upload endlessly
            localStorage.removeItem('wirenestCart');
            localCart = [];
        }

        try {
            const res = await fetch(`${BACKEND_URL}/cart/${currentUser.id}`);
            const json = await res.json();
            if (json.success && json.data) {
                cart = json.data.map(dbItem => ({
                    id: dbItem.id, // DB UUID
                    productId: dbItem.product_id,
                    name: 'Product from DB',
                    price: dbItem.customization_choices?.price || 0,
                    quantity: dbItem.quantity,
                    isCustomized: dbItem.product_type === 'customized',
                    size: dbItem.customization_choices?.size || '',
                    colors: dbItem.customization_choices?.colors || [],
                    blockType: dbItem.product_type
                }));

                cart.forEach(cartItem => {
                    const liveProd = products.find(p => p.id === cartItem.productId);
                    if (liveProd) {
                        cartItem.name = liveProd.name;
                        cartItem.image = liveProd.image;
                        // Force update to the Live Admin Catalog Price
                        if (cartItem.isCustomized && typeof liveProd.customization_options?.sizes === 'object') {
                            const sizeKeys = Object.keys(liveProd.customization_options.sizes);
                            const matchingKey = sizeKeys.find(key => key.toLowerCase().includes(String(cartItem.size).toLowerCase())) || sizeKeys[0];
                            cartItem.price = parseFloat(liveProd.customization_options.sizes[matchingKey]) || cartItem.price || 0;
                        } else {
                            cartItem.price = parseFloat(liveProd.price) || 0;
                        }
                    }
                });

                updateCartCount();
                renderCartItems();
                return;
            }
        } catch (e) {
            console.error("Failed to load DB cart:", e);
        }
    }

    // Fallback if not logged in
    cart = localCart;
    updateCartCount();
    renderCartItems();
}

/* -------------------- NOTIFICATION -------------------- */

function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #3b82f6;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 9999;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// ==========================================
// USER ORDERS TRACKING
// ==========================================
function openUserOrders() {
    // Attempt to close dropdown if it's open
    const dropdown = document.getElementById('profileMenu');
    if (dropdown && dropdown.classList.contains('show')) {
        toggleProfileDropdown();
    }

    document.getElementById('userOrdersModal').classList.add('active');
    document.getElementById('userOrdersOverlay').style.display = 'block';
    loadUserOrders();
}

function closeUserOrders() {
    document.getElementById('userOrdersModal').classList.remove('active');
    setTimeout(() => {
        document.getElementById('userOrdersOverlay').style.display = 'none';
    }, 300);
}

async function loadUserOrders() {
    const list = document.getElementById('userOrdersList');
    if (!currentUser || !currentUser.id || currentUser.id === 'local-user-restore') {
        list.innerHTML = '<div style="text-align:center; padding: 20px; color: #6b7280;">Please sign in to view your past orders.</div>';
        return;
    }

    list.innerHTML = '<div style="text-align:center; padding: 20px;">Fetching your orders...</div>';

    try {
        const res = await fetch(`${BACKEND_URL}/orders/user/${currentUser.id}`);
        const data = await res.json();

        if (data.success && data.orders && data.orders.length > 0) {
            list.innerHTML = data.orders.map(order => {
                let statusColor = '#f59e0b'; // pending yellow
                let statusText = 'Pending Approval';

                if (order.status === 'processing') { statusColor = '#10b981'; statusText = 'Payment Successful'; }
                else if (order.status === 'shipped') { statusColor = '#3b82f6'; statusText = 'Shipped'; }
                else if (order.status === 'delivered') { statusColor = '#10b981'; statusText = 'Delivered'; }
                else if (order.status === 'rejected' || order.status === 'cancelled') { statusColor = '#ef4444'; statusText = 'Cancelled'; }

                const itemsCount = (order.order_items || []).reduce((acc, i) => acc + i.quantity, 0);
                const date = order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Recent';

                return `
                    <div class="cart-item" onclick='openOrderDetails(${JSON.stringify(order).replace(/'/g, "&#39;")})' style="cursor: pointer; padding: 12px; border: 1px solid rgba(226, 232, 240, 0.8); border-radius: var(--radius-md); transition: all var(--transition-base); margin-bottom: 16px;" onmouseover="this.style.boxShadow='0 4px 12px rgba(10,25,49,0.08)'; this.style.transform='translateY(-2px)';" onmouseout="this.style.boxShadow='none'; this.style.transform='translateY(0)';">
                        <div class="cart-item-image" style="display: flex; align-items: center; justify-content: center; font-size: 28px;">📦</div>
                        <div class="cart-item-details">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <div class="cart-item-title">Order #${order.id.split('-')[0]}</div>
                                <span style="background: ${statusColor}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${statusText}</span>
                            </div>
                            <div style="color: var(--text-secondary); font-size: 13px; margin-bottom: 4px; display: flex; justify-content: space-between;">
                                <span>Placed On:</span> 
                                <span style="color: var(--text-primary); font-weight: 500;">${date}</span>
                            </div>
                            <div style="color: var(--text-secondary); font-size: 13px; margin-bottom: 12px; display: flex; justify-content: space-between;">
                                <span>Items Included:</span> 
                                <span style="color: var(--text-primary); font-weight: 500;">${itemsCount}</span>
                            </div>
                            <div style="border-top: 1px solid rgba(226, 232, 240, 0.8); padding-top: 10px; display: flex; justify-content: space-between;">
                                <span style="font-weight: 600; color: var(--text-primary);">Total Amount:</span>
                                <span class="cart-item-price">₹${parseFloat(order.total_amount).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            list.innerHTML = `
                <div style="text-align:center; padding: 40px 20px; color: #6b7280;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 15px auto; opacity: 0.5;">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <p>You haven't placed any orders yet.</p>
                </div>
            `;
        }
    } catch (e) {
        console.error("Error loading user orders:", e);
        list.innerHTML = '<div style="text-align:center; padding: 20px; color: #ef4444;">Failed to sync order history.</div>';
    }
}

// ==========================================
// ORDER DETAILS MODAL
// ==========================================
function openOrderDetails(order) {
    const modal = document.getElementById('orderDetailsModal');
    const overlay = document.getElementById('orderDetailsOverlay');
    const content = document.getElementById('orderDetailsContent');

    if (!modal || !overlay || !content) return;

    let statusColor = '#f59e0b';
    let statusText = 'Pending Approval';
    if (order.status === 'processing') { statusColor = '#10b981'; statusText = 'Payment Successful'; }
    else if (order.status === 'shipped') { statusColor = '#3b82f6'; statusText = 'Shipped'; }
    else if (order.status === 'delivered') { statusColor = '#10b981'; statusText = 'Delivered'; }
    else if (order.status === 'rejected' || order.status === 'cancelled') { statusColor = '#ef4444'; statusText = 'Cancelled'; }

    const date = order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A';
    const address = order.shipping_address ?
        `${order.shipping_address.name}<br>${order.shipping_address.address}, ${order.shipping_address.city} - ${order.shipping_address.pincode}` : 'No Address Provided';

    let itemsHtml = order.order_items && order.order_items.length > 0 ?
        order.order_items.map(item => {
            const productTypeBadge = item.product_type === 'customized'
                ? '<span style="background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase;">Customized</span>'
                : '<span style="background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase;">Normal</span>';

            let specs = '';
            if (item.customization_choices) {
                if (item.customization_choices.colors) {
                    specs += `Color: ${Array.isArray(item.customization_choices.colors) ? item.customization_choices.colors.join(', ') : item.customization_choices.colors} <br>`;
                }
                if (item.customization_choices.size) {
                    specs += `Size: ${item.customization_choices.size}`;
                }
            }

            const absoluteImageUrl = item.product_image && !item.product_image.startsWith('http')
                ? `${BACKEND_URL}${item.product_image}`
                : item.product_image;

            return `
                <div class="ordered-item-card">
                    <div class="ordered-img-container">
                        <img src="${absoluteImageUrl || 'https://via.placeholder.com/80?text=Product'}" onerror="this.src='https://via.placeholder.com/80?text=Box'" alt="Product Image">
                    </div>
                    <div class="ordered-item-info">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <h4>Product ID: ${item.product_id.substring(0, 8)}</h4>
                            ${productTypeBadge}
                        </div>
                        <div class="ordered-spec" style="margin-top: 4px;">${specs}</div>
                        <div class="ordered-price-row">
                            <span style="color: #64748b; font-weight: 500;">Qty: ${item.quantity}</span>
                            <span style="color: var(--primary-color);">₹${(item.price_at_purchase * item.quantity).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('') : '<p style="color: #64748b;">No item details available.</p>';

    content.innerHTML = `
        <div class="order-info-grid">
            <div class="info-item">
                <span class="info-label">Order Number</span>
                <span class="info-value">#${order.id.split('-')[0]}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Date Placed</span>
                <span class="info-value">${date}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Status</span>
                <span class="info-value" style="color: ${statusColor}; font-weight: bold;">${statusText}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Total Amount</span>
                <span class="info-value" style="color: var(--primary-color); font-weight: bold;">₹${parseFloat(order.total_amount).toFixed(2)}</span>
            </div>
            <div class="info-item" style="grid-column: span 2;">
                <span class="info-label">Shipping Address</span>
                <span class="info-value" style="font-size: 13px; line-height: 1.4;">${address}</span>
            </div>
        </div>
        
        <h4 style="margin-bottom: 12px; color: var(--text-primary); border-bottom: 1px solid #eee; padding-bottom: 8px;">Items in this Order</h4>
        <div class="ordered-items-list">
            ${itemsHtml}
        </div>
    `;

    overlay.style.display = 'block';
    // Slight delay to allow display:block to render before transitioning opacity
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

function closeOrderDetails() {
    const modal = document.getElementById('orderDetailsModal');
    const overlay = document.getElementById('orderDetailsOverlay');
    if (modal) modal.classList.remove('active');

    setTimeout(() => {
        if (overlay) overlay.style.display = 'none';
    }, 300); // Wait for CSS transition
}

// ==========================================
// WISHLIST FUNCTIONALITY
// ==========================================

async function toggleWishlist(productId, blockType, btnElement) {
    if (!currentUser || !currentUser.id || currentUser.id === 'local-user-restore') {
        showNotification('Please log in to save items to your Wishlist!', 'error');
        openLoginSignup();
        return;
    }

    const isCurrentlySaved = btnElement.classList.contains('active');

    try {
        if (!isCurrentlySaved) {
            // Add to database
            const res = await fetch(`${BACKEND_URL}/wishlist/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    product_id: productId,
                    product_type: blockType
                })
            });
            const data = await res.json();
            
            if (data.success) {
                btnElement.classList.add('active');
                showNotification('✨ Saved to your Wishlist!');
            } else {
                showNotification('Failed to save to Wishlist.', 'error');
            }
        } else {
            // Remove from database
            const res = await fetch(`${BACKEND_URL}/wishlist/remove`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    product_id: productId
                })
            });
            const data = await res.json();

            if (data.success) {
                btnElement.classList.remove('active');
                showNotification('Removed from your Wishlist.');
            } else {
                showNotification('Failed to remove from Wishlist.', 'error');
            }
        }
    } catch (err) {
        console.error('Wishlist Toggle Error:', err);
        showNotification('An error occurred connecting to your Wishlist.', 'error');
    }
}

async function openWishlistModal() {
    if (!currentUser || !currentUser.id || currentUser.id === 'local-user-restore') {
        showNotification('Please log in to view your Wishlist!');
        openLoginSignup();
        return;
    }

    const modal = document.getElementById('wishlistModal');
    const overlay = document.getElementById('cartOverlay'); 
    const content = document.getElementById('wishlistContent');

    if (!modal || !overlay || !content) return;

    content.innerHTML = '<div class="loading-spinner" style="padding: 20px; text-align: center;">Loading your wishlist...</div>';
    
    // Open sidebar immediately to look responsive
    overlay.style.display = 'block';
    setTimeout(() => { modal.classList.add('active'); }, 10);

    try {
        const res = await fetch(`${BACKEND_URL}/wishlist/user/${currentUser.id}`);
        const data = await res.json();

        if (data.success && data.data.length > 0) {
            content.innerHTML = '<div class="ordered-items-list" style="padding: 15px;">' + data.data.map(item => {
                // Find the live product details from the actively loaded browser array
                const liveProduct = (item.product_type === 'customized' && typeof customizationProducts !== 'undefined') 
                    ? customizationProducts.find(p => p.id === item.product_id) 
                    : products.find(p => p.id === item.product_id);
                    
                if (!liveProduct) return '';

                const absoluteImage = liveProduct.image && !liveProduct.image.startsWith('http') 
                    ? (liveProduct.image.startsWith('images') ? liveProduct.image : `../${liveProduct.image}`) 
                    : liveProduct.image;

                return `
                    <div class="cart-item">
                        <img src="${absoluteImage || 'https://via.placeholder.com/80'}" alt="${liveProduct.name}" class="cart-item-image">
                        <div class="cart-item-details">
                            <div class="cart-item-title">${liveProduct.name}</div>
                            <div class="cart-item-price" style="margin-top: 5px;">₹${liveProduct.price || 0}</div>
                            <div style="margin-top: 10px;">
                                <button class="btn-secondary" style="padding: 6px 12px; font-size: 13px;" onclick="showProductModal('${liveProduct.id}'); closeWishlistModal();">View Details</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('') + '</div>';
        } else {
            content.innerHTML = '<div style="padding: 30px; text-align: center; color: #64748b;">Your wishlist is empty.<br><br>Click the ❤️ icon on any basket to save it for later!</div>';
        }
    } catch (err) {
        console.error('Fetch Wishlist Error:', err);
        content.innerHTML = '<div style="color: red; padding: 20px;">Failed to load wishlist.</div>';
    }
}

function closeWishlistModal() {
    const modal = document.getElementById('wishlistModal');
    const overlay = document.getElementById('cartOverlay');
    if (modal) modal.classList.remove('active');
    setTimeout(() => { if (overlay) overlay.style.display = 'none'; }, 300);
}

// Persist the red hearts accurately across page refreshes
async function fetchUserWishlistState() {
    if (!currentUser || !currentUser.id || currentUser.id === 'local-user-restore') return;
    try {
        const res = await fetch(`${BACKEND_URL}/wishlist/user/${currentUser.id}`);
        const data = await res.json();
        
        if (data.success && data.data) {
            data.data.forEach(item => {
                // Find any heart button whose onclick event mentions the specifically saved productId
                const heartButtons = document.querySelectorAll(`.wishlist-btn[onclick*="'${item.product_id}'"]`);
                heartButtons.forEach(btn => btn.classList.add('active'));
            });
        }
    } catch (error) {
        console.error("Failed to sync Wishlist State on load:", error);
    }
}

// --- LIVE REVIEWS SYSTEM ---

function setupStarRating() {
    const stars = document.querySelectorAll('#starRatingInput span');
    const ratingInput = document.getElementById('reviewRatingInput');
    if (!ratingInput) return; // Prevent crash if element missing

    stars.forEach(star => {
        star.addEventListener('click', function() {
            const val = parseInt(this.getAttribute('data-val'));
            ratingInput.value = val;
            
            // Highlight stars
            stars.forEach(s => {
                if (parseInt(s.getAttribute('data-val')) <= val) {
                    s.style.color = '#f59e0b'; // Gold
                } else {
                    s.style.color = '#ccc'; // Gray
                }
            });
        });
        
        // Optional hover effect
        star.addEventListener('mouseover', function() {
            const val = parseInt(this.getAttribute('data-val'));
            stars.forEach(s => {
                if (parseInt(s.getAttribute('data-val')) <= val) {
                    s.style.color = '#fcd34d'; // Light Gold
                } else {
                    s.style.color = '#ccc';
                }
            });
        });
        
        star.addEventListener('mouseout', function() {
            const currentVal = parseInt(ratingInput.value) || 0;
            stars.forEach(s => {
                if (parseInt(s.getAttribute('data-val')) <= currentVal) {
                    s.style.color = '#f59e0b'; // Gold
                } else {
                    s.style.color = '#ccc';
                }
            });
        });
    });
}

