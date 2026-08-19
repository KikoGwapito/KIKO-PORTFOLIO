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
const upload = multer({ 
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500 MB max for videos
  }
});

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

  // Oembed Proxy endpoint
  app.get('/api/oembed', async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing URL' });
    }
    
    try {
      const fetchUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
      const response = await fetch(fetchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed with status: ${response.status}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      console.error('Oembed proxy error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Cloudinary Proxy Upload endpoint (bypasses browser CORS & size restrictions)
  app.post('/api/upload/cloudinary', upload.single('file'), async (req, res) => {
    console.log('Received Cloudinary proxy upload request:', req.file?.originalname);
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const cloudName = (req.body.cloudName || process.env.VITE_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || '').trim();
    const uploadPreset = (req.body.uploadPreset || process.env.VITE_CLOUDINARY_UPLOAD_PRESET || process.env.CLOUDINARY_UPLOAD_PRESET || '').trim();
    const resourceType = req.body.resourceType === 'video' ? 'video' : 'auto';

    if (!cloudName || !uploadPreset) {
      return res.status(400).json({ error: 'Cloud Name and Upload Preset are required for Cloudinary upload.' });
    }

    try {
      const fileBuffer = fs.readFileSync(req.file.path);
      const blob = new Blob([fileBuffer], { type: req.file.mimetype || (resourceType === 'video' ? 'video/mp4' : 'application/octet-stream') });
      const formData = new FormData();
      formData.append('file', blob, req.file.originalname);
      formData.append('upload_preset', uploadPreset);
      formData.append('resource_type', resourceType);

      const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
      console.log(`Forwarding to Cloudinary endpoint: ${endpoint}`);

      const cloudRes = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await cloudRes.json();
      if (!cloudRes.ok) {
        console.error('Cloudinary upstream API error:', data);
        const errMsg = data.error?.message || `Cloudinary returned HTTP status ${cloudRes.status}`;
        return res.status(cloudRes.status).json({ error: errMsg });
      }

      console.log('Cloudinary server proxy upload success:', data.secure_url || data.url);
      
      // Clean up temp file
      fs.unlink(req.file.path, () => {});

      return res.json({ url: data.secure_url || data.url });
    } catch (err: any) {
      console.error('Error in Cloudinary server upload proxy:', err);
      return res.status(500).json({ error: err.message || 'Server error proxying to Cloudinary' });
    }
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
