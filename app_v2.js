// Configuración de n8n (Webhooks)
const N8N_BASE_URL = 'https://brl-labs-n8n.oiwlwu.easypanel.host/webhook';

// Mapeo de imágenes para el menú
const IMAGES = {
  'Pizza peperoni': 'https://beeral.com.mx/wp-content/uploads/2026/07/Pizza-peperoni.png',
  'Cheese stix': 'https://beeral.com.mx/wp-content/uploads/2026/07/Cheese-stix.png',
  'Tacos al pastor': 'https://beeral.com.mx/wp-content/uploads/2026/07/Tacos-al-pastor.png',
  'Guacamole con totopos': 'https://beeral.com.mx/wp-content/uploads/2026/07/Guacamole-con-totopos.png',
  'Hamburguesa clasica': 'https://beeral.com.mx/wp-content/uploads/2026/07/Hamburguesa-clasica.png',
  'Alitas BBQ': 'https://beeral.com.mx/wp-content/uploads/2026/07/Alitas-BBQ.png',
  'Margarita clasica': 'https://beeral.com.mx/wp-content/uploads/2026/07/Margarita-clasica.png',
  'Agua de horchata': 'https://beeral.com.mx/wp-content/uploads/2026/07/Agua-de-horchata.png',
  'Flan napolitano': 'https://beeral.com.mx/wp-content/uploads/2026/07/Flan-napolitano.png',
  'Brownie con helado': 'https://beeral.com.mx/wp-content/uploads/2026/07/Brownie-con-helado.png'
};

const MENU_LOCAL = [
  { id: 1, Nombre: 'Tacos al pastor', Precio: 25, Categoria: { value: 'Platillos' } },
  { id: 2, Nombre: 'Pizza peperoni', Precio: 150, Categoria: { value: 'Platillos' } },
  { id: 3, Nombre: 'Cheese stix', Precio: 80, Categoria: { value: 'Entradas' } },
  { id: 4, Nombre: 'Hamburguesa clasica', Precio: 120, Categoria: { value: 'Platillos' } },
  { id: 5, Nombre: 'Agua de horchata', Precio: 35, Categoria: { value: 'Bebidas' } }
];

let state = {
  productos: MENU_LOCAL,
  carrito: [],
  filtro: 'todas',
  wa_id: '',
  telefono: ''
};

function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  state.wa_id = params.get('wa_id') || 'demo_wa';
  state.telefono = params.get('phone') || '5212291461844';
}

function getCategoria(p) {
  return p.Categoria && p.Categoria.value ? p.Categoria.value : '';
}

function renderProductos() {
  const grid = document.getElementById('productos-grid');
  if (!grid) return;

  const filtrados = state.filtro === 'todas' ? state.productos : state.productos.filter(p => getCategoria(p) === state.filtro);

  if (filtrados.length === 0) {
    grid.innerHTML = '<div class="empty-state"><h3>Sin productos</h3><p>No hay productos en esta categoría</p></div>';
    return;
  }

  grid.innerHTML = filtrados.map(p => {
    const cat = getCategoria(p);
    const imgUrl = IMAGES[p.Nombre] || '';
    const precio = p.Precio ? '$' + p.Precio : '$0';
    const id = p.id;
    const enCarrito = state.carrito.find(c => c.id === id);
    const btnText = enCarrito ? '✓ En Carrito' : 'Agregar';
    const badge = cat !== 'todas' ? '<span class="prod-badge">' + cat + '</span>' : '';

    return '<div class="producto-card">' +
      '<div class="prod-img-wrapper">' +
      '<img class="prod-img" src="' + imgUrl + '" alt="' + p.Nombre + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
      '<div class="prod-img-fallback"' + (imgUrl ? ' style="display:none"' : '') + '>' + (cat === 'Entradas' ? '🥗' : cat === 'Platillos' ? '🍕' : cat === 'Bebidas' ? '🥤' : '🍰') + '</div>' +
      badge +
      '</div>' +
      '<div class="producto-info">' +
      '<div class="producto-nombre">' + p.Nombre + '</div>' +
      '<div class="producto-footer">' +
      '<span class="producto-precio">' + precio + '</span>' +
      '<button class="btn-add" data-id="' + id + '">' + btnText + '</button>' +
      '</div></div></div>';
  }).join('');

  grid.querySelectorAll('.btn-add').forEach(btn => {
    btn.addEventListener('click', () => { addToCart(parseInt(btn.dataset.id), btn); });
  });
}

