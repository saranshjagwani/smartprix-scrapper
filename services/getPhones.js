// src/services/getPhones.js
import { supabase } from "../config/supabaseClient.js";

export async function getPhones() {
  const { data, error } = await supabase
    .from("sahilo_variant_data")
    .select("id, variant_name, scrapper_json"); 

  if (error) {
    console.error("❌ Database Fetch error:", error.message);
    return [];
  }
  return data;
}