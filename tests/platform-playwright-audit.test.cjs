// Varredura permanente da interface com Playwright: executada no CI contra o build real.
const { check, summary, launchBrowser, mockRoutes, baseKvStore, loginTeacher } = require("./helpers.cjs");

function contentPayload(url) {
  const provider = new URL(url).searchParams.get("provider");
  if (provider === "weather") return { provider, attribution:"Open-Meteo", data:{ current:{ temperature_2m:24, apparent_temperature:24, weather_code:1, is_day:1 }, daily:{ temperature_2m_min:[18], temperature_2m_max:[28] } } };
  if (provider === "time") return { provider, attribution:"TimeAPI.io", data:{ dateTime:new Date().toISOString() } };
  return { provider, attribution:"Teste", data:{} };
}

async function inspectViewport(browser, viewport, label) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const jsErrors = await mockRoutes(page, baseKvStore());
  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", msg => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("requestfailed", req => {
    if (!/fonts\.(googleapis|gstatic)\.com/.test(req.url())) failedRequests.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText || "falhou"}`);
  });
  await page.route("**/api/public-content**", route => route.fulfill({ status:200, contentType:"application/json", body:JSON.stringify(contentPayload(route.request().url())) }));

  await page.goto(process.env.TEST_BASE_URL || "http://localhost:4173", { waitUntil:"domcontentloaded" });
  await page.waitForTimeout(1200);

  const audit = await page.evaluate(() => {
    const visible = element => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
    };
    const buttonsWithoutName = [...document.querySelectorAll("button")].filter(visible).filter(button => !(button.innerText || button.getAttribute("aria-label") || button.getAttribute("title") || "").trim()).map(button => button.outerHTML.slice(0,160));
    const brokenImages = [...document.images].filter(visible).filter(image => image.complete && image.naturalWidth === 0).map(image => image.currentSrc || image.src);
    const ids = [...document.querySelectorAll("[id]")].map(element => element.id);
    const duplicateIds = [...new Set(ids.filter((id,index) => id && ids.indexOf(id) !== index))];
    const unsafeBlankLinks = [...document.querySelectorAll('a[target="_blank"]')].filter(link => !/noopener|noreferrer/.test(link.rel)).map(link => link.href);
    return {
      textLength: document.body.innerText.trim().length,
      overlay: Boolean(document.querySelector(".vite-error-overlay, #webpack-dev-server-client-overlay, [data-nextjs-dialog]")),
      horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth,
      buttonsWithoutName,
      brokenImages,
      duplicateIds,
      unsafeBlankLinks,
    };
  });

  check(`${label}: página possui conteúdo`, audit.textLength > 80, `texto=${audit.textLength}`);
  check(`${label}: sem tela de erro do framework`, !audit.overlay);
  check(`${label}: sem erro JavaScript não tratado`, jsErrors.length === 0, jsErrors.join(" | "));
  check(`${label}: sem imagem visível quebrada`, audit.brokenImages.length === 0, audit.brokenImages.join(" | "));
  check(`${label}: sem rolagem horizontal inesperada`, audit.horizontalOverflow <= 4, `excesso=${audit.horizontalOverflow}px`);
  check(`${label}: sem IDs duplicados`, audit.duplicateIds.length === 0, audit.duplicateIds.join(", "));
  check(`${label}: links externos seguros`, audit.unsafeBlankLinks.length === 0, audit.unsafeBlankLinks.join(" | "));
  check(`${label}: botões visíveis possuem nome acessível`, audit.buttonsWithoutName.length === 0, audit.buttonsWithoutName.join(" | "));
  check(`${label}: sem falha de rede inesperada`, failedRequests.length === 0, failedRequests.join(" | "));
  check(`${label}: sem console.error`, consoleErrors.length === 0, consoleErrors.join(" | "));

  await context.close();
}

(async()=>{
  const browser = await launchBrowser();
  await inspectViewport(browser, { width:1440, height:950 }, "desktop");
  await inspectViewport(browser, { width:390, height:844 }, "celular");

  const context = await browser.newContext({ viewport:{ width:1366, height:900 } });
  const page = await context.newPage();
  const jsErrors = await mockRoutes(page, baseKvStore());
  await page.route("**/api/public-content**", route => route.fulfill({ status:200, contentType:"application/json", body:JSON.stringify(contentPayload(route.request().url())) }));
  await loginTeacher(page);
  check("login do professor chega ao painel", await page.locator("text=Painel do Professor").count() > 0);
  check("painel do professor não gera erro JS", jsErrors.length === 0, jsErrors.join(" | "));
  await context.close();
  await browser.close();
  process.exit(summary("VARREDURA PLAYWRIGHT DA PLATAFORMA") ? 0 : 1);
})().catch(error=>{console.error("FATAL",error.stack||error.message);process.exit(1);});
