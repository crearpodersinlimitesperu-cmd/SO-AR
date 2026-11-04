import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import puppeteer from 'puppeteer';

test('real Copilot preserves quarantined local history and rejects old-scope conversations/answers in one browser', async () => {
  const fixtureId = `${process.cwd()}/copilot-history-fixture.jsx`;
  const server = await createServer({
    configFile: false, server: { host: '127.0.0.1', port: 0, hmr: false },
    plugins: [react(), {
      name: 'copilot-history-fixture', enforce: 'pre',
      resolveId(id) {
        if (id === '../services/firebase' || id === './firebase') return '\0copilot-fixture:firebase';
        if (id === '../context/AuthContext') return '\0copilot-fixture:auth';
        if (id === '/copilot-history-fixture.jsx') return fixtureId;
      },
      load(id) {
        if (id === '\0copilot-fixture:firebase') return 'export const auth = {currentUser:null}; window.fixtureAuth = auth;';
        if (id === '\0copilot-fixture:auth') return 'export const useAuth = () => ({currentUser: window.fixtureViewer});';
        if (id === fixtureId) return `
          import React, { useState } from 'react';
          import { createRoot } from 'react-dom/client';
          import AICopilot from '/src/components/AICopilot.jsx';
          import { privateViewKey } from '/src/utils/sessionPrivacy.js';
          window.historyRequests = [];
          window.fetch = async (url, options) => {
            const input = JSON.parse(options.body);
            if (String(url).endsWith('/copilot-private-history')) {
              window.historyRequests.push({ ...input, token: options.headers.Authorization });
              if (input.action === 'list') return Response.json({authorityKey:'b'.repeat(64), sessions: [{
                id: '00000000-0000-4000-8000-000000000001', title: 'Verified conversation', updatedAt: '2026-11-04T00:00:00Z'
              }]});
              if (input.action === 'get') {
                if (window.holdHistory) await new Promise(resolve => { window.releaseHistory = resolve; });
                window.historyDelivered = true;
                return Response.json({authorityKey:'b'.repeat(64), session: {id: input.chatId, messages: [{role:'assistant', content:'OLD_SCOPE_HISTORY'}]}});
              }
              if (window.failHistorySave) return Response.json({message:'HISTORY_AUTHORIZATION_UNAVAILABLE'}, {status:503});
              return Response.json({authorityKey:'b'.repeat(64), id:'00000000-0000-4000-8000-000000000001'});
            }
            if (String(url).endsWith('/nodus-private-snapshot')) throw new Error('No raw metrics fallback expected in this fixture');
            window.askRequests = (window.askRequests || 0) + 1;
            if (window.holdAnswer) await new Promise(resolve => { window.releaseAnswer = resolve; });
            window.answerDelivered = true;
            return Response.json({text:'OLD_ACCOUNT_ANSWER'});
          };
          function Fixture() {
            const [viewer, setViewer] = useState({uid:'alpha', email:'alpha@example.invalid', roles:['direccion'], role:'direccion', sede:'Lima'});
            window.fixtureViewer = viewer;
            window.fixtureAuth.currentUser = {uid:viewer.uid, getIdToken:async () => 'synthetic-' + viewer.uid};
            window.swapViewer = setViewer;
            return <AICopilot key={privateViewKey(viewer)} />;
          }
          createRoot(document.getElementById('root')).render(<Fixture />);
        `;
      },
      configureServer(vite) {
        vite.middlewares.use((req, res, next) => {
          if (req.url !== '/copilot-history-test') return next();
          res.setHeader('Content-Type', 'text/html');
          res.end('<link rel="icon" href="data:,"><div id="root"></div><script type="module" src="/copilot-history-fixture.jsx"></script>');
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
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('copilot_sessions_alpha', JSON.stringify([{ messages: [{ content: 'LEGACY_PRIVATE_HISTORY' }] }]));
      window.historyLocalAccess = [];
      const read = Storage.prototype.getItem;
      const write = Storage.prototype.setItem;
      const remove = Storage.prototype.removeItem;
      window.readOriginalHistory = () => read.call(localStorage, 'copilot_sessions_alpha');
      Storage.prototype.getItem = function(key) {
        if (key.startsWith('copilot_sessions_')) window.historyLocalAccess.push(['read', key]);
        return read.call(this, key);
      };
      Storage.prototype.setItem = function(key, value) {
        if (key.startsWith('copilot_sessions_')) window.historyLocalAccess.push(['write', key]);
        return write.call(this, key, value);
      };
      Storage.prototype.removeItem = function(key) {
        if (key.startsWith('copilot_sessions_')) window.historyLocalAccess.push(['remove', key]);
        return remove.call(this, key);
      };
    });
    await page.goto(`${server.resolvedUrls.local[0]}copilot-history-test`);
    await page.waitForSelector('button[title="Abrir Copiloto Analítico"]');
    const clickText = text => page.evaluate(label => [...document.querySelectorAll('button')]
      .find(button => button.textContent.trim().includes(label))?.click(), text);
    await page.click('button[title="Abrir Copiloto Analítico"]');
    await clickText('Historial');
    await page.waitForFunction(() => document.body.textContent.includes('Verified conversation'));
    assert.match(await page.$eval('body', element => element.textContent), /requieren revisión administrativa/);
    await page.evaluate(() => { window.holdHistory = true; });
    await clickText('Verified conversation');
    await page.waitForFunction(() => typeof window.releaseHistory === 'function');
    await page.evaluate(() => window.swapViewer({
      uid: 'alpha', email: 'alpha@example.invalid', role: 'gerente', roles: ['gerente'], sede: 'Quito'
    }));
    await page.waitForSelector('button[title="Abrir Copiloto Analítico"]');
    await page.evaluate(() => window.releaseHistory());
    await page.waitForFunction(() => window.historyDelivered === true);
    await page.click('button[title="Abrir Copiloto Analítico"]');
    await page.waitForFunction(() => document.querySelector('input'));
    assert.doesNotMatch(await page.$eval('body', element => element.textContent), /LEGACY_PRIVATE_HISTORY|OLD_SCOPE_HISTORY/);

    await page.evaluate(() => { window.holdAnswer = true; });
    await page.type('input', 'Synthetic private question');
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => typeof window.releaseAnswer === 'function');
    const writesBefore = await page.evaluate(() => window.historyRequests.filter(request => request.action === 'save').length);
    await page.evaluate(() => window.swapViewer({
      uid: 'beta', email: 'beta@example.invalid', role: 'gerente', roles: ['gerente'], sede: 'Lima'
    }));
    await page.waitForSelector('button[title="Abrir Copiloto Analítico"]');
    await page.evaluate(() => window.releaseAnswer());
    await page.waitForFunction(() => window.answerDelivered === true);
    await page.click('button[title="Abrir Copiloto Analítico"]');
    await page.waitForFunction(() => document.querySelector('input'));
    assert.doesNotMatch(await page.$eval('body', element => element.textContent), /OLD_ACCOUNT_ANSWER|Synthetic private question/);
    assert.equal(await page.evaluate(() => window.historyRequests.filter(request => request.action === 'save').length), writesBefore);
    const asksBefore = await page.evaluate(() => window.askRequests);
    await page.evaluate(() => { window.failHistorySave = true; });
    await page.type('input', 'Question without verified history authority');
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => document.querySelector('[role="alert"]')?.textContent.includes('HISTORY_AUTHORIZATION_UNAVAILABLE'));
    assert.equal(await page.evaluate(() => window.askRequests), asksBefore, 'do not generate unsaved private replies without binding their original authority');
    assert.deepEqual(await page.evaluate(() => window.historyLocalAccess), []);
    assert.match(await page.evaluate(() => window.readOriginalHistory()), /LEGACY_PRIVATE_HISTORY/);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});
