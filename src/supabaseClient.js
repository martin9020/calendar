import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

function fromRow(row) {
  return {
    id: row.id,
    date: row.date,
    name: row.name || "",
    phone: row.phone || "",
    notes: row.notes || "",
    status: row.status || "Потвърдена",
  };
}

function toInsert(reservation) {
  return {
    date: reservation.date,
    name: reservation.name,
    phone: reservation.phone || null,
    notes: reservation.notes || null,
    status: reservation.status || "Потвърдена",
  };
}

export async function fetchReservations() {
  const { data, error } = await supabase
    .from("reservations")
    .select("id,date,name,phone,notes,status")
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function insertReservations(reservations) {
  const { data, error } = await supabase
    .from("reservations")
    .insert(reservations.map(toInsert))
    .select("id,date,name,phone,notes,status");

  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function updateReservation(id, form) {
  const { data, error } = await supabase
    .from("reservations")
    .update({
      name: form.name,
      phone: form.phone || null,
      notes: form.notes || null,
      status: form.status || "Потвърдена",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id,date,name,phone,notes,status")
    .single();

  if (error) throw error;
  return fromRow(data);
}

export async function deleteReservation(id) {
  const { error } = await supabase
    .from("reservations")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
