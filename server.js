import express from "express";
import bodyParser from "body-parser";
import { chromium } from "playwright";
import fs from "fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import config from "./config.js";
import { handleDomainLogic } from "./atdove.js";

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

const captureScreenshot = async (browser, domain, urlPath, screenshotPath) => {
  const page = await browser.newPage();
  const isSpecialDomain = config.domains.includes(domain);

  if (isSpecialDomain) {
    await handleDomainLogic(page, domain, urlPath, config.users);
  } else {
    await page.goto(`${domain}${urlPath}`);
  }

  await page.screenshot({ path: screenshotPath, fullPage: false });
  await page.close();
};

app.post("/compare", async (req, res) => {
  const { domain1, domain2, urlPath } = req.body;

  if (!domain1 || !domain2 || !urlPath) {
    return res.status(400).json({ success: false, error: "Invalid input" });
  }

  const browser = await chromium.launch();
  const site1Screenshot = "public/site1.png";
  const site2Screenshot = "public/site2.png";
  const diffScreenshot = "public/diff.png";

  try {
    await captureScreenshot(browser, domain1, urlPath, site1Screenshot);
    await captureScreenshot(browser, domain2, urlPath, site2Screenshot);

    const diffPixels = compareImages(site1Screenshot, site2Screenshot, diffScreenshot);

    await browser.close();
    res.json({
      success: true,
      diffPixels,
      diffImage: `/diff.png`,
    });
  } catch (error) {
    await browser.close();
    res.status(500).json({ success: false, error: error.message });
  }
});

const compareImages = (img1Path, img2Path, diffPath) => {
  const img1 = PNG.sync.read(fs.readFileSync(img1Path));
  const img2 = PNG.sync.read(fs.readFileSync(img2Path));
  const { width, height } = img1;

  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold: 0.1 });
  fs.writeFileSync(diffPath, PNG.sync.write(diff));

  return diffPixels;
};

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
