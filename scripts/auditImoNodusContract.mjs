// Read-only contract inspection. Output contains field names/counts, never people or credentials.
import puppeteer from 'puppeteer';
const origin = 'https://imo.crearpslglobal.com';
let stage='browser';
let observation={};
const browser = await puppeteer.launch({executablePath:process.env.CHROME_BIN,headless:true,args:['--no-sandbox','--disable-setuid-sandbox']});
try {
  if (!process.env.NODUS_USER || !process.env.NODUS_PASSWORD) throw new Error('Missing configured Nodus credentials');
  const page = await browser.newPage();
  stage='login-page';
  const navigation=await page.goto(origin+'/auth/login',{waitUntil:'networkidle2',timeout:60000});
  observation={httpStatus:navigation?.status(),loginForm:!!await page.$('input[name="usuario"]'),challenge:/captcha|challenge/i.test(page.url())};
  if (/captcha|challenge/i.test(page.url()) || await page.$('iframe[src*="captcha"]')) throw new Error('Nodus requires human verification; inspection stopped');
  stage='login-form';
  await page.locator('input[name="usuario"]').fill(process.env.NODUS_USER);
  await page.locator('input[name="password"]').fill(process.env.NODUS_PASSWORD);
  stage='login-submit';
  await Promise.all([page.waitForNavigation({waitUntil:'networkidle2',timeout:60000}),page.locator('button[type="submit"]').click()]);
  if (/login|captcha|challenge/i.test(page.url())) throw new Error('Nodus did not establish an authorized session');
  stage='participant-read';
  const result=await page.evaluate(async()=>{
    const response=await fetch('/participantessede/datosTabla?draw=1&start=0&length=100&id_sede=0&id_equipo=0');
    if(!response.ok) throw new Error('Read endpoint unavailable');
    const payload=await response.json();
    if(!Array.isArray(payload.data)) throw new Error('Unexpected participant contract');
    const rows=payload.data;
    const fields=[...new Set(rows.flatMap(Object.keys))].sort();
    const nonempty=Object.fromEntries(fields.map(key=>[key,rows.filter(row=>row[key]!==null&&row[key]!==undefined&&row[key]!=='').length]));
    const candidate=rows.find(row=>/^\d+$/.test(String(row.id)));
    let detailFields=[];
    if(candidate){
      const detail=await (await fetch('/participantessede/datos/'+candidate.id)).json();
      if(detail.ok && detail.p) detailFields=Object.keys(detail.p).sort();
    }
    return {total:payload.recordsTotal,sampled:rows.length,fields,nonempty,detailFields};
  });
  console.log('IMO_NODUS_CONTRACT '+JSON.stringify(result));
} catch(error) {
  // Do not print browser/network errors that can include authenticated URLs or form contents.
  console.error('IMO_NODUS_CONTRACT_FAILED '+JSON.stringify({stage,errorType:error.name,...observation}));
  process.exitCode=1;
} finally {await browser.close();}
