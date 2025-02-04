const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

exports.handler = async (event) => {
  console.log(event);
  const body =
    typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  let url = body && body.url ? body.url : "https://news.treeofalpha.com/";

  if (!event || !url) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "URL parameter is required" }),
    };
  }

  try {
    urlSettings = new URL(url + "settings").toString();
    urlHome = new URL(url).toString();
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid URL format" }),
    };
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      args: [
        "--disable-setuid-sandbox",
        "--no-first-run",
        "--no-sandbox",
        "--no-zygote",
        "--single-process",
        "--disable-features=IsolateOrigins,site-per-process",
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768 });

    page.setDefaultNavigationTimeout(60 * 1000);
    page.setDefaultTimeout(60 * 1000);
    await page.goto(urlSettings, {
      waitUntil: ["domcontentloaded"],
      timeout: 60 * 1000,
    });

    const clickedShowFullText = await page.evaluate(() => {
      // Find and click the checkbox
      const label = document.querySelector('label[for="showFullText"]');
      console.log("label found?: ", label);
      if (label) {
        label.click();
        console.log("clicked to show fullText");
        return true;
      } else {
        return false;
      }
    });

    if (!clickedShowFullText) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Failed to click show fullText" }),
        headers: {
          "Content-Type": "application/json",
        },
      };
    }

    await page.goto(urlHome, {
      waitUntil: "networkidle2",
      timeout: 30 * 1000,
    });
    console.log("start scrapping");

    const twitterAccounts = await page.evaluate(
      async () => {
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        // Scroll to the bottom of the twitter feed
        const scroller = document.querySelector(
          '[data-test-id="virtuoso-scroller"]'
        );
        console.log("scroller found?: ", scroller);
        if (scroller) {
          const totalHeight = scroller.scrollHeight;
          const scrollStep = totalHeight * 0.1; // 10% of total height
          let currentScroll = 0;

          const allAccounts = new Set(); // Use Set to avoid duplicates

          while (currentScroll < totalHeight) {
            // Scroll to next position
            currentScroll = Math.min(currentScroll + scrollStep, totalHeight);
            scroller.scrollTo(0, currentScroll);

            // Wait for content to load
            await wait(500); // Adjust timing as needed

            // Collect accounts in current viewport
            const spans = document.querySelectorAll("span.twitterAccount");
            spans.forEach((span) => {
              const parentA = span.parentElement;
              const contentWrapper = parentA.closest(".contentWrapper");
              const originTime = contentWrapper
                ? contentWrapper.querySelector(".originTime")
                : null;

              allAccounts.add(
                JSON.stringify({
                  name: span.textContent.trim(),
                  url: parentA ? parentA.href : null,
                  content: parentA ? parentA.textContent.trim() : null,
                  timeStamp: originTime ? originTime.textContent.trim() : null,
                })
              );
            });
          }

          // Convert Set back to array of objects
          return Array.from(allAccounts).map((item) => JSON.parse(item));
        }
        return [];
      },
      {
        timeout: 30 * 1000,
      }
    );

    console.log(twitterAccounts);
    // const element = await page?.$("#shotbot-target");
    // const boundingBox = await element?.boundingBox();
    // await delay(15000);

    // const imgData = await page?.screenshot({
    //   clip: {
    //     x: boundingBox?.x ?? 0,
    //     y: boundingBox?.y ?? 0,
    //     width: boundingBox?.width ?? 1024,
    //     height: boundingBox?.height ?? 768,
    //   },
    //   encoding: "base64",
    // });

    // let base64Encode = `data:image/png;base64,${imgData}`;
    // console.log(base64Encode);
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: twitterAccounts,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
  } catch (error) {
    console.error("An error occurred:", error);
    // throw error;
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
      headers: {
        "Content-Type": "application/json",
      },
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
