import express from 'express';
import cors from 'cors';
import { runScraperWithDates } from './scripts/nodusScraper.js';
import { spawn } from 'child_process';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/scrape-nodus', async (req, res) => {
  const { startDate, endDate, sede } = req.body;
  
  try {
    console.log(`[API] Solicitud de scrapeo recibida: Desde ${startDate} Hasta ${endDate} para la sede ${sede}`);
    
    // Ejecutar el robot
    const scrapedData = await runScraperWithDates(startDate, endDate, sede);
    
    res.json({ success: true, data: scrapedData });
  } catch (error) {
    console.error("[API] Error en el scrapeo en vivo:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/run-nodus-scraper', (req, res) => {
  console.log('[API] Manual execution of nodusScraper started');
  // Optional: check Authorization header if we implemented requireSuperAdmin
  const child = spawn('node', ['scripts/nodusScraper.js'], { detached: true, stdio: 'ignore' });
  child.unref();
  res.json({ status: 'started', message: 'Nodus scraper is running in the background.' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend local (Nodus API) escuchando en http://localhost:${PORT}`);
});
