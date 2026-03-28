var password = localStorage.getItem('wapibot_pwd') || '';

function toast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 3000);
}

function getHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + password };
}

function doLogin() {
  password = document.getElementById('passwordInput').value;
  if (!password) return;
  localStorage.setItem('wapibot_pwd', password);
  loadBusinesses();
}

async function loadBusinesses() {
  try {
    var res = await fetch('/api/admin/businesses?t=' + Date.now(), { headers: getHeaders() });
    if (res.status === 401) { localStorage.removeItem('wapibot_pwd'); password = ''; toast('❌ Contraseña incorrecta'); return; }
    var data = await res.json();

    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('adminPanel').classList.remove('hidden');
    var list = document.getElementById('businessList');
    var count = Array.isArray(data) ? data.length : 0;
    document.getElementById('businessCount').textContent = count + ' negocio' + (count !== 1 ? 's' : '');

    if (!count) {
      list.innerHTML = '<p style="color:#999;text-align:center;padding:20px">No hay negocios aún</p>';
      return;
    }

    list.innerHTML = '';
    data.forEach(function(b) {
      var item = document.createElement('div');
      item.className = 'business-item' + (b.active ? '' : ' inactive');
      item.innerHTML =
        '<div class="business-info">' +
          '<h3>' + b.business_name + ' <span class="badge ' + (b.active ? 'badge-active' : 'badge-inactive') + '">' + (b.active ? 'Activo' : 'Inactivo') + '</span></h3>' +
          '<p>📱 ' + b.phone_number_id + ' · 🏪 ' + (b.business_type || 'Sin tipo') + ' · 📍 ' + (b.address || 'Sin dirección') + '</p>' +
        '</div>' +
        '<div class="business-actions">' +
          '<button class="btn btn-secondary toggle-btn" data-id="' + b.id + '" data-active="' + b.active + '">' + (b.active ? 'Desactivar' : 'Activar') + '</button>' +
          '<button class="btn btn-danger delete-btn" data-id="' + b.id + '">🗑</button>' +
        '</div>';
      list.appendChild(item);
    });

    document.querySelectorAll('.toggle-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        toggleActive(this.dataset.id, this.dataset.active === 'true');
      });
    });

    document.querySelectorAll('.delete-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        deleteBusiness(this.dataset.id);
      });
    });

  } catch (e) {
    toast('❌ Error conectando con el servidor');
  }
}

async function createBusiness() {
  var body = {
    business_name: document.getElementById('f_name').value.trim(),
    business_type: document.getElementById('f_type').value.trim(),
    phone_number_id: document.getElementById('f_phone_id').value.trim(),
    phone: document.getElementById('f_phone').value.trim(),
    schedule: document.getElementById('f_schedule').value.trim(),
    address: document.getElementById('f_address').value.trim(),
    services: document.getElementById('f_services').value.trim(),
  };

  if (!body.business_name || !body.phone_number_id) {
    toast('⚠️ Nombre y Phone Number ID son obligatorios');
    return;
  }

  var res = await fetch('/api/admin/businesses', {
    method: 'POST', headers: getHeaders(), body: JSON.stringify(body)
  });

  if (res.ok) {
    toast('✅ Negocio creado correctamente');
    ['f_name','f_type','f_phone_id','f_phone','f_schedule','f_address','f_services']
      .forEach(function(id) { document.getElementById(id).value = ''; });
    loadBusinesses();
  } else {
    var err = await res.json();
    toast('❌ Error: ' + err.error);
  }
}

async function toggleActive(id, current) {
  await fetch('/api/admin/businesses/' + id, {
    method: 'PUT', headers: getHeaders(),
    body: JSON.stringify({ active: !current })
  });
  toast(current ? '⏸ Negocio desactivado' : '▶️ Negocio activado');
  loadBusinesses();
}

async function deleteBusiness(id) {
  var res = await fetch('/api/admin/businesses/' + id, { method: 'DELETE', headers: getHeaders() });
  if (res.ok) {
    var item = document.querySelector('.delete-btn[data-id="' + id + '"]').closest('.business-item');
    if (item) item.remove();
    var remaining = document.querySelectorAll('.business-item').length;
    document.getElementById('businessCount').textContent = remaining + ' negocio' + (remaining !== 1 ? 's' : '');

    if (!remaining) document.getElementById('businessList').innerHTML = '<p style="color:#999;text-align:center;padding:20px">No hay negocios aún</p>';
    toast('🗑 Negocio eliminado');
  } else {
    var err = await res.json();
    toast('❌ Error: ' + err.error);
  }
}

document.getElementById('loginBtn').addEventListener('click', doLogin);

document.getElementById('passwordInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') doLogin();
});

document.getElementById('createBtn').addEventListener('click', createBusiness);

// Auto-login si hay sesión guardada
if (password) loadBusinesses();