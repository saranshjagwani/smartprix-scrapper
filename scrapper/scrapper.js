import puppeteer from "puppeteer";
import fs from "fs";


// Helper function to dynamically resolve affiliate hops quickly
/**
 * Solid, loop-based redirection resolver that guarantees tracking the link
 * until it completely exits the smartprix ecosystem and hits the destination store.
 */
async function resolveCleanLink(browser, affiliateUrl) {
  const page = await browser.newPage();
  try {
    // 1. Optimize performance by cutting out heavy visual assets
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const type = req.resourceType();
      if (["image", "stylesheet", "font", "media"].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // 2. Set a modern, realistic user agent to prevent bot-detection blocking the hop
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );

    // 3. Fire the initial navigation

    await page.goto(affiliateUrl, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // 4. 🚀 The Ironclad Core: Wait and check until the URL leaves smartprix
    let currentUrl = page.url();
    const startTime = Date.now();
    const maxWaitTime = 15000; // Give client-side JS redirects up to 15 seconds to hop

    while (
      currentUrl.includes("smartprix.com/l") ||
      currentUrl.includes("l.smartprix.com")
    ) {
      // Check if we've been spinning our wheels too long
      if (Date.now() - startTime > maxWaitTime) {
        console.warn(`⏳ Redirection loop timed out for URL.`);
        break;
      }

      // Pause for half a second before inspecting the frame again
      await new Promise((r) => setTimeout(r, 500));
      currentUrl = page.url();
    }

    // 5. Clean up the final destination URL
    const finalUrl = new URL(currentUrl);

    // Expanded array covering general, Flipkart, Amazon, and Croma tracking wrappers
    const trackers = [
      "affid",
      "affExtParam1",
      "affExtParam2",
      "tag",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "clickid",
      "cclid",
      "ascsubtag",
      "uuid",
      "ncid",
    ];

    // Purge the tracking parameters automatically
    trackers.forEach((param) => finalUrl.searchParams.delete(param));
  } catch (err) {
    console.error(`❌ Tracking path broke entirely:`, err.message);
    return affiliateUrl; // Ultimate safe fallback
  } finally {
    await page.close();
  }
}
export async function scrapeSmartprix(url) {
  const isWindows = process.platform === "win32";

let executablePath;

if (isWindows) {
  executablePath =
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
} else {
  executablePath = await puppeteer.executablePath();
}


console.log("Chrome Path:", chromePath);
console.log("Exists:", fs.existsSync(chromePath));

const launchOptions = await puppeteer.launch({
  executablePath,
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
  ],
});
const chromePath = await puppeteer.executablePath();


  let browser;

  try {
    browser = await puppeteer.launch(launchOptions); 
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    );
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2500));

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    );
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 2500));

    const data = await page.evaluate(() => {
      const result = {
        specs_score: null,
        user_rating: null,
        user_rating_count: null,
        images: [],
        features: [],
        raw_stores: [],
      };

      // --- 1. Base JSON Extractions ---
      try {
        const wayScript = document.getElementById("__WAY_JSON__");
        if (wayScript) {
          const wayJson = JSON.parse(wayScript.innerText);
          const item = wayJson?.$way?.props?.item;
          if (item) {
            result.specs_score = item.specsScore || null;
            result.user_rating = item.rating
              ? +(item.rating / 20).toFixed(1)
              : null;
            result.user_rating_count = item.ratingCount || null;
            if (item.imageId) {
              result.images.push(
                `https://cdn1.smartprix.com/rx-i${item.imageId}-w420-h420/${item.imageId}.webp`,
              );
            }
            if (Array.isArray(item.features)) {
              result.features = item.features.map((f) => f.text);
            }
          }
        }
      } catch (_) {}

      // --- 2. Fallbacks for Imagery / Scores ---
      document.querySelectorAll(".pg-prd-imgs img").forEach((img) => {
        if (
          img.src &&
          img.src.includes("cdn1.smartprix.com") &&
          !result.images.includes(img.src)
        ) {
          result.images.push(img.src);
        }
      });
      if (!result.specs_score) {
        const scoreEl = document.querySelector(".pg-prd-s-score .score");
        if (scoreEl)
          result.specs_score = parseInt(scoreEl.innerText.trim()) || null;
      }

      // --- 3. 🛒 STRATEGY A: Out of Stock Box Rows (.sm-pc-item) ---
      const gridItems = document.querySelectorAll(".sm-pc-item");
      gridItems.forEach((item) => {
        const logoImg = item.querySelector(".logo img");
        const priceEl = item.querySelector(".price");
        const linkEl = item.querySelector("a[href*='smartprix.com/l']");
        const stockTag = item.querySelector(".stock-tag");

        if (priceEl && linkEl) {
          const name = logoImg ? (logoImg.alt || "").trim() : "Store";
          const stockStatus = stockTag ? stockTag.innerText.trim() : "IN_STOCK";

          result.raw_stores.push({
            name: name.toLowerCase(),
            price: priceEl.innerText.trim(),
            stock_status: stockStatus,
            link: linkEl.href,
          });
        }
      });

      // --- 4. STRATEGY B: Standard In-Stock Fallback Elements ---
      if (result.raw_stores.length === 0) {
        const primaryBtn = document.querySelector(".pg-prd-pricewrap .buy-btn");
        const primaryPrice = document.querySelector(".pg-prd-pricewrap .price");
        if (primaryBtn && primaryPrice) {
          result.raw_stores.push({
            name: (
              primaryBtn.querySelector("img")?.alt || "Store"
            ).toLowerCase(),
            price: primaryPrice.innerText.trim(),
            stock_status: "IN_STOCK",
            link: primaryBtn.href,
          });
        }

        document.querySelectorAll(".sm-store-strip li a").forEach((row) => {
          const nameEl = row.querySelector(".name span");
          const priceEl = row.querySelector(".price");
          if (nameEl && priceEl && row.href) {
            result.raw_stores.push({
              name: nameEl.innerText.trim().toLowerCase(),
              price: priceEl.innerText.trim(),
              stock_status: "IN_STOCK",
              link: row.href,
            });
          }
        });
      }

      // Deduplicate elements safely based on link signature
      const seen = new Set();
      result.raw_stores = result.raw_stores.filter((item) => {
        return seen.has(item.link) ? false : seen.add(item.link);
      });

      return result;
    });

    // --- 5. Resolve Redirects and Format Output Data ---
    const cleanProviders = [];
    let absoluteMinPrice = Infinity;

    if (data?.raw_stores) {
      for (const store of data.raw_stores) {
        // Resolve Tracking Endpoint
        const cleanLink = await resolveCleanLink(browser, store.link);

        // Compute integer price value for calculations
        const numericPrice =
          parseInt(store.price.replace(/[^\d]/g, ""), 10) || 0;

        // We track the lowest price among available listings
        if (numericPrice > 0 && numericPrice < absoluteMinPrice) {
          absoluteMinPrice = numericPrice;
        }

        cleanProviders.push({
          name: store.name,
          price: store.price,
          stock_status: store.stock_status,
          tracking_url: store.link,
          real_url: cleanLink,
        });
      }
    }

    // Assign mapped structure payloads
    data.providers = cleanProviders;
    data.best_price =
      absoluteMinPrice === Infinity
        ? null
        : `₹${absoluteMinPrice.toLocaleString("en-IN")}`;

    // Global flag: true if every single scraped provider reports "OUT OF STOCK"
    data.is_entirely_oos =
      cleanProviders.length > 0 &&
      cleanProviders.every((p) => p.stock_status === "OUT OF STOCK");

    delete data.raw_stores;
    return data;
  } catch (error) {
    console.error(`❌ Scraping failure on link: ${url}`, error.message);
    return null;
  } finally {
    if (browser) {
    await browser.close();
  }
  }
}
