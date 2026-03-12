const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const adminAuth = require('../middleware/auth');

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

// ── GET todos los negocios ────────────────────────────────
router.get('/businesses', adminAuth, async (req, res) => {
  try {
    const { data, error } = await getSupabase()
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST crear negocio ────────────────────────────────────
router.post('/businesses', adminAuth, async (req, res) => {
  try {
    const { business_name, business_type, phone_number_id, schedule, phone, address, services } = req.body;

    if (!business_name || !phone_number_id) {
      return res.status(400).json({ error: 'business_name y phone_number_id son obligatorios' });
    }

    const { data, error } = await getSupabase()
      .from('businesses')
      .insert({ business_name, business_type, phone_number_id, schedule, phone, address, services, active: true })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PUT actualizar negocio ────────────────────────────────
router.put('/businesses/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await getSupabase()
      .from('businesses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE desactivar negocio ─────────────────────────────
router.delete('/businesses/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await getSupabase()
      .from('businesses')
      .update({ active: false })
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Negocio desactivado' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;