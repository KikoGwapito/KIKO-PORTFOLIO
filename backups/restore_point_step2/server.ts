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

// Load Firebase API key for secure server-side ID token verification
let firebaseApiKey = process.env.VITE_FIREBASE_API_KEY || '';
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (cfg.apiKey) {
      firebaseApiKey = cfg.apiKey;
    }
  }
} catch (e) {
  console.warn('Could not read firebase-applet-config.json in server.ts:', e);
}

// Token cache to avoid hitting Google Identity Toolkit on every chunk/request
interface CachedUser {
  email: string;
  emailVerified: boolean;
  expiresAt: number;
}
const tokenCache = new Map<string, CachedUser>();

async function verifyFirebaseToken(token: string): Promise<CachedUser | null> {
  const now = Date.now();
  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > now) {
    return cached;
  }

  if (!firebaseApiKey) {
    console.error('Firebase API key missing, cannot verify auth token on server');
    return null;
  }

  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token })
    });

    if (!res.ok) {
      tokenCache.delete(token);
      return null;
    }

    const data: any = await res.json();
    const user = data.users?.[0];
    if (!user || !user.email) return null;

    const cachedUser: CachedUser = {
      email: user.email.toLowerCase(),
      emailVerified: Boolean(user.emailVerified),
      expiresAt: now + 5 * 60 * 1000 // Cache for 5 minutes
    };
    tokenCache.set(token, cachedUser);
    return cachedUser;
  } catch (err) {
    console.error('Token verification error:', err);
    return null;
  }
}

const ADMIN_EMAIL = 'francisestologa@gmail.com';

async function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication token required' });
  }

  const token = authHeader.split(' ')[1]?.trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token format' });
  }

  const user = await verifyFirebaseToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }

  if (user.email !== ADMIN_EMAIL.toLowerCase() || !user.emailVerified) {
    return res.status(403).json({ error: 'Forbidden: Admin privileges required' });
  }

  (req as any).user = user;
  next();
}

// Drive ID regex to prevent SSRF and injection attacks
const DRIVE_ID_REGEX = /^[a-zA-Z0-9_-]{15,100}$/;

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Sanitize extension
    const ext = path.extname(file.originalname).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 10);
    cb(null, uniqueSuffix + ext);
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

  // Global security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Serve uploaded files
  app.use('/uploads', express.static(uploadDir));
  app.use(express.json({ limit: '10mb' }));

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

  // Protected: Only admin can overwrite server data.json
  app.post('/api/data', requireAdminAuth, (req, res) => {
    try {
      fs.writeFileSync(dataFile, JSON.stringify(req.body, null, 2), 'utf8');
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save data' });
    }
  });

  // Protected: Only admin can delete files, with path traversal prevention
  app.post('/api/delete', requireAdminAuth, (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== 'string' || !url.startsWith('/uploads/')) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const filename = path.basename(url);
    if (!filename || filename === '.' || filename === '..') {
      return res.status(400).json({ error: 'Invalid file target' });
    }

    const filepath = path.resolve(uploadDir, filename);
    // Path traversal verification
    if (!filepath.startsWith(path.resolve(uploadDir))) {
      return res.status(403).json({ error: 'Access denied: Directory traversal detected' });
    }

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

  // Oembed Proxy endpoint with strict hostname validation against SSRF
  app.get('/api/oembed', async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing URL' });
    }
    
    try {
      const parsed = new URL(url);
      const allowedHosts = ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com', 'm.tiktok.com'];
      if (!allowedHosts.includes(parsed.hostname.toLowerCase())) {
        return res.status(400).json({ error: 'Only TikTok URLs are supported' });
      }

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
      res.status(500).json({ error: err.message || 'Failed to fetch oembed' });
    }
  });

  // Google Drive thumbnail proxy endpoint (hardened with ID validation)
  app.get('/api/gdrive-thumbnail', async (req, res) => {
    const { id } = req.query;
    if (!id || typeof id !== 'string' || !DRIVE_ID_REGEX.test(id)) {
      return res.status(400).json({ error: 'Invalid or missing Google Drive ID parameter' });
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

  // Google Drive video stream proxy endpoint (hardened with ID validation)
  app.get('/api/gdrive-stream', async (req, res) => {
    const { id } = req.query;
    if (!id || typeof id !== 'string' || !DRIVE_ID_REGEX.test(id)) {
      return res.status(400).json({ error: 'Invalid or missing Google Drive ID parameter' });
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

  // Protected: Cloudinary Proxy Upload endpoint (admin authorization enforced)
  app.post(
    '/api/upload/cloudinary',
    requireAdminAuth,
    upload.single('file'),
    async (req, res) => {
      console.log('Received authenticated Cloudinary proxy upload request:', req.file?.originalname);
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
    }
  );

  // Protected: Upload endpoint to local storage
  app.all(['/api/upload', '/api/upload/'], requireAdminAuth, (req, res, next) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
    next();
  }, upload.single('file'), (req, res) => {
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
