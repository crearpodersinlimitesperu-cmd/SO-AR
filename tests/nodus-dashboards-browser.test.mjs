import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import puppeteer from 'puppeteer';
import { scopedNodusContext } from '../cloudflare-worker/src/nodusJsonModel.js';

test('metric-only global projection retains team counts and availability flags without participant rosters', () => {
  const raw = {
    totales: { totalAsignados: 4 }, coordinadores: [{
      email: 'synthetic@example.invalid', sede: 'Lima', asignados: 4,
      metricasDisponibles: { asignados: true, gestiones: false, foreign: 'FOREIGN_SECRET' },
      equipos: [{ equipo: 'C1 E31', sedeInferida: 'Lima', llamadas: 3,
        participantes: [{ email: 'FOREIGN_PARTICIPANT' }] }]
    }],
    equiposSummary: [{ equipoId: 'official-id', equipoNombre: 'C1 E31 LIMA', totalParticipantes: 4,
      participantes: [{ email: 'FOREIGN_PARTICIPANT' }] }],
    secciones: { private: 'FOREIGN_RAW' }
  };
  const result = scopedNodusContext(raw, { type: 'metrics-global' });
  assert.equal(result.equiposSummary[0].totalParticipantes, 4);
  assert.equal(result.equiposSummary[0].equipoId, 'official-id');
  assert.equal(result.coordinadores[0].equipos[0].sedeInferida, 'Lima');
  assert.deepEqual(result.coordinadores[0].metricasDisponibles, { asignados: true, gestiones: false });
  assert.doesNotMatch(JSON.stringify(result), /FOREIGN/);
});

test('coordinator email is never inferred from partial names or a different Diana in the same sede', () => {
  const source = readFileSync(new URL('../src/components/NodusCoordinadoresC1C2Dashboard.jsx', import.meta.url), 'utf8');
  const start = source.indexOf('function resolveCoordinatorEmail(');
  const end = source.indexOf('const COLORS');
  const resolve = new Function(`${source.slice(start, end)}\nreturn resolveCoordinatorEmail;`)();
  for (const nombre of ['Diana', 'Diana Other Person', 'Joy', '']) {
    assert.equal(resolve({ nombre, sede: 'Lima' }), '');
  }
  assert.equal(resolve({ nombre: 'Diana Other Person', sede: 'Lima', email: 'own@example.invalid' }), 'own@example.invalid');
});

test('local team summaries follow the published team label, but contradictory or missing sites remain denied', () => {
  const equiposSummary = [
    { equipoNombre: 'CICLO 1 EQUIPO 31 LIMA', totalParticipantes: 4 },
    { equipoNombre: 'CICLO 1 EQUIPO 31 QUITO', totalParticipantes: 8 },
    { equipoNombre: 'CICLO 1 EQUIPO 31 LIMA QUITO', totalParticipantes: 12 },
    { equipoNombre: 'CICLO 1 EQUIPO 31 QUITO', sede: 'Lima', totalParticipantes: 16 },
    { equipoNombre: 'CICLO 1 EQUIPO 31 LIMA', sede: 'Unverified', totalParticipantes: 32 },
    { equipoNombre: 'CICLO 1 EQUIPO 31', totalParticipantes: 64 }
  ];
  const result = scopedNodusContext({ equiposSummary }, { type: 'sede', sede: 'Lima' });
  assert.deepEqual(result.equiposSummary.map(team => team.totalParticipantes), [4]);
  assert.deepEqual(scopedNodusContext({ equiposSummary }, { type: 'personal', emails: [] }).equiposSummary, []);
});

