import { getPhones } from "./getPhones.js";
import { updateSmartprixVariant } from "./updateVariant.js";
import { scrapeSmartprix } from "../scrapper/scrapper.js";


/**
 * 📈 PROCESS 1: DAILY PRICE & STOCK SYNCHRONIZER
 * Runs fast, drops overhead, updates live pricing tables daily.
 */


const parseNumericPrice = (priceStr) => {
  if (!priceStr) return null;
  const cleaned = priceStr.toString().replace(/[^\d]/g, ""); // Strips "₹" and ","
  return cleaned ? parseInt(cleaned, 10) : null;
};



export async function processMonthlySpecs() {
  const phones = await getPhones();
  console.log(
    `🧠 Starting deep specifications sync for ${phones.length} variants...`,
  );

  for (const phone of phones) {
    
  try {
    const { id, variant_name } = phone;
    const variant = phone.scrapper_json;

    if (!variant) continue;

    // ── SMARTPRIX ─────────────────────────────────────────────
    if (variant.smartprix?.link) {
      const scraped = await scrapeSmartprix(variant.smartprix.link);

      if (scraped) {
        variant.smartprix.images = scraped.images ?? variant.smartprix.images;
        variant.smartprix.specs_score =
          scraped.specs_score ?? variant.smartprix.specs_score;
        variant.smartprix.user_rating =
          scraped.user_rating ?? variant.smartprix.user_rating;
        variant.smartprix.user_rating_count =
          scraped.user_rating_count ?? variant.smartprix.user_rating_count;
        variant.smartprix.features =
          scraped.features ?? variant.smartprix.features;

        // 🌟 1. Save all structured providers with both URL variants & stock flags
        variant.smartprix.providers = scraped.providers ?? [];

        // 🌟 2. Save the globally tracked best localized price match
        variant.smartprix.best_price =
          scraped.best_price ?? variant.smartprix.best_price;

        // 🌟 3. Track absolute stock out status across the network
        variant.smartprix.is_out_of_stock = scraped.is_entirely_oos ?? false;

        variant.smartprix.last_updated = new Date().toISOString();

        console.log(
          `✅ Smartprix ${id} - ${variant_name} | Best Price: ${scraped.best_price} | OOS Globally: ${scraped.is_entirely_oos} | Providers: ${scraped.providers?.length}`,
        );

        // Save back current price safely without overwriting your tracking layers
        const currentPrice =
          scraped.best_price ||
          phone.price ||
          variant.buyhatke?.best_price ||
          null;
        variant.updatedAt = new Date().toISOString();

        await updateSmartprixVariant(id, variant, parseNumericPrice(currentPrice));
      }

      await new Promise((r) => setTimeout(r, 1500));
    }
  }
   catch (err) {
    console.error(`❌ Failed processing phone ${phone.id}:`, err.message);
    continue;
  }

   
  }
}
