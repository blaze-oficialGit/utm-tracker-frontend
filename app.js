// UTM Tracker - Frontend Application
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : `${window.location.origin}/api`;

let authToken = localStorage.getItem('utm_auth_token');
let currentUser = null;
let charts = {};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  if (authToken) {
    loadDashboard();
  } else {
    showLoginModal();
  }

  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      navigateTo(page);
    });
  });

  // Sidebar toggle (mobile)
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Auth forms
  document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
  document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

  // Modal toggles
  document.getElementById('showRegister')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('registerModal').style.display = 'flex';
  });

  document.getElementById('showLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('registerModal').style.display = 'none';
    document.getElementById('loginModal').style.display = 'flex';
  });

  // Period selector
  document.getElementById('periodSelector')?.addEventListener('change', (e) => {
    loadDashboardStats(e.target.value);
  });

  // Generate link
  document.getElementById('generateLinkBtn')?.addEventListener('click', () => {
    document.getElementById('generateLinkModal').style.display = 'flex';
  });

  document.getElementById('generateLinkForm')?.addEventListener('submit', handleGenerateLink);

  // Settings forms
  document.getElementById('profileForm')?.addEventListener('submit', handleUpdateProfile);
  document.getElementById('passwordForm')?.addEventListener('submit', handleChangePassword);

  // Test tracking
  document.getElementById('testTrackingBtn')?.addEventListener('click', handleTestTracking);
}

