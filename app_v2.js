const urlParams = new URLSearchParams(window.location.search);
const userPhone = urlParams.get('phone');
const BASEROW_URL = 'https://brl-labs-baserow.oiwlwu.easypanel.host';
const TOKEN = 'Token Ru9AdAvFvzN2RwTakZcQ8N80lyTVC0cp';
const TABLE_PRODUCTOS = 746;
const TABLE_COMANDAS = 747;
const TABLE_CONVERSACIONES = 748;

const headers = { 'Authorization': TOKEN, 'Content-Type': 'application/json' };

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

let state = {
  productos: [],
  carrito: [],
  comandas: [],
  filtro: 'todas',
  wa_id: '',
  telefono: ''
};

function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  state.wa_id = params.get('wa_id') || 'demo_wa';
  state.telefono = params.get('phone') || '521234567890';
}

async function apiGet(tableId) {
  const url = BASEROW_URL + '/api/database/rows/table/' + tableId + '/?user_field_names=true&size=100';
  const res = await fetch(url, { headers });
  const data = await res.json();
  return data.results;
}

async function apiPost(tableId, body) {
  const url = BASEROW_URL + '/api/database/rows/table/' + tableId + '/?user_field_names=true';
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  return await res.json();
}

async function apiPatch(tableId, rowId, body) {
  const url = BASEROW_URL + '/api/database/rows/table/' + tableId + '/' + rowId + '/?user_field_names=true';
  const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(body) });
  return await res.json();
}

async function loadProductos() {
  state.productos = await apiGet(TABLE_PRODUCTOS);
  renderProductos();
}

function getCategoria(p) {
  return p.Categoria && p.Categoria.value ? p.Categoria.value : '';
}

function renderProductos() {
  const grid = document.getElementById('productos-grid');
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
    const btnText = enCarrito ? '✓ Agregado' : 'Agregar';
    const disabled = enCarrito ? 'disabled' : '';
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
      '<button class="btn-add" data-id="' + id + '" ' + disabled + '>' + btnText + '</button>' +
      '</div></div></div>';
  }).join('');

  grid.querySelectorAll('.btn-add:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => { addToCart(parseInt(btn.dataset.id)); });
  });
}

function addToCart(id) {
  const prod = state.productos.find(p => p.id === id);
  if (!prod || state.carrito.find(c => c.id === id)) return;
  state.carrito.push({ id: prod.id, nombre: prod.Nombre, precio: parseInt(prod.Precio) || 0, cantidad: 1 });
  updateCartUI();
  renderProductos();
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
  if (count > 0) {
    fab.classList.remove('hidden');
    countEl.textContent = count;
  } else {
    fab.classList.add('hidden');
  }
}

function renderCartModal() {
  const container = document.getElementById('cart-items');
  if (state.carrito.length === 0) {
    container.innerHTML = '<div class="empty-cart"><span class="empty-icon">🛒</span><p>Tu carrito está vacío</p></div>';
    document.getElementById('cart-total').textContent = '$0';
    document.getElementById('confirm-order').disabled = true;
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
  document.getElementById('cart-total').textContent = '$' + getTotal();
  document.getElementById('confirm-order').disabled = false;

  container.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      updateQuantity(parseInt(btn.dataset.id), parseInt(btn.dataset.delta));
    });
  });
}

function openCart() {
  document.getElementById('cart-modal').classList.remove('hidden');
  renderCartModal();
}

function closeCart() {
  document.getElementById('cart-modal').classList.add('hidden');
}