test('real metric hook, Embudo and Strategy enforce scope changes, authorized dual sedes and stale callbacks', async () => {
  const fixtureId = `${process.cwd()}/nodus-metrics-fixture.jsx`;
  const server = await createServer({
    configFile: false, server: { host: '127.0.0.1', port: 0, hmr: false },
    plugins: [react(), {
      name: 'nodus-metrics-fixture', enforce: 'pre',
      resolveId(id) {
        if (id === '../services/firebase' || id === './firebase') return '\0nodus-metrics:firebase';
        if (id === '../context/AuthContext') return '\0nodus-metrics:auth';
        if (id === '../context/CyclesContext') return '\0nodus-metrics:cycles';
        if (id === '/nodus-metrics-fixture.jsx') return fixtureId;
      },
      load(id) {
        if (id === '\0nodus-metrics:firebase') return 'export const auth={currentUser:null}; window.fixtureAuth=auth;';
        if (id === '\0nodus-metrics:auth') return 'export const useAuth=()=>({currentUser:window.viewer});';
        if (id === '\0nodus-metrics:cycles') return `export const useCycles=()=>({loadingEvents:false,events:[
          {sede:'Lima',equipo:31,nombre:'C1',fecha_inicio:'2026-01-01'},
          {sede:'Quito',equipo:31,nombre:'C1',fecha_inicio:'2026-01-01'}
        ]});`;
        if (id === fixtureId) return `
          import React,{useState} from 'react';
          import {createRoot} from 'react-dom/client';
          import {MemoryRouter} from 'react-router-dom';
          import Embudo from '/src/pages/EmbudoConversionBoard.jsx';
          import OperationalReview from '/src/components/OperationalReview.jsx';
          import Strategy from '/src/pages/StrategyBoard.jsx';
          import useMetrics from '/src/hooks/usePrivateNodusSnapshot.js';
          window.metricRequests=[];
          window.pendingMetrics=[];
          window.pendingStrategy=[];
          window.strategyRequests=[];
          const local={timestamp:'2026-11-04T20:00:00Z',sedes:[],equiposSummary:[],coordinadores:[{
            nombre:'SYNTHETIC_LIMA_COORD',email:'synthetic@example.invalid',sede:'Lima',
            asignados:4,gestiones:3,sentadosTotal:1,confirmadosTotal:2,estados:{confirmado:2},
            equipos:[{equipo:'C1 E31',fase:'C1',llamadas:3,confirmado:2}]
          }]};
          window.fetch=async (url,options)=>{
            if(new URL(url).pathname==='/'){
              window.strategyRequests.push(JSON.parse(options.body));
              await new Promise(resolve=>window.pendingStrategy.push(resolve));
              return Response.json({text:'OLD_SITE_AI_RESPONSE'});
            }
            const isReports=String(url).endsWith('/nodus-private-report-sources');
            if(!isReports && !String(url).endsWith('/nodus-private-snapshot')) throw new Error('Forbidden network path');
            window.metricRequests.push({url,body:options.body,token:options.headers.Authorization});
            if(window.holdMetrics) await new Promise(resolve=>window.pendingMetrics.push(resolve));
            if(window.failMetrics) return Response.json({message:'SYNTHETIC_AUTHORIZATION_ERROR'},{status:403});
            if(isReports){
              const counts=Object.fromEntries(['nuevos','rezagados'].flatMap(group=>
                ['OK','XC','NC','NI','SIG','OS','PENDIENTES'].map(metric=>[group+'_'+metric,0])));
              counts.nuevos_OK=1;
              const timestamp=new Date().toISOString();
              return Response.json({snapshot:{timestamp,authorizedSedes:['Lima'],authorizedStages:['C1'],missingSources:[],
                reportSources:[{sede:'Lima',stage:'C1',sourceUpdatedAt:timestamp,teams:[
                  {sede:'Lima',stage:'C1',team:'31',status:'ready',rows:1,unknown:0,counts}
                ]}]}});
            }
            const authorization=window.strategyAuthority||{type:'sede',sedes:['Lima']};
            const other={...local.coordinadores[0],nombre:'SYNTHETIC_QUITO_COORD',email:'quito@example.invalid',sede:'Quito',asignados:9};
            return Response.json({snapshot:{...local,authorization,
              coordinadores:authorization.sedes.includes('Quito')?[...local.coordinadores,other]:local.coordinadores}});
          };
          function Fixture(){
            const [viewer,setViewer]=useState({uid:'alpha',email:'alpha@example.invalid',role:'gerente',roles:['gerente'],sede:'Lima'});
            const [revision,setRevision]=useState(0);
            window.viewer=viewer; window.swapViewer=setViewer; window.reloadMetrics=()=>setRevision(v=>v+1);
            window.fixtureAuth.currentUser={uid:viewer.uid,getIdToken:async ()=>'synthetic-'+viewer.uid};
            const state=useMetrics({revision});
            return <><output id="metrics-probe">{JSON.stringify(state)}</output><MemoryRouter><Embudo/><OperationalReview/><Strategy/></MemoryRouter></>;
          }
          createRoot(document.getElementById('root')).render(<Fixture/>);
        `;
      },
      configureServer(vite) {
        vite.middlewares.use((req, res, next) => {
          if (req.url !== '/nodus-metrics-test') return next();
          res.setHeader('Content-Type', 'text/html');
          res.end('<link rel="icon" href="data:,"><div id="root"></div><script type="module" src="/nodus-metrics-fixture.jsx"></script>');
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
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (new URL(request.url()).hostname === '127.0.0.1' || request.url().startsWith('data:')) request.continue();
      else request.abort();
    });
    await page.goto(`${server.resolvedUrls.local[0]}nodus-metrics-test`);
    await page.waitForFunction(() => document.querySelector('#metrics-probe')?.textContent.includes('SYNTHETIC_LIMA_COORD'));
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button =>
      button.textContent.includes('Actualizar') && !button.disabled));
    assert.equal(await page.$eval('article strong', element => element.textContent), '4');
    await page.waitForSelector('[data-review-sede="Lima"]');
    assert.deepEqual(await page.$$eval('[data-review-sede]', elements => elements.map(element => element.dataset.reviewSede)), ['Lima']);
    assert.match(await page.$eval('[data-review-sede="Lima"]', element => element.textContent), /1\/6 con reporte C1 legible/);
    const calls = await page.evaluate(() => window.metricRequests);
    assert.ok(calls.length >= 2);
    assert.ok(calls.every(call => call.body === '{}' && call.token === 'Bearer synthetic-alpha'));
    await page.waitForSelector('[data-strategy-sede="Lima"] select');
    assert.deepEqual(await page.$$eval('[data-strategy-sede] select option', options => options.map(option => option.value)), ['Lima']);
    await page.evaluate(() => {
      window.strategyAuthority={type:'sede',sedes:['Lima','Quito']};
      window.swapViewer({...window.viewer,roleSedes:{gerente:'Quito'}});
    });
    await page.waitForFunction(() => document.querySelectorAll('[data-strategy-sede] select option').length === 2);
    assert.deepEqual(await page.$$eval('[data-strategy-sede] select option', options => options.map(option => option.value)), ['Lima', 'Quito']);
    await page.waitForFunction(() => [...document.querySelectorAll('[data-strategy-sede] button')].some(button =>
      button.textContent.includes('Actualizar Análisis IA') && !button.disabled));
    await page.evaluate(() => [...document.querySelectorAll('[data-strategy-sede] button')]
      .find(button => button.textContent.includes('Actualizar Análisis IA')).click());
    await page.waitForFunction(() => window.pendingStrategy.length === 1);
    assert.doesNotMatch(await page.evaluate(() => JSON.stringify(window.strategyRequests)), /SYNTHETIC_QUITO_COORD/);
    await page.select('[data-strategy-sede] select', 'Quito');
    await page.waitForSelector('[data-strategy-sede="Quito"]');
    await page.waitForFunction(() => [...document.querySelectorAll('[data-strategy-sede] button')].some(button =>
      button.textContent.includes('Misiones por Coordinador')));
    await page.evaluate(() => {
      [...document.querySelectorAll('[data-strategy-sede] button')].find(button =>
        button.textContent.includes('Misiones por Coordinador')).click();
      window.pendingStrategy.splice(0).forEach(resolve=>resolve());
    });
    await page.waitForFunction(() => document.querySelector('[data-strategy-sede="Quito"]')?.textContent.includes('SYNTHETIC_QUITO_COORD'));
    assert.doesNotMatch(await page.$eval('[data-strategy-sede]', element => element.textContent), /SYNTHETIC_LIMA_COORD|OLD_SITE_AI_RESPONSE/);
    await page.evaluate(() => {
      window.failMetrics=true;
      window.swapViewer({...window.viewer,status:'active'});
      window.reloadMetrics();
    });
    await page.waitForFunction(() => document.querySelector('#metrics-probe')?.textContent.includes('SYNTHETIC_AUTHORIZATION_ERROR'));
    assert.doesNotMatch(await page.$eval('#metrics-probe', element => element.textContent), /SYNTHETIC_LIMA_COORD/);
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.includes('Actualizar')).click());
    await page.waitForFunction(() => document.querySelector('[role="alert"]')?.textContent.includes('SYNTHETIC_AUTHORIZATION_ERROR'));
    assert.equal(await page.$$eval('article strong', elements => elements.length), 0);
    assert.doesNotMatch(await page.$eval('body', element => element.textContent), /SYNTHETIC_LIMA_COORD/);
    assert.doesNotMatch(await page.$eval('[data-strategy-sede]', element => element.textContent), /SYNTHETIC_LIMA_COORD|SYNTHETIC_QUITO_COORD/);
    await page.evaluate(() => { window.failMetrics=false; window.holdMetrics=true; window.reloadMetrics(); });
    await page.waitForFunction(() => window.pendingMetrics.length > 0);
    await page.evaluate(() => window.swapViewer({...window.viewer,sede:'Quito'}));
    await page.waitForFunction(() => window.pendingMetrics.length >= 3);
    await page.evaluate(async () => {
      window.pendingMetrics.shift()();
      await new Promise(resolve=>setTimeout(resolve,0));
    });
    assert.doesNotMatch(await page.$eval('#metrics-probe', element => element.textContent), /SYNTHETIC_LIMA_COORD/);
    await page.evaluate(() => window.swapViewer({
      uid:'beta',email:'beta@example.invalid',role:'gerente',roles:['gerente'],sede:'Quito'
    }));
    await page.waitForFunction(() => window.pendingMetrics.length >= 4);
    await page.evaluate(() => {
      window.holdMetrics=false;
      window.pendingMetrics.splice(0).forEach(resolve=>resolve());
      window.swapViewer({...window.viewer,isSimulated:true});
    });
    await page.waitForFunction(() => document.querySelector('#metrics-probe')?.textContent.includes('sin simulación'));
    assert.doesNotMatch(await page.$eval('body', element => element.textContent), /SYNTHETIC_LIMA_COORD/);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});
