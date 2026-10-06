import express from 'express';
import cors from 'cors';
import { runScraperWithDates } from './scripts/nodusScraper.js';
import { spawn } from 'child_process';

const app = express();
const expectedToken = process.env.ROBOT_TOKEN || process.env.CAUSA_OS_SERVER_TOKEN || '';

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^https?:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

function requireRobotToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

  if (!expectedToken) {
    return res.status(500).json({ success: false, message: 'ROBOT_TOKEN not configured.' });
  }

  if (token !== expectedToken) {
    return res.status(401).json({ success: false, message: 'Unauthorized.' });
  }

  next();
}

app.post('/api/scrape-nodus', requireRobotToken, async (req, res) => {
  const { startDate, endDate, sede } = req.body;
  
  try {
    console.log(`[API] Solicitud de scrapeo recibida: Desde ${startDate} Hasta ${endDate} para la sede ${sede}`);
    
    const scrapedData = await runScraperWithDates(startDate, endDate, sede);
    
    res.json({ success: true, data: scrapedData });
  } catch (error) {
    console.error("[API] Error en el scrapeo en vivo:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/run-nodus-scraper', requireRobotToken, (req, res) => {
  console.log('[API] Manual execution of nodusScraper started');
  const child = spawn('node', ['scripts/nodusScraper.js'], { detached: true, stdio: 'ignore' });
  child.unref();
  res.json({ status: 'started', message: 'Nodus scraper is running in the background.' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend local (Nodus API) escuchando en http://localhost:${PORT}`);
});
