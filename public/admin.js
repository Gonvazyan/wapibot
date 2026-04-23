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

function doLogout() {
  localStorage.removeItem('wapibot_pwd');
  password = '';
  document.getElementById('adminPanel').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('passwordInput').value = '';
}

async function loadBusinesses() {
  try {
    var res = await fetch('/api/admin/businesses?t=' + Date.now(), { headers: getHeaders() });
    if (res.status === 401) {
      localStorage.removeItem('wapibot_pwd');
      password = '';
      toast('❌ Contraseña incorrecta');
      return;
    }
    var data = await res.json();

    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('adminPanel').classList.remove('hidden');

    var list  = document.getElementById('businessList');
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
      item.dataset.id = b.id;
      item.innerHTML =
        '<div class="business-info">' +
          '<h3>' + b.business_name +
            ' <span class="badge ' + (b.active ? 'badge-active' : 'badge-inactive') + '">' +
              (b.active ? 'Activo' : 'Inactivo') +
            '</span>' +
          '</h3>' +
          '<p>📱 ' + (b.phone_number_id||'—') + ' · 🏪 ' + (b.business_type||'Sin tipo') + ' · 📍 ' + (b.address||'Sin dirección') + '</p>' +
        '</div>' +
        '<div class="business-actions">' +
          '<button class="btn btn-icon btn-secondary edit-btn" title="Editar"' +
            ' data-id="' + b.id + '"' +
            ' data-name="' + (b.business_name||'') + '"' +
            ' data-type="' + (b.business_type||'') + '"' +
            ' data-phoneid="' + (b.phone_number_id||'') + '"' +
            ' data-phone="' + (b.phone||'') + '"' +
            ' data-schedule="' + (b.schedule||'') + '"' +
            ' data-address="' + (b.address||'') + '"' +
            ' data-services="' + encodeURIComponent(b.services||'') + '">' +
            '✏️' +
          '</button>' +
          '<label class="switch" title="' + (b.active ? 'Desactivar' : 'Activar') + '">' +
            '<input type="checkbox" class="toggle-chk"' + (b.active ? ' checked' : '') +
              ' data-id="' + b.id + '" data-active="' + b.active + '" />' +
            '<span class="slider"></span>' +
          '</label>' +
          '<button class="btn btn-icon btn-danger delete-btn" title="Eliminar" data-id="' + b.id + '">🗑</button>' +
        '</div>';
      list.appendChild(item);
    });

    document.querySelectorAll('.edit-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { openEditModal(this.dataset); });
    });

    document.querySelectorAll('.toggle-chk').forEach(function(chk) {
      chk.addEventListener('change', function() {
        toggleActive(this.dataset.id, this.dataset.active === 'true');
      });
    });

    document.querySelectorAll('.delete-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { deleteBusiness(this.dataset.id); });
    });

  } catch (e) {
    toast('❌ Error conectando con el servidor');
  }
}

async function createBusiness() {
  var body = {
    business_name:   document.getElementById('f_name').value.trim(),
    business_type:   document.getElementById('f_type').value.trim(),
    phone_number_id: document.getElementById('f_phone_id').value.trim(),
    phone:           document.getElementById('f_phone').value.trim(),
    schedule:        document.getElementById('f_schedule').value.trim(),
    address:         document.getElementById('f_address').value.trim(),
    services:        document.getElementById('f_services').value.trim(),
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
    collapseForm();
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

// ── Formulario colapsable ──────────────────────────────────
function collapseForm() {
  document.getElementById('createFormBody').classList.add('collapsed');
  document.getElementById('toggleFormBtn').textContent = 'Mostrar';
}

document.getElementById('toggleFormBtn').addEventListener('click', function() {
  var body = document.getElementById('createFormBody');
  var collapsed = body.classList.toggle('collapsed');
  this.textContent = collapsed ? 'Mostrar' : 'Ocultar';
});

// ── Modal de edición ───────────────────────────────────────
function openEditModal(d) {
  document.getElementById('e_id').value       = d.id;
  document.getElementById('e_name').value     = d.name;
  document.getElementById('e_type').value     = d.type;
  document.getElementById('e_phone_id').value = d.phoneid;
  document.getElementById('e_phone').value    = d.phone;
  document.getElementById('e_schedule').value = d.schedule;
  document.getElementById('e_address').value  = d.address;
  document.getElementById('e_services').value = decodeURIComponent(d.services);
  document.getElementById('editModal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
}

document.getElementById('editCancelBtn').addEventListener('click', closeEditModal);
document.getElementById('editCancelBtn2').addEventListener('click', closeEditModal);

document.getElementById('editModal').addEventListener('click', function(e) {
  if (e.target === this) closeEditModal();
});

document.getElementById('editSaveBtn').addEventListener('click', async function() {
  var id = document.getElementById('e_id').value;
  var body = {
    business_name:   document.getElementById('e_name').value.trim(),
    business_type:   document.getElementById('e_type').value.trim(),
    phone_number_id: document.getElementById('e_phone_id').value.trim(),
    phone:           document.getElementById('e_phone').value.trim(),
    schedule:        document.getElementById('e_schedule').value.trim(),
    address:         document.getElementById('e_address').value.trim(),
    services:        document.getElementById('e_services').value.trim(),
  };

  var res = await fetch('/api/admin/businesses/' + id, {
    method: 'PUT', headers: getHeaders(), body: JSON.stringify(body)
  });

  if (res.ok) {
    closeEditModal();
    toast('✅ Negocio actualizado');
    await loadBusinesses();
    // Highlight del negocio editado
    var item = document.querySelector('.business-item[data-id="' + id + '"]');
    if (item) {
      item.classList.add('highlight');
      setTimeout(function() { item.classList.remove('highlight'); }, 1500);
    }
  } else {
    var err = await res.json();
    toast('❌ Error: ' + err.error);
  }
});

// ── Eventos globales ───────────────────────────────────────
document.getElementById('loginBtn').addEventListener('click', doLogin);
document.getElementById('passwordInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') doLogin();
});
document.getElementById('createBtn').addEventListener('click', createBusiness);
document.getElementById('logoutBtn').addEventListener('click', doLogout);

// Auto-login si hay sesión guardada
if (password) {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('adminPanel').classList.remove('hidden');
  loadBusinesses();
}
