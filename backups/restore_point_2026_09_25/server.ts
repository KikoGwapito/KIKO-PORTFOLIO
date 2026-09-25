import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';

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

  // Google Drive thumbnail proxy endpoint
  app.get('/api/gdrive-thumbnail', async (req, res) => {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Missing id parameter' });
    }

    const candidateUrls = [
      `https://lh3.googleusercontent.com/d/${id}=w1920`,
      `https://lh3.googleusercontent.com/d/${id}`,
      `https://drive.google.com/thumbnail?id=${id}&sz=w1000`
    ];

    for (const fetchUrl of candidateUrls) {
      try {
        const response = await fetch(fetchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
          }
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          if (contentType.startsWith('image/')) {
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=86400');
            const arrayBuffer = await response.arrayBuffer();
            return res.send(Buffer.from(arrayBuffer));
          }
        }
      } catch (err) {
        // try next candidate
      }
    }

    return res.status(404).json({ error: 'Thumbnail not available' });
  });

  // Google Drive video stream proxy endpoint (supports HTTP Range for seeking & native mobile streaming)
  app.get('/api/gdrive-stream', async (req, res) => {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Missing id parameter' });
    }

    const candidateUrls = [
      `https://drive.usercontent.google.com/download?id=${id}&export=download&authuser=0`,
      `https://drive.google.com/uc?export=download&id=${id}&confirm=t`,
      `https://docs.google.com/uc?export=download&id=${id}`
    ];

    const rangeHeader = req.headers.range;

    for (const streamUrl of candidateUrls) {
      try {
        const fetchHeaders: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          'Accept': '*/*'
        };
        if (rangeHeader) {
          fetchHeaders['Range'] = rangeHeader;
        }

        const response = await fetch(streamUrl, {
          headers: fetchHeaders,
          redirect: 'follow'
        });

        if (response.ok || response.status === 206) {
          const contentType = response.headers.get('content-type') || '';
          
          // Avoid tiny html responses that are error messages or virus scan walls
          const len = parseInt(response.headers.get('content-length') || '0', 10);
          if (contentType.includes('text/html') && len < 50000) {
            continue;
          }

          res.status(response.status);
          res.setHeader('Content-Type', contentType.startsWith('video/') ? contentType : 'video/mp4');
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Access-Control-Allow-Origin', '*');
          
          const contentRange = response.headers.get('content-range');
          if (contentRange) {
            res.setHeader('Content-Range', contentRange);
          }
          
          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            res.setHeader('Content-Length', contentLength);
          }

          if (response.body) {
            const nodeStream = Readable.fromWeb(response.body as any);
            return nodeStream.pipe(res);
          }
        }
      } catch (err) {
        // try next candidate
      }
    }

    return res.status(404).json({ error: 'Stream not available' });
  });

  // Cloudinary Proxy Upload endpoint (supports chunked streaming for 400MB+ videos)
  app.post('/api/upload/cloudinary', upload.single('file'), async (req, res) => {
    console.log('Received Cloudinary proxy upload request:', req.file?.originalname);
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const cloudName = (req.body.cloudName || process.env.VITE_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || '').trim();
    const uploadPreset = (req.body.uploadPreset || process.env.VITE_CLOUDINARY_UPLOAD_PRESET || process.env.CLOUDINARY_UPLOAD_PRESET || '').trim();
    const resourceType = req.body.resourceType === 'video' ? 'video' : 'auto';

    if (!cloudName || !uploadPreset) {
      if (req.file?.path) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'Cloud Name and Upload Preset are required for Cloudinary upload.' });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const mimetype = req.file.mimetype;

    try {
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
      const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
      const uniqueId = `srv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

      console.log(`Forwarding to Cloudinary chunked endpoint: ${endpoint} (${(fileSize / (1024 * 1024)).toFixed(2)} MB in ${totalChunks} chunks)`);

      let lastResponseData: any = null;

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE - 1, fileSize - 1);
        const chunkLength = end - start + 1;

        const buffer = Buffer.alloc(chunkLength);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buffer, 0, chunkLength, start);
        fs.closeSync(fd);

        const blob = new Blob([buffer], { type: mimetype || (resourceType === 'video' ? 'video/mp4' : 'application/octet-stream') });
        const formData = new FormData();
        formData.append('file', blob, originalName);
        formData.append('upload_preset', uploadPreset);
        formData.append('resource_type', resourceType);

        const headers: Record<string, string> = {
          'X-Unique-Upload-Id': uniqueId,
          'Content-Range': `bytes ${start}-${end}/${fileSize}`
        };

        let chunkSuccess = false;
        let attempt = 0;
        let lastErr: any = null;

        while (attempt < 3 && !chunkSuccess) {
          attempt++;
          try {
            const cloudRes = await fetch(endpoint, {
              method: 'POST',
              headers,
              body: formData
            });

            const data = await cloudRes.json();
            if (!cloudRes.ok) {
              const errMsg = data.error?.message || `Cloudinary returned HTTP status ${cloudRes.status}`;
              throw new Error(errMsg);
            }

            lastResponseData = data;
            chunkSuccess = true;
          } catch (err: any) {
            lastErr = err;
            console.warn(`Chunk ${i + 1}/${totalChunks} attempt ${attempt} failed: ${err.message}`);
            if (attempt < 3) {
              await new Promise(r => setTimeout(r, 1500 * attempt));
            }
          }
        }

        if (!chunkSuccess) {
          throw new Error(`Failed to upload chunk ${i + 1}/${totalChunks} to Cloudinary: ${lastErr?.message || 'Network error'}`);
        }
      }

      // Clean up temp file
      fs.unlink(filePath, () => {});

      if (lastResponseData && (lastResponseData.secure_url || lastResponseData.url)) {
        console.log('Cloudinary chunked upload success:', lastResponseData.secure_url || lastResponseData.url);
        return res.json({ url: lastResponseData.secure_url || lastResponseData.url });
      }

      return res.status(500).json({ error: 'Cloudinary processed all chunks but returned no media URL' });
    } catch (err: any) {
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, () => {});
      }
      console.error('Error in Cloudinary server chunked upload:', err);
      return res.status(500).json({ error: err.message || 'Server error uploading to Cloudinary' });
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
