/* ── BloomCart - Flower Shop Frontend ── */

// State
let flowers = [];
let cart = [];
let currentCategory = 'all';

// DOM Elements
const flowerGrid = document.getElementById('flowerGrid');
const cartToggle = document.getElementById('cartToggle');
const cartSidebar = document.getElementById('cartSidebar');
const cartOverlay = document.getElementById('cartOverlay');
const cartClose = document.getElementById('cartClose');
const cartItems = document.getElementById('cartItems');
const cartEmpty = document.getElementById('cartEmpty');
const cartFooter = document.getElementById('cartFooter');
const cartCount = document.getElementById('cartCount');
const cartTotal = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const clearCartBtn = document.getElementById('clearCartBtn');
const startShopping = document.getElementById('startShopping');
const checkoutModal = document.getElementById('checkoutModal');
const checkoutForm = document.getElementById('checkoutForm');
const modalClose = document.getElementById('modalClose');
const confirmationModal = document.getElementById('confirmationModal');
const confirmationMessage = document.getElementById('confirmationMessage');
const confirmationClose = document.getElementById('confirmationClose');
const contactForm = document.getElementById('contactForm');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const orderSummary = document.getElementById('orderSummary');

// ── Initialize ──
document.addEventListener('DOMContentLoaded', () => {
  loadFlowers();
  setupFilterButtons();
  setupCartEvents();
  setupCheckout();
  setupContactForm();
  setMinDeliveryDate();
});

// ── Load Flowers ──
async function loadFlowers(category = 'all') {
  const url = category === 'all' ? '/api/flowers' : `/api/flowers?category=${category}`;
  try {
    const res = await fetch(url);
    flowers = await res.json();
    renderFlowers();
  } catch {
    flowerGrid.innerHTML = '<p style="text-align:center;color:#999;grid-column:1/-1;">Unable to load flowers. Please refresh the page.</p>';
  }
}

