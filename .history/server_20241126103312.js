import express from "express";
import bodyParser from "body-parser";
import { chromium } from "playwright";
import fs from "fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

// Serve index.html for the root path
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});
// Your existing logic remains the same
const compareImages = async (img1Path, img2Path, diffPath) => {
  const img1 = PNG.sync.read(fs.readFileSync(img1Path));
  const img2 = PNG.sync.read(fs.readFileSync(img2Path));
  const { width, height } = img1;
  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold: 0.1 });
  fs.writeFileSync(diffPath, PNG.sync.write(diff));
  return numDiffPixels;
};

const captureScreenshot = async (browser, url, screenshotPath) => {
  const page = await browser.newPage();
  await page.goto(url);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await page.close();
};

app.post("/compare", async (req, res) => {
  const { domain1, domain2, urlPath } = req.body;

  if (!domain1 || !domain2 || !urlPath) {
    return res.status(400).json({ success: false, error: "Invalid input" });
  }

  const browser = await chromium.launch();
  const site1URL = `${domain1}${urlPath}`;
  const site2URL = `${domain2}${urlPath}`;
  const site1Screenshot = "public/site1.png";
  const site2Screenshot = "public/site2.png";
  const diffScreenshot = "public/diff.png";

  try {
    await captureScreenshot(browser, site1URL, site1Screenshot);
    await captureScreenshot(browser, site2URL, site2Screenshot);

    const diffPixels = await compareImages(site1Screenshot, site2Screenshot, diffScreenshot);

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

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
