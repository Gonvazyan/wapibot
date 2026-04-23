const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const adminAuth = require('../middleware/auth');

let _supabase;
function getSupabase() {
  if (!_supabase) _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  return _supabase;
}

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

router.post('/businesses', adminAuth, async (req, res) => {
  try {
    const { business_name, business_type, phone_number_id, schedule, phone, address, services } = req.body;
    if (!business_name || !phone_number_id) {
      return res.status(400).json({ error: 'business_name y phone_number_id son obligatorios' });
    }
    const { data, error } = await getSupabase()
      .from('businesses')
      .insert({ business_name, business_type, phone_number_id, phone_number: phone_number_id, schedule, phone, address, services, active: true })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/businesses/:id', adminAuth, async (req, res) => {
  try {
    const { business_name, business_type, phone_number_id, schedule, phone, address, services, active } = req.body;
    const { data, error } = await getSupabase()
      .from('businesses')
      .update({ business_name, business_type, phone_number_id, schedule, phone, address, services, active })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/businesses/:id', adminAuth, async (req, res) => {
  try {
    const { error } = await getSupabase()
      .from('businesses')
      .update({ active: false })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Negocio eliminado' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;