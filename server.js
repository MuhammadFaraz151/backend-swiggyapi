import express from "express";
import cors from "cors";
import { getSwiggyHeaders, invalidateCookies } from "./cookieManager.js";

const app = express();
app.use(cors());

app.get("/api/menu/:id", async (req, res) => {
  const { id } = req.params;
  const url = `https://www.swiggy.com/dapi/menu/pl?page-type=REGULAR_MENU&complete-menu=true&lat=28.7040592&lng=77.10249019999999&restaurantId=${id}&catalog_qa=undefined&submitAction=ENTER`;

  try {
    const headers = await getSwiggyHeaders();
    const response = await fetch(url, { method: "GET", headers });
    const text = await response.text();

    // Detect blocked response — cookie was rejected
    if (!text || text.includes("<!DOCTYPE")) {
      console.log("⚠️ Got HTML — invalidating cookies and retrying once...");
      invalidateCookies();                        // force Puppeteer on next call

      // Retry once with fresh cookies
      const freshHeaders = await getSwiggyHeaders();
      const retry = await fetch(url, { method: "GET", headers: freshHeaders });
      const retryText = await retry.text();

      if (!retryText || retryText.includes("<!DOCTYPE")) {
        return res.status(502).json({ success: false, error: "Blocked even after refresh" });
      }

      return res.json({ success: true, data: JSON.parse(retryText) });
    }

    return res.json({ success: true, data: JSON.parse(text) });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(5000, () => {
  console.log("✅ Server running on http://localhost:5000");
});