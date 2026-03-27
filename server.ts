import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Serve uploaded files
  app.use('/uploads', express.static(uploadDir));
  app.use(express.json());

  // Data persistence endpoints
  const dataFile = path.join(process.cwd(), 'data.json');

  app.get('/api/data', (req, res) => {
    if (fs.existsSync(dataFile)) {
      try {
        const data = fs.readFileSync(dataFile, 'utf8');
        return res.json(JSON.parse(data));
      } catch (err) {
        return res.status(500).json({ error: 'Failed to read data' });
      }
    }
    res.status(404).json({ error: 'Data not found' });
  });

  app.post('/api/data', (req, res) => {
    try {
      fs.writeFileSync(dataFile, JSON.stringify(req.body, null, 2), 'utf8');
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save data' });
    }
  });

  // Delete endpoint
  app.post('/api/delete', (req, res) => {
    const { url } = req.body;
    if (!url || !url.startsWith('/uploads/')) {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    const filename = path.basename(url);
    const filepath = path.join(uploadDir, filename);
    if (fs.existsSync(filepath)) {
      try {
        fs.unlinkSync(filepath);
        return res.json({ success: true });
      } catch (err) {
        return res.status(500).json({ error: 'Failed to delete file' });
      }
    }
    return res.status(404).json({ error: 'File not found' });
  });

  // Upload endpoint
  app.all(['/api/upload', '/api/upload/'], (req, res, next) => {
    console.log(`Received ${req.method} request to /api/upload`);
    if (req.method !== 'POST') {
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
    next();
  }, upload.single('file'), (req, res) => {
    console.log('Upload request processed', req.file);
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ url: `/uploads/${req.file.filename}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Express error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
