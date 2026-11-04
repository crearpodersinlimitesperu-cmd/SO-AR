import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import puppeteer from 'puppeteer';
import { readFileSync } from 'node:fs';
import { canReadIndividualPulse } from '../src/services/pulsePrivacy.js';

test('provisional pulse policy excludes simulated, inactive and managerial individual readers', () => {
  for (const user of [{ role: 'gerente' }, { role: 'observador' }, { role: 'consolidado' },
    { role: 'direccion', active: false }, { role: 'direccion', isSimulated: true }]) {
    assert.equal(canReadIndividualPulse(user), false);
  }
  assert.equal(canReadIndividualPulse({ role: 'direccion' }), true);
  const service = readFileSync(new URL('../src/services/googleChatService.js', import.meta.url), 'utf8');
  const start = service.indexOf('export async function sendReportToGoogleChat');
  const fn = service.slice(start).replace('export ', '');
  const send = new Function('getGoogleChatWebhookConfig', `${fn}; return sendReportToGoogleChat;`)(() => {
    throw new Error('Private pulse must not consult shared-channel configuration');
  });
  return send({ type: 'MicroPulsoStaff', data: { respuestas: 'SECRET' } })
    .then(result => assert.deepEqual(result, { success: false, reason: 'private_report' }));
});

test('real ReportesBoard gives managers counts only and removes Direction answers on account/scope changes', async () => {
  const entry = `${process.cwd()}/pulse-fixture.jsx`;
  const server = await createServer({
    configFile: false, server: { host: '127.0.0.1', port: 0, hmr: false },
    plugins: [react(), {
      name: 'pulse-privacy-fixture', enforce: 'pre',
      resolveId(id) {
        if (id === '/pulse-fixture.jsx') return entry;
        if (['../services/firebase', './firebase'].includes(id)) return '\0pulse:firebase';
        if (id === 'firebase/firestore') return '\0pulse:firestore';
        if (id === '../context/AuthContext') return '\0pulse:auth';
        if (id === '../context/CyclesContext') return '\0pulse:cycles';
        if (id === '../context/UIContext') return '\0pulse:ui';
        if (id === '../services/googleChatService') return '\0pulse:chat';
      },
      load(id) {
        if (id === '\0pulse:firebase') return 'export const db={}; export const auth={currentUser:null}; window.fixtureAuth=auth;';
        if (id === '\0pulse:auth') return 'export const useAuth=()=>({currentUser:window.viewer});';
        if (id === '\0pulse:cycles') return 'const cycles={events:[],loadingEvents:false,currentCycle:null,currentStage:"C1"}; export const useCycles=()=>cycles;';
        if (id === '\0pulse:ui') return 'const ui={showToast:()=>{}}; export const useUI=()=>ui;';
        if (id === '\0pulse:chat') return `export const getGoogleChatWebhookConfig=async()=>({enabled:false});
          export const saveGoogleChatWebhookConfig=async()=>true; export const sendReportToGoogleChat=async()=>({success:true});`;
        if (id === '\0pulse:firestore') return `
          export const collection=(db,name)=>({name});
          export const doc=(...args)=>({args});
          export const where=(field,op,value)=>({field,op,value});
          export const orderBy=(...order)=>({order});
          export const limit=value=>({limit:value});
          export const query=(ref,...constraints)=>({ref,constraints});
          export const getDocs=async q=>{
            window.reportQueries.push(q);
            const pulse=q.constraints?.some(c=>c.field==='type'&&c.value==='MicroPulsoStaff');
            if(pulse&&window.holdPulse) await new Promise(resolve=>window.pendingPulse.push(resolve));
            return {metadata:{fromCache:false},docs:pulse?[{id:'pulse',data:()=>({
              type:'MicroPulsoStaff',sede:'Lima',created_at:'2026-11-04',data:{trimAndStack:'PRIVATE_PULSE_ANSWER'}
            })}]:[]};
          };
          export const getDocsFromServer=getDocs;
          export const onSnapshot=(q,next)=>{next({metadata:{fromCache:false},docs:[]});return ()=>{};};
          export const updateDoc=async()=>{}; export const addDoc=async()=>({id:'new'});
        `;
        if (id === entry) return `
          import React,{useState} from 'react';
          import {createRoot} from 'react-dom/client';
          import {MemoryRouter} from 'react-router-dom';
          import ReportesBoard from '/src/pages/ReportesBoard.jsx';
          window.reportQueries=[]; window.pendingPulse=[];
          window.fetch=async (url,options)=>{
            if(String(url).endsWith('/private-pulse-summary')) return Response.json({
              snapshot:{authorizedSedes:[window.viewer.sede],reportCount:7}
            });
            if(String(url).endsWith('/nodus-private-report-sources')) return Response.json({
              snapshot:{authorizedSedes:['Lima'],authorizedStages:['C1'],reportSources:[],missingSources:[]}
            });
            throw new Error('Forbidden network path');
          };
          function Fixture(){
            const [viewer,setViewer]=useState({uid:'alpha',email:'alpha@example.invalid',role:'gerente',roles:['gerente'],sede:'Lima'});
            window.viewer=viewer; window.swapViewer=setViewer;
            window.fixtureAuth.currentUser={uid:viewer.uid,getIdToken:async()=>'synthetic-'+viewer.uid};
            return <MemoryRouter><ReportesBoard/></MemoryRouter>;
          }
          createRoot(document.getElementById('root')).render(<Fixture/>);
        `;
      },
      configureServer(vite) {
        vite.middlewares.use((req, res, next) => {
          if (req.url !== '/pulse-test') return next();
          res.setHeader('Content-Type', 'text/html');
          res.end('<link rel="icon" href="data:,"><div id="root"></div><script type="module" src="/pulse-fixture.jsx"></script>');
        });
      }
    }]
  });
  let browser;
  try {
    await server.listen();
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (new URL(request.url()).hostname === '127.0.0.1' || request.url().startsWith('data:')) request.continue();
      else request.abort();
    });
    await page.goto(`${server.resolvedUrls.local[0]}pulse-test`);
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Evolución')));
    await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Evolución')).click());
    await page.waitForFunction(() => document.body.textContent.includes('7 reportes'));
    assert.doesNotMatch(await page.$eval('body', el => el.textContent), /PRIVATE_PULSE_ANSWER/);
    assert.equal(await page.evaluate(() => window.reportQueries.some(q =>
      q.constraints?.some(c => c.field === 'type' && c.value === 'MicroPulsoStaff'))), false);
    await page.evaluate(() => window.swapViewer({ ...window.viewer, role: 'direccion', roles: ['direccion'] }));
    await page.waitForFunction(() => document.body.textContent.includes('PRIVATE_PULSE_ANSWER'));
    await page.evaluate(() => window.swapViewer({ ...window.viewer, role: 'gerente', roles: ['gerente'] }));
    await page.waitForFunction(() => !document.body.textContent.includes('PRIVATE_PULSE_ANSWER'));
    await page.evaluate(() => {
      window.holdPulse = true;
      window.swapViewer({ ...window.viewer, role: 'direccion', roles: ['direccion'] });
    });
    await page.waitForFunction(() => window.pendingPulse.length > 0);
    await page.evaluate(() => window.swapViewer({
      uid: 'beta', email: 'beta@example.invalid', role: 'gerente', roles: ['gerente'], sede: 'Quito'
    }));
    await page.waitForFunction(() => document.body.textContent.includes('Gerencia solo recibe el agregado'));
    await page.evaluate(() => window.pendingPulse.splice(0).forEach(resolve => resolve()));
    await page.waitForFunction(() => document.body.textContent.includes('7 reportes'));
    assert.doesNotMatch(await page.$eval('body', el => el.textContent), /PRIVATE_PULSE_ANSWER/);
    await page.evaluate(() => {
      Math.random = () => 0.6;
      [...document.querySelectorAll('button')].find(b => b.textContent.includes('Enviar Reportes')).click();
    });
    await page.waitForFunction(() => [...document.querySelectorAll('select')].some(el =>
      [...el.options].some(option => option.value === 'MicroPulsoStaff')));
    await page.evaluate(() => {
      const select = [...document.querySelectorAll('select')].find(el =>
        [...el.options].some(option => option.value === 'MicroPulsoStaff'));
      select.value = 'MicroPulsoStaff';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForSelector('textarea[placeholder^="Escribe aquí"]');
    await page.type('textarea[placeholder^="Escribe aquí"]', 'PRIVATE_UNSUBMITTED_DRAFT');
    assert.equal(await page.$eval('textarea[placeholder^="Escribe aquí"]', el => el.value), 'PRIVATE_UNSUBMITTED_DRAFT');
    await page.evaluate(() => window.swapViewer({ ...window.viewer, uid: 'gamma', email: 'gamma@example.invalid' }));
    await page.waitForFunction(() => document.querySelector('textarea[placeholder^="Escribe aquí"]')?.value === '');
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});
