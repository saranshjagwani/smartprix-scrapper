// src/services/updateVariant.js
import { supabase } from "../config/supabaseClient.js";


/**
 * Safely updates or initializes smartprix metrics inside a variant record
 * without overwriting other nested provider blocks.
 * 
 * @param {string|number} id - The row ID target
 * @param {Object} smartprixData - The freshly scraped smartprix block (images, specs_score, providers, etc.)
 * @param {number|string|null} rawPrice - The raw price string or number to be flattened
 */
/**
 * Safely updates or initializes smartprix metrics inside a variant record
 * using the new dedicated 'smartprix_scrapper' column.
 * 
 * @param {string|number} id - The row ID target
 * @param {Object} smartprixData - The freshly scraped smartprix block (images, specs_score, providers, etc.)
 * @param {number|string|null} rawPrice - The raw price string or number to be flattened
 */
export async function updateSmartprixVariant(id, smartprixData, rawPrice) {
  // 1. Convert price safely into a clean Integer for the flat DB column
  let flatPrice = null;
  if (rawPrice) {
    const cleaned = rawPrice.toString().replace(/[^\d]/g, "");
    if (cleaned) flatPrice = parseInt(cleaned, 10);
  }

  console.log(`🔄 Processing Smartprix update for ID [${id}] | Target Price: ${flatPrice}`);

  try {
    // 2. Fetch current smartprix_scrapper state to check for existing data
    const { data: row, error: fetchError } = await supabase
      .from("sahilo_variant_data")
      .select("smartprix_scrapper")
      .eq("id", id)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") { // Ignore "no rows found", handle actual database errors
      console.error(`❌ Failed to fetch current variant JSON for ID [${id}]:`, fetchError.message);
      return;
    }

    // 3. Handle data migration safely. If the new column is completely empty, 
    // fall back to a blank object container
    let currentSmartprixJson = row?.smartprix_scrapper || {};
    if (typeof currentSmartprixJson !== "object" || currentSmartprixJson === null) {
      currentSmartprixJson = {};
    }

    // 4. Construct the clean, updated payload strictly for the Smartprix space
    const updatedSmartprixJson = {
      ...currentSmartprixJson, // Preserve any existing specific metrics
      images: smartprixData.images ?? currentSmartprixJson.images ?? [],
      specs_score: smartprixData.specs_score ?? currentSmartprixJson.specs_score ?? null,
      user_rating: smartprixData.user_rating ?? currentSmartprixJson.user_rating ?? null,
      user_rating_count: smartprixData.user_rating_count ?? currentSmartprixJson.user_rating_count ?? null,
      features: smartprixData.features ?? currentSmartprixJson.features ?? [],
      providers: smartprixData.providers ?? currentSmartprixJson.providers ?? [],
      best_price: smartprixData.best_price ?? currentSmartprixJson.best_price ?? null,
      is_out_of_stock: smartprixData.is_entirely_oos ?? currentSmartprixJson.is_out_of_stock ?? false,
      last_updated: new Date().toISOString()
    };

    // 5. Commit updates back to your explicit table columns (Removed 'updatedAt' to stop the crash)
    const { error: updateError } = await supabase
      .from("sahilo_variant_data")
      .update({
        smartprix_scrapper: updatedSmartprixJson, // Saved to its safe new home 🚀
        price: flatPrice                          // Clean numeric value for easy filtering
      })
      .eq("id", id);

    if (updateError) {
      console.error(`❌ Database Multi-Column Update error on ID [${id}]:`, updateError.message);
    } else {
      console.log(`✅ Successfully synced Smartprix metrics into 'smartprix_scrapper' column for ID [${id}]`);
    }

  } catch (err) {
    console.error(`❌ Unexpected error running updateSmartprixVariant on ID [${id}]:`, err.message || err);
  }
}