// 2. Agregar al Carrito (INSTANTÁNEO Y LOCAL: Ya no satura con peticiones innecesarias)
function addToCart(id, btnElement) {
  const prod = state.productos.find(p => p.id === id);
  if (!prod) return;

  const existe = state.carrito.find(c => c.id === id);
  if (existe) {
    existe.cantidad += 1;
  } else {
    state.carrito.push({ 
      id: prod.id, 
      nombre: prod.Nombre, 
      precio: parseInt(prod.Precio) || 0, 
      cantidad: 1 
    });
  }

  updateCartUI();
  btnElement.textContent = '✓ Agregado';
  setTimeout(() => {
    renderProductos();
  }, 800);
}

function removeFromCart(id) {
  state.carrito = state.carrito.filter(c => c.id !== id);
  updateCartUI();
  renderProductos();
}

function updateQuantity(id, delta) {
  const item = state.carrito.find(c => c.id === id);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) { removeFromCart(id); return; }
  updateCartUI();
  renderCartModal();
}

function getTotal() {
  return state.carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
}

function updateCartUI() {
  const count = state.carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const fab = document.getElementById('cart-fab');
  const countEl = document.getElementById('cart-count');
  if (fab && countEl) {
    if (count > 0) {
      fab.classList.remove('hidden');
      countEl.textContent = count;
    } else {
      fab.classList.add('hidden');
    }
  }
}

function renderCartModal() {
  const container = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  const confirmBtn = document.getElementById('confirm-order');
  if (!container) return;

  if (state.carrito.length === 0) {
    container.innerHTML = '<div class="empty-cart"><span class="empty-icon">🛒</span><p>Tu carrito está vacío</p></div>';
    if (totalEl) totalEl.textContent = '$0';
    if (confirmBtn) confirmBtn.disabled = true;
    return;
  }

  container.innerHTML = state.carrito.map(item => {
    return '<div class="cart-item">' +
      '<div class="cart-item-info">' +
      '<div class="cart-item-name">' + item.nombre + '</div>' +
      '<div class="cart-item-price">$' + (item.precio * item.cantidad) + '</div>' +
      '</div>' +
      '<div class="cart-item-qty">' +
      '<button class="qty-btn" data-id="' + item.id + '" data-delta="-1">−</button>' +
      '<span>' + item.cantidad + '</span>' +
      '<button class="qty-btn" data-id="' + item.id + '" data-delta="1">+</button>' +
      '</div></div>';
  }).join('');

  if (totalEl) totalEl.textContent = '$' + getTotal();
  if (confirmBtn) confirmBtn.disabled = false;

  container.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      updateQuantity(parseInt(btn.dataset.id), parseInt(btn.dataset.delta));
    });
  });
}

function openCart() {
  const modal = document.getElementById('cart-modal');
  if (modal) modal.classList.remove('hidden');
  renderCartModal();
}

function closeCart() {
  const modal = document.getElementById('cart-modal');
  if (modal) modal.classList.add('hidden');
}

// 3. Confirmar Pedido Final (Envía TODO el pedido consolidado a n8n)
async function confirmOrder() {
  if (state.carrito.length === 0) return;
  const btn = document.getElementById('confirm-order');
  btn.disabled = true;
  btn.textContent = '⏳ Confirmando Pedido...';

  const payload = {
    wa_id: state.wa_id,
    telefono: state.telefono,
    total: getTotal(),
    items: state.carrito.map(item => ({
      producto: item.nombre,
      cantidad: item.cantidad,
      precio_unitario: item.precio,
      notas: 'Agregado desde Menú Web'
    }))
  };

  try {
    const res = await fetch(`${N8N_BASE_URL}/finalizar-pedido`, {
      method: 'POST',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      state.carrito = [];
      updateCartUI();
      closeCart();
      renderProductos();
      alert('🎉 ¡Pedido recibido! Te enviaremos la confirmación por WhatsApp.');
    } else {
      throw new Error('Error al procesar pedido');
    }
  } catch (e) {
    alert('❌ Ocurrió un detalle al enviar el pedido: ' + e.message);
  } finally {
    btn.textContent = '✅ Confirmar Pedido';
    btn.disabled = false;
  }
}

function init() {
  getUrlParams();
  renderProductos();

  const cartFab = document.getElementById('cart-fab');
  const cartClose = document.getElementById('cart-close');
  const confirmBtn = document.getElementById('confirm-order');
  const cartModal = document.getElementById('cart-modal');

  if (cartFab) cartFab.addEventListener('click', openCart);
  if (cartClose) cartClose.addEventListener('click', closeCart);
  if (confirmBtn) confirmBtn.addEventListener('click', confirmOrder);

  if (cartModal) {
    cartModal.addEventListener('click', (e) => {
      if (e.target === cartModal) closeCart();
    });
  }

  document.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filtro = btn.dataset.cat;
      renderProductos();
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
