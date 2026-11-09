import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Buyurtma yaratish
export async function createOrder(data) {
  const { data: order, error } = await supabase
    .from('orders')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return order;
}

// Foydalanuvchi buyurtmalarini olish
export async function getOrders(tgId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('tg_id', tgId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data;
}

// Bitta buyurtma
export async function getOrder(id) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

// Status yangilash (operator guruhdan)
export async function updateStatus(id, status, dueAt = null) {
  const upd = { status };
  if (dueAt) upd.due_at = dueAt;
  const { data, error } = await supabase
    .from('orders')
    .update(upd)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Buyurtmani qabul qilish (mijoz tomonidan)
export async function acceptOrder(id, tgId) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'done' })
    .eq('id', id)
    .eq('tg_id', tgId)
    .eq('status', 'delivery')
    .select()
    .single();
  if (error) throw error;
  return data;
}
