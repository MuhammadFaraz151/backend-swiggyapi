import express from "express";
import cors from "cors";
import { getSwiggyHeaders, invalidateCookies } from "./cookieManager.js";

const app = express();
app.use(cors());

async function swiggyFetch(url) {
  const headers = await getSwiggyHeaders();
  const response = await fetch(url, { method: "GET", headers });
  const text = await response.text();

  if (!text || text.includes("<!DOCTYPE")) {
    console.log("⚠️ Got HTML — invalidating cookies and retrying once...");
    invalidateCookies();
    const freshHeaders = await getSwiggyHeaders();
    const retry = await fetch(url, { method: "GET", headers: freshHeaders });
    const retryText = await retry.text();
    if (!retryText || retryText.includes("<!DOCTYPE")) {
      throw new Error("Blocked even after refresh");
    }
    return JSON.parse(retryText);
  }

  return JSON.parse(text);
}

app.get("/api/menu/:id", async (req, res) => {
  const { id } = req.params;
  const url = `https://www.swiggy.com/dapi/menu/pl?page-type=REGULAR_MENU&complete-menu=true&lat=28.7040592&lng=77.10249019999999&restaurantId=${id}&catalog_qa=undefined&submitAction=ENTER`;
  try {
    const data = await swiggyFetch(url);
    return res.json({ success: true, data });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message });
  }
});

app.get("/api/restaurants", async (req, res) => {
  const url = `https://www.swiggy.com/dapi/restaurants/list/v5?lat=18.9690247&lng=72.8205292&is-seo-homepage-enabled=true&page_type=DESKTOP_WEB_LISTING`;
  try {
    const data = await swiggyFetch(url);
    return res.json({ success: true, data });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});