// Navigation
function navigateTo(page) {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`)?.classList.add('active');

  const titles = {
    dashboard: 'Dashboard',
    sales: 'Vendas',
    campaigns: 'Campanhas',
    links: 'Links Rastreáveis',
    visitors: 'Visitantes',
    events: 'Eventos',
    integrations: 'Integrações',
    webhooks: 'Webhooks',
    tracking: 'Tracking',
    settings: 'Configurações'
  };

  document.getElementById('pageTitle').textContent = titles[page] || page;

  // Load page data
  switch(page) {
    case 'dashboard': loadDashboardStats(); break;
    case 'sales': loadSales(); break;
    case 'campaigns': loadCampaigns(); break;
    case 'links': loadLinks(); break;
    case 'visitors': loadVisitors(); break;
    case 'events': loadEvents(); break;
    case 'integrations': loadIntegrations(); break;
    case 'webhooks': loadWebhooks(); break;
    case 'tracking': loadTrackingInfo(); break;
    case 'settings': loadSettings(); break;
  }
}

// Auth functions
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('utm_auth_token', authToken);

    document.getElementById('loginModal').style.display = 'none';
    showToast('Login realizado com sucesso!', 'success');
    loadDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('utm_auth_token', authToken);

    document.getElementById('registerModal').style.display = 'none';
    showToast('Conta criada com sucesso!', 'success');
    loadDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function handleLogout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('utm_auth_token');
  showLoginModal();
  showToast('Logout realizado', 'success');
}

function showLoginModal() {
  document.getElementById('loginModal').style.display = 'flex';
  document.getElementById('registerModal').style.display = 'none';
}

// API helper
async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
    ...options.headers
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await res.json();

  if (!res.ok) {
    if (res.status === 401) {
      handleLogout();
      throw new Error('Sessão expirada');
    }
    throw new Error(data.error || 'Erro na requisição');
  }

  return data;
}

// Dashboard
async function loadDashboard() {
  try {
    const data = await apiRequest('/auth/me');
    currentUser = data.user;
    document.getElementById('userInfo').querySelector('.user-email').textContent = currentUser.email;

    if (data.is_demo) {
      document.getElementById('demoBadge').style.display = 'block';
    }

    loadDashboardStats();
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

async function loadDashboardStats(period = '7d') {
  try {
    const data = await apiRequest(`/stats/dashboard?period=${period}`);

    // Update metrics
    updateMetric('Investment', data.summary.investment, 'currency');
    updateMetric('Revenue', data.summary.revenue, 'currency');
    updateMetric('Sales', data.summary.sales, 'number');
    updateMetric('Leads', data.summary.leads, 'number');
    updateMetric('Clicks', data.summary.clicks, 'number');
    updateMetric('Conversion', data.summary.conversion_rate, 'percent');
    updateMetric('CPA', data.summary.cpa, 'currency');
    updateMetric('CPL', data.summary.cpl, 'currency');
    updateMetric('ROAS', data.summary.roas, 'number');
    updateMetric('AvgTicket', data.summary.avg_ticket, 'currency');
    updateMetric('Profit', data.summary.profit, 'currency');

    // Update charts
    updateCharts(data.time_series);

    // Update recent sales
    updateRecentSales(data.recent_sales || []);

  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

function updateMetric(name, value, type) {
  const el = document.getElementById(`metric${name}`);
  if (!el) return;

  switch(type) {
    case 'currency':
      el.textContent = `R$ ${parseFloat(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      break;
    case 'percent':
      el.textContent = `${parseFloat(value).toFixed(2)}%`;
      break;
    case 'number':
      el.textContent = parseInt(value).toLocaleString('pt-BR');
      break;
    default:
      el.textContent = value;
  }
}

function updateCharts(timeSeries) {
  // Revenue chart
  if (charts.revenue) charts.revenue.destroy();
  const revenueCtx = document.getElementById('revenueChart')?.getContext('2d');
  if (revenueCtx && timeSeries.revenue) {
    charts.revenue = new Chart(revenueCtx, {
      type: 'line',
      data: {
        labels: timeSeries.revenue.map(r => r.date),
        datasets: [{
          label: 'Receita (R$)',
          data: timeSeries.revenue.map(r => parseFloat(r.revenue)),
          borderColor: '#0d9488',
          backgroundColor: 'rgba(13, 148, 136, 0.1)',
          tension: 0.4
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  }

  // Sales chart
  if (charts.sales) charts.sales.destroy();
  const salesCtx = document.getElementById('salesChart')?.getContext('2d');
  if (salesCtx && timeSeries.revenue) {
    charts.sales = new Chart(salesCtx, {
      type: 'bar',
      data: {
        labels: timeSeries.revenue.map(r => r.date),
        datasets: [{
          label: 'Vendas',
          data: timeSeries.revenue.map(r => parseInt(r.orders_count)),
          backgroundColor: '#0ea5e9'
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  }

  // Clicks chart
  if (charts.clicks) charts.clicks.destroy();
  const clicksCtx = document.getElementById('clicksChart')?.getContext('2d');
  if (clicksCtx && timeSeries.clicks) {
    charts.clicks = new Chart(clicksCtx, {
      type: 'line',
      data: {
        labels: timeSeries.clicks.map(r => r.date),
        datasets: [{
          label: 'Cliques',
          data: timeSeries.clicks.map(r => parseInt(r.clicks_count)),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  }
}

function updateRecentSales(sales) {
  const container = document.getElementById('recentSales');
  if (!container) return;

  if (sales.length === 0) {
    container.innerHTML = '<p class="empty-state">Nenhuma venda registrada ainda</p>';
    return;
  }

  container.innerHTML = sales.slice(0, 5).map(sale => `
    <div class="activity-item">
      <div>
        <strong>${sale.product_name || 'Produto'}</strong>
        <div style="font-size: 0.875rem; color: var(--text-secondary);">
          ${sale.attributed_to?.source || 'Direto'} • ${sale.attributed_to?.campaign || '-'}
        </div>
      </div>
      <div class="amount">R$ ${parseFloat(sale.amount).toFixed(2)}</div>
    </div>
  `).join('');
}

// Sales page
async function loadSales() {
  try {
    const data = await apiRequest('/orders?limit=100');
    const tbody = document.getElementById('salesTableBody');

    if (data.orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Nenhuma venda encontrada</td></tr>';
      return;
    }

    tbody.innerHTML = data.orders.map(order => `
      <tr>
        <td>${new Date(order.created_at).toLocaleString('pt-BR')}</td>
        <td>${order.customer_name || order.customer_email || '-'}</td>
        <td>${order.product_name || '-'}</td>
        <td>R$ ${parseFloat(order.amount).toFixed(2)}</td>
        <td><span class="integration-status ${order.status === 'approved' ? 'connected' : 'disconnected'}">${order.status}</span></td>
        <td>${order.utm_source || '-'}</td>
        <td>${order.utm_campaign || '-'}</td>
        <td>${order.ad_id || '-'}</td>
        <td><button class="btn-copy" onclick="viewOrderJourney('${order.id}')">Ver Jornada</button></td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading sales:', error);
  }
}

async function viewOrderJourney(orderId) {
  try {
    const data = await apiRequest(`/orders/${orderId}`);
    const journey = data.journey;

    let html = `<h4>Jornada do Cliente</h4>`;
    html += `<p><strong> Venda:</strong> R$ ${parseFloat(data.order.amount).toFixed(2)} - ${data.order.product_name}</p>`;
    html += `<p><strong>Origem:</strong> ${data.order.utm_source || 'Direto'} / ${data.order.utm_campaign || '-'}</p>`;

    if (journey) {
      html += `<h5>Eventos:</h5><ul>`;
      journey.events.forEach(event => {
        html += `<li>${new Date(event.timestamp).toLocaleString('pt-BR')} - ${event.event_type}</li>`;
      });
      html += `</ul>`;
    }

    showToast(html, 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Campaigns page
async function loadCampaigns() {
  try {
    const data = await apiRequest('/campaigns?limit=100');
    const tbody = document.getElementById('campaignsTableBody');

    if (data.campaigns.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Nenhuma campanha encontrada</td></tr>';
      return;
    }

    tbody.innerHTML = data.campaigns.map(c => `
      <tr>
        <td>${c.name}</td>
        <td>${c.platform}</td>
        <td>R$ ${parseFloat(c.metrics?.spend || 0).toFixed(2)}</td>
        <td>${c.metrics?.clicks || 0}</td>
        <td>-</td>
        <td>-</td>
        <td>R$ 0,00</td>
        <td>R$ 0,00</td>
        <td>0.00</td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading campaigns:', error);
  }
}

// Links page
async function loadLinks() {
  try {
    const data = await apiRequest('/links?limit=100');
    const tbody = document.getElementById('linksTableBody');

    if (data.links.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhum link gerado ainda</td></tr>';
      return;
    }

    tbody.innerHTML = data.links.map(link => `
      <tr>
        <td>${link.name || '-'}</td>
        <td><a href="${link.destination_url}" target="_blank">${link.destination_url.substring(0, 50)}...</a></td>
        <td>${link.utm_source || '-'}</td>
        <td>${link.utm_campaign || '-'}</td>
        <td>${link.clicks_count}</td>
        <td>${new Date(link.created_at).toLocaleString('pt-BR')}</td>
        <td><button class="btn-copy" onclick="copyText('${link.destination_url}?utm_source=${link.utm_source || ''}&utm_campaign=${link.utm_campaign || ''}')">Copiar URL</button></td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading links:', error);
  }
}

async function handleGenerateLink(e) {
  e.preventDefault();

  const payload = {
    name: document.getElementById('linkName').value,
    destination_url: document.getElementById('linkDestination').value,
    utm_source: document.getElementById('linkUtmSource').value,
    utm_medium: document.getElementById('linkUtmMedium').value,
    utm_campaign: document.getElementById('linkUtmCampaign').value,
    utm_content: document.getElementById('linkUtmContent').value,
    utm_term: document.getElementById('linkUtmTerm').value,
    campaign_id: document.getElementById('linkCampaignId').value,
    adgroup_id: document.getElementById('linkAdgroupId').value,
    ad_id: document.getElementById('linkAdId').value,
    placement: document.getElementById('linkPlacement').value,
    creative_id: document.getElementById('linkCreativeId').value
  };

  try {
    const data = await apiRequest('/links/generate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    document.getElementById('generatedLinkUrl').textContent = data.tracking_url;
    document.getElementById('generatedLinkResult').style.display = 'block';
    showToast('Link gerado com sucesso!', 'success');
    loadLinks();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Visitors page
async function loadVisitors() {
  try {
    const data = await apiRequest('/visitors?limit=100');
    const tbody = document.getElementById('visitorsTableBody');

    if (data.visitors.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhum visitante registrado</td></tr>';
      return;
    }

    tbody.innerHTML = data.visitors.map(v => `
      <tr>
        <td>${v.visitor_id.substring(0, 20)}...</td>
        <td>${v.country || '-'}</td>
        <td>${v.device_type || '-'}</td>
        <td>${v.browser || '-'}</td>
        <td>${new Date(v.first_seen).toLocaleString('pt-BR')}</td>
        <td>${new Date(v.last_seen).toLocaleString('pt-BR')}</td>
        <td><button class="btn-copy" onclick="viewVisitorJourney('${v.id}')">Ver Jornada</button></td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading visitors:', error);
  }
}

async function viewVisitorJourney(visitorId) {
  try {
    const data = await apiRequest(`/visitors/${visitorId}/journey`);
    showToast(`Visitante: ${data.sessions.length} sessões, ${data.events.length} eventos, ${data.orders.length} vendas`, 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Events page
async function loadEvents() {
  try {
    const data = await apiRequest('/events?limit=100');
    const tbody = document.getElementById('eventsTableBody');

    if (data.events.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhum evento registrado</td></tr>';
      return;
    }

    tbody.innerHTML = data.events.map(e => `
      <tr>
        <td>${new Date(e.timestamp).toLocaleString('pt-BR')}</td>
        <td>${e.event_type}</td>
        <td>${e.utm_source || '-'}</td>
        <td>${e.utm_campaign || '-'}</td>
        <td>${JSON.stringify(e.event_data).substring(0, 50)}...</td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading events:', error);
  }
}

// Integrations page
async function loadIntegrations() {
  try {
    const data = await apiRequest('/integrations');
    const grid = document.getElementById('integrationsGrid');

    grid.innerHTML = data.integrations.map(int => `
      <div class="integration-card ${int.connected ? 'connected' : ''}">
        <span class="integration-status ${int.connected ? 'connected' : 'disconnected'}">
          ${int.connected ? '✓ Conectado' : '○ Desconectado'}
        </span>
        <h4>${int.name}</h4>
        <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 10px 0;">
          ${int.connected ? `Conta: ${int.integration.account_id || 'Conectada'}` : 'Clique para conectar'}
        </p>
        <button class="btn-primary" onclick="${int.connected ? `disconnectIntegration('${int.platform}')` : `connectIntegration('${int.platform}')`}">
          ${int.connected ? 'Desconectar' : 'Conectar'}
        </button>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading integrations:', error);
  }
}

function connectIntegration(platform) {
  showToast(`Integração com ${platform} requer configuração de API. Em desenvolvimento.`, 'error');
}

function disconnectIntegration(platform) {
  showToast(`Desconectando ${platform}...`, 'success');
}

// Webhooks page
async function loadWebhooks() {
  const baseUrl = API_BASE.replace('/api', '');
  document.getElementById('webhookPurchaseUrl').textContent = `${baseUrl}/api/webhooks/purchase`;
  document.getElementById('webhookLeadUrl').textContent = `${baseUrl}/api/webhooks/lead`;

  try {
    const data = await apiRequest('/webhooks/logs?limit=50');
    const tbody = document.getElementById('webhookLogsBody');

    if (data.logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Nenhum webhook recebido</td></tr>';
      return;
    }

    tbody.innerHTML = data.logs.map(log => `
      <tr>
        <td>${new Date(log.received_at).toLocaleString('pt-BR')}</td>
        <td>${log.source}</td>
        <td>${log.processed ? '✓ Sim' : '○ Não'}</td>
        <td><code>${JSON.stringify(log.payload).substring(0, 100)}...</code></td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading webhook logs:', error);
  }
}

// Tracking page
function loadTrackingInfo() {
  const apiUrl = API_BASE.replace('/api', '');
  document.getElementById('trackingScriptCode').textContent =
    `<script src="${apiUrl}/tracking.js" data-api="${apiUrl}/api/track"><\/script>`;
}

function handleTestTracking() {
  const url = document.getElementById('testUrl').value;
  if (!url) {
    showToast('Digite uma URL para testar', 'error');
    return;
  }

  const urlObj = new URL(url);
  const params = urlObj.searchParams;

  const results = {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_content: params.get('utm_content'),
    utm_term: params.get('utm_term'),
    campaign_id: params.get('campaign_id'),
    ad_id: params.get('ad_id')
  };

  const html = Object.entries(results)
    .filter(([_, v]) => v)
    .map(([k, v]) => `✓ ${k}: ${v}`)
    .join('<br>');

  document.getElementById('testResultsContent').innerHTML = html || 'Nenhum parâmetro UTM detectado';
  document.getElementById('testResults').style.display = 'block';
}

// Settings page
async function loadSettings() {
  if (currentUser) {
    document.getElementById('settingsName').value = currentUser.name || '';
    document.getElementById('settingsEmail').value = currentUser.email || '';
  }
}

async function handleUpdateProfile(e) {
  e.preventDefault();
  const name = document.getElementById('settingsName').value;
  const email = document.getElementById('settingsEmail').value;

  try {
    await apiRequest('/auth/me', {
      method: 'PUT',
      body: JSON.stringify({ name, email })
    });
    showToast('Perfil atualizado!', 'success');
    loadDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function handleChangePassword(e) {
  e.preventDefault();
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;

  try {
    await apiRequest('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword })
    });
    showToast('Senha alterada com sucesso!', 'success');
    document.getElementById('passwordForm').reset();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Utilities
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = message;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 5000);
}

function copyToClipboard(elementId) {
  const text = document.getElementById(elementId).textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copiado para a área de transferência!', 'success');
  });
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copiado!', 'success');
  });
}