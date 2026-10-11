import { readFile, writeFile, mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer';

const input = await readFile('public/leones_bg_v2.jpg');
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_BIN || await puppeteer.executablePath() });
try {
  const page = await browser.newPage();
  const result = await page.evaluate(async base64 => {
    const image = new Image();
    image.src = `data:image/jpeg;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const original = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const webp = canvas.toDataURL('image/webp', 0.88);
    if (!webp.startsWith('data:image/webp;')) throw new Error('Browser does not support WebP encoding');
    const compressed = new Image();
    compressed.src = webp;
    await compressed.decode();
    context.drawImage(compressed, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let squaredError = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      for (let channel = 0; channel < 3; channel++) squaredError += (pixels[index + channel] - original[index + channel]) ** 2;
    }
    return { base64: webp.split(',')[1], width: canvas.width, height: canvas.height, psnrDb: 10 * Math.log10(255 ** 2 / (squaredError / (pixels.length * 3 / 4))) };
  }, input.toString('base64'));
  const output = Buffer.from(result.base64, 'base64');
  await mkdir('src/assets', { recursive: true });
  await writeFile('src/assets/login-background.webp', output);
  console.log(JSON.stringify({ sourceBytes: input.length, webpBytes: output.length, width: result.width, height: result.height, quality: 0.88, psnrDb: result.psnrDb }));
  const logo = await readFile('public/causa-logo.png');
  const iconBase64 = await page.evaluate(async base64 => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    context.imageSmoothingQuality = 'high';
    const scale = Math.min(32 / image.naturalWidth, 32 / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(image, (32 - width) / 2, (32 - height) / 2, width, height);
    return canvas.toDataURL('image/png').split(',')[1];
  }, logo.toString('base64'));
  const icon = Buffer.from(iconBase64, 'base64');
  await writeFile('src/assets/causa-icon.png', icon);
  console.log(JSON.stringify({ logoBytes: logo.length, faviconBytes: icon.length, width: 32, height: 32 }));
} finally {
  await browser.close();
}