// ── Render Flowers ──
function renderFlowers() {
  if (flowers.length === 0) {
    flowerGrid.innerHTML = '<p style="text-align:center;color:#999;grid-column:1/-1;">No flowers found in this category.</p>';
    return;
  }

  flowerGrid.innerHTML = flowers.map(flower => `
    <div class="flower-card" data-id="${flower.id}">
      <div class="flower-image-wrapper">
        <img class="flower-image" src="${esc(flower.image)}" alt="${esc(flower.name)}" loading="lazy"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 260%22><rect fill=%22%23fce4ec%22 width=%22400%22 height=%22260%22/><text x=%22200%22 y=%22130%22 text-anchor=%22middle%22 font-size=%2260%22>&#127801;</text></svg>'">
        <span class="flower-category-tag">${esc(flower.category)}</span>
      </div>
      <div class="flower-info">
        <h3 class="flower-name">${esc(flower.name)}</h3>
        <p class="flower-description">${esc(flower.description)}</p>
        <div class="flower-bottom">
          <span class="flower-price">$${flower.price.toFixed(2)}</span>
          <button class="add-to-cart-btn" onclick="addToCart(${flower.id})">Add to Cart</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ── Category Filters ──
function setupFilterButtons() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category;
      loadFlowers(currentCategory);
    });
  });
}

// ── Cart Events ──
function setupCartEvents() {
  cartToggle.addEventListener('click', openCart);
  cartClose.addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', closeCart);
  startShopping.addEventListener('click', closeCart);
  clearCartBtn.addEventListener('click', clearCart);
}

function openCart() {
  cartSidebar.classList.add('active');
  cartOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  cartSidebar.classList.remove('active');
  cartOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

// ── Add to Cart ──
async function addToCart(flowerId) {
  try {
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: flowerId, quantity: 1 })
    });
    const data = await res.json();
    cart = data.cart;
    updateCartUI();
    showToast('Added to cart!');
  } catch {
    showToast('Failed to add item');
  }
}

// ── Remove from Cart ──
async function removeFromCart(flowerId) {
  try {
    const res = await fetch(`/api/cart/${flowerId}`, { method: 'DELETE' });
    const data = await res.json();
    cart = data.cart;
    updateCartUI();
  } catch {
    showToast('Failed to remove item');
  }
}

// ── Update Quantity ──
async function updateQuantity(flowerId, delta) {
  const item = cart.find(i => i.id === flowerId);
  if (!item) return;

  const newQty = item.quantity + delta;
  if (newQty <= 0) {
    removeFromCart(flowerId);
    return;
  }

  // Remove and re-add with correct quantity
  await fetch(`/api/cart/${flowerId}`, { method: 'DELETE' });
  const res = await fetch('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: flowerId, quantity: newQty })
  });
  const data = await res.json();
  cart = data.cart;
  updateCartUI();
}

// ── Clear Cart ──
async function clearCart() {
  try {
    await fetch('/api/cart/clear', { method: 'POST' });
    cart = [];
    updateCartUI();
    showToast('Cart cleared');
  } catch {
    showToast('Failed to clear cart');
  }
}

// ── Update Cart UI ──
function updateCartUI() {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  cartCount.textContent = totalItems;

  if (cart.length === 0) {
    cartItems.innerHTML = `
      <div class="cart-empty" id="cartEmpty">
        <span class="cart-empty-icon">&#127801;</span>
        <p>Your cart is empty</p>
        <a href="#shop" class="btn btn-secondary" onclick="closeCart()">Start Shopping</a>
      </div>
    `;
    cartFooter.style.display = 'none';
  } else {
    cartItems.innerHTML = cart.map(item => `
      <div class="cart-item">
        <img class="cart-item-image" src="${esc(item.image)}" alt="${esc(item.name)}"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 70 70%22><rect fill=%22%23fce4ec%22 width=%2270%22 height=%2270%22/><text x=%2235%22 y=%2240%22 text-anchor=%22middle%22 font-size=%2220%22>&#127801;</text></svg>'">
        <div class="cart-item-details">
          <div class="cart-item-name">${esc(item.name)}</div>
          <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
          <div class="cart-item-quantity">
            <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
            <span class="qty-value">${item.quantity}</span>
            <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
          </div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${item.id})">&times;</button>
      </div>
    `).join('');
    cartFooter.style.display = 'block';
  }

  cartTotal.textContent = `$${totalPrice.toFixed(2)}`;
}

// ── Checkout ──
function setupCheckout() {
  checkoutBtn.addEventListener('click', () => {
    closeCart();
    openCheckoutModal();
  });

  modalClose.addEventListener('click', () => {
    checkoutModal.classList.remove('active');
  });

  checkoutModal.addEventListener('click', (e) => {
    if (e.target === checkoutModal) checkoutModal.classList.remove('active');
  });

  checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await placeOrder();
  });

  confirmationClose.addEventListener('click', () => {
    confirmationModal.classList.remove('active');
  });

  confirmationModal.addEventListener('click', (e) => {
    if (e.target === confirmationModal) confirmationModal.classList.remove('active');
  });
}

function openCheckoutModal() {
  // Build order summary
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  orderSummary.innerHTML = `
    ${cart.map(item => `
      <div class="order-summary-item">
        <span>${esc(item.name)} x${item.quantity}</span>
        <span>$${(item.price * item.quantity).toFixed(2)}</span>
      </div>
    `).join('')}
    <div class="order-summary-total">
      <span>Total</span>
      <span>$${totalPrice.toFixed(2)}</span>
    </div>
  `;
  checkoutModal.classList.add('active');
}

async function placeOrder() {
  const name = document.getElementById('customerName').value;

  try {
    const res = await fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await res.json();

    checkoutModal.classList.remove('active');
    checkoutForm.reset();

    // Show confirmation
    confirmationMessage.textContent = data.message + ` Your total was $${data.total.toFixed(2)}.`;
    confirmationModal.classList.add('active');

    cart = [];
    updateCartUI();
  } catch {
    showToast('Failed to place order. Please try again.');
  }
}

// ── Contact Form ──
function setupContactForm() {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('Message sent! We\'ll get back to you soon.');
    contactForm.reset();
  });
}

// ── Set Min Delivery Date ──
function setMinDeliveryDate() {
  const dateInput = document.getElementById('deliveryDate');
  if (dateInput) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().split('T')[0];
  }
}

// ── Toast Notification ──
function showToast(message) {
  toastMessage.textContent = message;
  toast.classList.add('active');
  setTimeout(() => toast.classList.remove('active'), 3000);
}

// ── HTML Escape Helper ──
function esc(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}
