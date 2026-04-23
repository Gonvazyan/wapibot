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
          '<button class="btn btn-icon btn-appts appts-btn" title="Ver reservas"' +
            ' data-id="' + b.id + '" data-name="' + (b.business_name||'') + '">📅</button>' +
          '<button class="btn btn-icon btn-notes notes-btn" title="Avisos del día"' +
            ' data-id="' + b.id + '" data-name="' + (b.business_name||'') + '">📋</button>' +
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

    document.querySelectorAll('.appts-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { openApptsModal(this.dataset.id, this.dataset.name); });
    });

    document.querySelectorAll('.notes-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { openNotesModal(this.dataset.id, this.dataset.name); });
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

// ── Modal de reservas ──────────────────────────────────────
async function openApptsModal(businessId, businessName) {
  document.getElementById('apptsModalTitle').textContent = '📅 Reservas — ' + businessName;
  document.getElementById('apptsModal').classList.remove('hidden');
  await loadAppointments(businessId);
}

function formatApptDate(dateStr) {
  if (!dateStr) return '—';
  var parts = dateStr.split('-');
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

async function loadAppointments(businessId) {
  var list = document.getElementById('apptsList');
  list.innerHTML = '<p style="color:#999;text-align:center;padding:20px">Cargando...</p>';

  var res = await fetch('/api/admin/businesses/' + businessId + '/appointments?t=' + Date.now(), { headers: getHeaders() });
  var appts = await res.json();

  if (!appts.length) {
    list.innerHTML = '<p style="color:#999;text-align:center;padding:20px">No hay reservas aún</p>';
    return;
  }

  list.innerHTML = '';
  appts.forEach(function(a) {
    var statusLabel = a.status === 'confirmed' ? 'Confirmada' : a.status === 'cancelled' ? 'Cancelada' : 'Pendiente';
    var statusClass = 'badge-' + (a.status || 'pending');
    var item = document.createElement('div');
    item.className = 'appt-item';
    item.innerHTML =
      '<div class="appt-header">' +
        '<strong>📅 ' + formatApptDate(a.appointment_date) + ' · 🕐 ' + (a.appointment_time||'—') + ' · 👥 ' + (a.service||'—') + '</strong>' +
        '<span class="badge ' + statusClass + '">' + statusLabel + '</span>' +
      '</div>' +
      '<div class="appt-meta">' + (a.customer_name ? '👤 ' + a.customer_name + ' · ' : '') + '📞 ' + (a.customer_phone||'—') + '</div>' +
      (a.notes ? '<div class="appt-notes">📝 ' + a.notes + '</div>' : '') +
      (a.status !== 'cancelled' ?
        '<div><button class="appt-cancel-btn" data-id="' + a.id + '" data-bid="' + businessId + '">Cancelar reserva</button></div>' : '');
    list.appendChild(item);
  });

  list.querySelectorAll('.appt-cancel-btn').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      var id = this.dataset.id;
      var bid = this.dataset.bid;
      await fetch('/api/admin/appointments/' + id + '/status', {
        method: 'PUT', headers: getHeaders(), body: JSON.stringify({ status: 'cancelled' })
      });
      await loadAppointments(bid);
      toast('❌ Reserva cancelada');
    });
  });
}

document.getElementById('apptsCancelBtn').addEventListener('click', function() {
  document.getElementById('apptsModal').classList.add('hidden');
});

document.getElementById('apptsModal').addEventListener('click', function(e) {
  if (e.target === this) this.classList.add('hidden');
});

// ── Modal de avisos ────────────────────────────────────────
async function openNotesModal(businessId, businessName) {
  document.getElementById('n_business_id').value = businessId;
  document.getElementById('notesModal').querySelector('h2').textContent = '📋 Avisos — ' + businessName;
  document.getElementById('n_note').value = '';
  document.getElementById('notesModal').classList.remove('hidden');
  await loadNotes(businessId);
}

async function loadNotes(businessId) {
  var res = await fetch('/api/admin/businesses/' + businessId + '/notes?t=' + Date.now(), { headers: getHeaders() });
  var notes = await res.json();
  var list = document.getElementById('notesList');
  if (!notes.length) {
    list.innerHTML = '<p style="color:#999;text-align:center;padding:12px">No hay avisos activos</p>';
    return;
  }
  list.innerHTML = '';
  notes.forEach(function(n) {
    var item = document.createElement('div');
    item.className = 'note-item';
    item.innerHTML = '<span>' + n.note + '</span><button class="note-del" data-id="' + n.id + '">✕</button>';
    list.appendChild(item);
  });
  list.querySelectorAll('.note-del').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      await fetch('/api/admin/notes/' + this.dataset.id, { method: 'DELETE', headers: getHeaders() });
      await loadNotes(businessId);
    });
  });
}

document.getElementById('addNoteBtn').addEventListener('click', async function() {
  var businessId = document.getElementById('n_business_id').value;
  var note = document.getElementById('n_note').value.trim();
  if (!note) return;
  var res = await fetch('/api/admin/businesses/' + businessId + '/notes', {
    method: 'POST', headers: getHeaders(), body: JSON.stringify({ note })
  });
  if (res.ok) {
    document.getElementById('n_note').value = '';
    await loadNotes(businessId);
  } else {
    toast('❌ Error añadiendo aviso');
  }
});

document.getElementById('n_note').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') document.getElementById('addNoteBtn').click();
});

document.getElementById('notesCancelBtn').addEventListener('click', function() {
  document.getElementById('notesModal').classList.add('hidden');
});

document.getElementById('notesModal').addEventListener('click', function(e) {
  if (e.target === this) this.classList.add('hidden');
});

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
