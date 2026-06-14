import puppeteer from "puppeteer";

let cachedCookies = null;
let lastFetched = 0;
let inflightPromise = null;
const COOKIE_TTL = 4 * 60 * 1000;

export async function getSwiggyHeaders() {
  const isExpired = Date.now() - lastFetched > COOKIE_TTL;

  if (!cachedCookies || isExpired) {
    if (!inflightPromise) {
      console.log("🔄 Cookies expired — launching Puppeteer...");
      inflightPromise = fetchFreshCookies()
        .then((cookies) => {
          cachedCookies = cookies;
          lastFetched = Date.now();
          console.log("✅ Cookies refreshed");
        })
        .catch((err) => {
          console.error("❌ Puppeteer failed:", err.message);
        })
        .finally(() => {
          inflightPromise = null;
        });
    }

    await inflightPromise;
  }

  return {
    accept: "*/*",
    "accept-language": "en-US,en;q=0.9",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    referer: "https://www.swiggy.com/",
    origin: "https://www.swiggy.com",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    cookie: cachedCookies,
  };
}

async function fetchFreshCookies() {
  console.log("🌐 Opening browser...");

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--single-process",
      "--no-zygote",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"
    );

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

    console.log("📡 Navigating to swiggy.com...");

    await page.goto("https://www.swiggy.com/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    console.log("⏳ Waiting for WAF cookies to set...");
    await new Promise((r) => setTimeout(r, 5000));

    const cookies = await page.cookies();
    console.log(`🍪 Got ${cookies.length} cookies`);

    if (cookies.length === 0) {
      throw new Error("No cookies received — Swiggy may have blocked the request");
    }

    return cookies.map((c) => `${c.name}=${c.value}`).join("; ");

  } finally {
    await browser.close();
    console.log("🔒 Browser closed");
  }
}

export function invalidateCookies() {
  cachedCookies = null;
  lastFetched = 0;
}