async function confirmOrder() {
  if (state.carrito.length === 0) return;
  const btn = document.getElementById('confirm-order');
  btn.disabled = true;
  btn.textContent = '⏳ Enviando...';

  const itemsData = {
    wa_id: state.wa_id,
    telefono: state.telefono,
    items: state.carrito.map(i => ({ nombre: i.nombre, precio: i.precio, cantidad: i.cantidad }))
  };

  const bodyComanda = {
    'Id pedido': Date.now(),
    Total: getTotal(),
    Items: JSON.stringify(itemsData),
    Status: 'Pendiente'
  };

  try {
    // 1. Guardamos el pedido en la tabla de Comandas (747) para la cocina
    await apiPost(TABLE_COMANDAS, bodyComanda);

    // 2. Buscamos al usuario en la tabla de Conversaciones (748) por su teléfono
    try {
      const searchUrl = `${BASEROW_URL}/api/database/rows/table/${TABLE_CONVERSACIONES}/?user_field_names=true&search=${state.telefono}`;
      const searchRes = await fetch(searchUrl, { headers });
      const searchData = await searchRes.json();
      
      if (searchData.results && searchData.results.length > 0) {
        const rowId = searchData.results[0].id;
        
        // 3. Actualizamos su estado a "comprando" y guardamos el carrito en su fila de conversaciones
        await apiPatch(TABLE_CONVERSACIONES, rowId, {
          estado: "comprando",
          carrito: JSON.stringify(itemsData.items)
        });
        
        console.log("Conversación actualizada a estado: comprando");
      }
    } catch (err) {
      console.warn("El pedido se guardó en comandas, pero hubo un detalle al actualizar conversaciones:", err);
    }

    state.carrito = [];
    updateCartUI();
    closeCart();
    alert('✅ Pedido confirmado con éxito');
    btn.textContent = '✅ Confirmar Pedido';
    btn.disabled = false;
    loadComandas();
  } catch (e) {
    alert('Error al enviar pedido: ' + e.message);
    btn.textContent = '✅ Confirmar Pedido';
    btn.disabled = false;
  }
}
async function loadComandas() {
  try {
    state.comandas = await apiGet(TABLE_COMANDAS);
    renderComandas();
  } catch (e) {
    console.error('Error loading comandas:', e);
  }
}

function getStatusLabel(status) {
  if (!status) return 'Pendiente';
  if (typeof status === 'object') return status.value;
  return status;
}

function getStatusClass(status) {
  const label = getStatusLabel(status);
  if (label === 'En preparación') return 'status-preparacion';
  if (label === 'Entregado') return 'status-entregado';
  return 'status-pendiente';
}

function getNextStatus(status) {
  const label = getStatusLabel(status);
  if (label === 'Pendiente') return { value: 'En preparación', btnText: 'En preparación', btnClass: 'btn-avanzar' };
  if (label === 'En preparación') return { value: 'Entregado', btnText: 'Entregado', btnClass: 'btn-completar' };
  return null;
}

function renderComandas() {
  const container = document.getElementById('comandas-list');
  document.getElementById('comandas-count').textContent = state.comandas.length;

  if (state.comandas.length === 0) {
    container.innerHTML = '<div class="empty-state"><h3>📋 Sin comandas</h3><p>Aún no hay pedidos entrantes</p></div>';
    return;
  }

  container.innerHTML = state.comandas.map(c => {
    const statusClass = getStatusClass(c.Status);
    const statusLabel = getStatusLabel(c.Status);
    const next = getNextStatus(c.Status);
    const itemsData = c.Items ? JSON.parse(c.Items) : { items: [] };
    const itemsList = Array.isArray(itemsData.items) ? itemsData.items : [];
    const itemsHtml = itemsList.map(i => i.cantidad + 'x ' + i.nombre).join('<br>');
    const telefono = itemsData.telefono || '—';
    const creado = c.Creado ? new Date(c.Creado).toLocaleTimeString() : '—';

    return '<div class="comanda-card ' + statusClass + '">' +
      '<div class="comanda-header">' +
      '<span class="comanda-cliente">📞 ' + telefono + '</span>' +
      '<span class="comanda-status">' + statusLabel + '</span>' +
      '</div>' +
      '<div class="comanda-items">' + itemsHtml + '</div>' +
      '<div class="comanda-footer">' +
      '<span class="comanda-total">$' + c.Total + '</span>' +
      '<span class="comanda-time">' + creado + '</span>' +
      (next ? '<button class="btn-status ' + next.btnClass + '" data-id="' + c.id + '" data-next="' + next.value + '">' + next.btnText + '</button>' : '') +
      '</div></div>';
  }).join('');

  container.querySelectorAll('.btn-status').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id);
      const nextStatus = btn.dataset.next;
      try {
        await apiPatch(TABLE_COMANDAS, id, { Status: nextStatus });
        await loadComandas();
      } catch (e) {
        alert('Error al actualizar: ' + e.message);
      }
    });
  });
}

function init() {
  getUrlParams();
  loadProductos();
  loadComandas();
  setInterval(loadComandas, 5000);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab + '-view').classList.add('active');
      if (btn.dataset.tab === 'kitchen') loadComandas();
    });
  });

  document.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filtro = btn.dataset.cat;
      renderProductos();
    });
  });

  document.getElementById('cart-fab').addEventListener('click', openCart);
  document.getElementById('cart-close').addEventListener('click', closeCart);
  document.getElementById('confirm-order').addEventListener('click', confirmOrder);

  document.getElementById('cart-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('cart-modal')) closeCart();
  });
}

document.addEventListener('DOMContentLoaded', init);
