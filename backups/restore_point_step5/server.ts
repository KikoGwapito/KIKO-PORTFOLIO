import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Readable } from 'stream';
import rateLimit from 'express-rate-limit';
import dns from 'dns/promises';

// ===============================================================
// SSRF & Safe Proxy Protection Utilities (Step 3: Anti-SSRF Defense)
// ===============================================================

function isPrivateOrBlockedIP(ip: string): boolean {
  if (!ip) return true;
  let normalized = ip;
  if (normalized.startsWith('::ffff:')) {
    normalized = normalized.substring(7);
  }
  if (normalized === '127.0.0.1' || normalized === 'localhost' || normalized === '0.0.0.0' || normalized === '::' || normalized === '::1') return true;
  if (normalized.startsWith('169.254.')) return true; // Link-local & Cloud Metadata service
  if (normalized.startsWith('10.')) return true; // RFC 1918 Class A
  if (normalized.startsWith('192.168.')) return true; // RFC 1918 Class C
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(normalized)) return true; // RFC 1918 Class B
  if (normalized.startsWith('100.64.') || normalized.startsWith('198.18.') || normalized.startsWith('198.19.')) return true;
  if (normalized.startsWith('fe80:') || normalized.startsWith('fc00:') || normalized.startsWith('fd00:')) return true;
  return false;
}

interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number;
}

async function safeFetchWithRedirects(
  initialUrl: string,
  options: SafeFetchOptions = {},
  allowedHostSuffixes: string[],
  maxRedirects = 3
): Promise<Response> {
  let currentUrl = initialUrl;
  let redirectsCount = 0;

  while (redirectsCount <= maxRedirects) {
    const parsed = new URL(currentUrl);
    if (parsed.protocol !== 'https:') {
      throw new Error(`Insecure protocol rejected: ${parsed.protocol}`);
    }

    if (parsed.port && parsed.port !== '443') {
      throw new Error(`Disallowed port rejected: ${parsed.port}`);
    }

    if (parsed.username || parsed.password) {
      throw new Error('User credentials in URL rejected');
    }

    const host = parsed.hostname.toLowerCase();
    const isDomainAllowed = allowedHostSuffixes.some(s => host === s || host.endsWith('.' + s));
    if (!isDomainAllowed) {
      throw new Error(`Domain not allowlisted for proxy: ${host}`);
    }

    // Verify DNS resolution does not map to private, loopback, or metadata IPs
    const resolved = await dns.lookup(host, { all: true });
    for (const entry of resolved) {
      if (isPrivateOrBlockedIP(entry.address)) {
        throw new Error(`Security Violation: Host ${host} resolved to internal/private IP ${entry.address}`);
      }
    }

    // Fetch with manual redirect interception
    const fetchOptions: RequestInit = {
      ...options,
      redirect: 'manual',
      signal: AbortSignal.timeout(options.timeoutMs || 10000)
    };

    const res = await fetch(currentUrl, fetchOptions);

    // If redirect status code encountered
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get('location');
      if (!location) {
        throw new Error(`Redirect status ${res.status} returned without Location header`);
      }
      redirectsCount++;
      if (redirectsCount > maxRedirects) {
        throw new Error('Too many redirects encountered');
      }
      currentUrl = new URL(location, currentUrl).href;
      continue;
    }

    return res;
  }

  throw new Error('Max redirects exceeded');
}

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
      body: JSON.stringify({ idToken: token }),
      signal: AbortSignal.timeout(5000)
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

// ===============================================================
// File Upload Security & Media Signature Validation (Step 4)
// ===============================================================

const ALLOWED_MEDIA_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.mov']);

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime'
]);

function verifyFileSignature(filePath: string, declaredMime: string, ext: string): boolean {
  try {
    if (!fs.existsSync(filePath)) return false;
    const buffer = Buffer.alloc(32);
    const fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 32, 0);
    fs.closeSync(fd);

    if (bytesRead < 4) return false;

    // Check JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return declaredMime === 'image/jpeg' || ['.jpg', '.jpeg'].includes(ext);
    }

    // Check PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
      buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A
    ) {
      return declaredMime === 'image/png' || ext === '.png';
    }

    // Check GIF: GIF87a or GIF89a (47 49 46 38)
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
      return declaredMime === 'image/gif' || ext === '.gif';
    }

    // Check WebP: RIFF (52 49 46 46) ... WEBP (57 45 42 50) at offset 8
    if (
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
    ) {
      return declaredMime === 'image/webp' || ext === '.webp';
    }

    // Check MP4 / QuickTime: bytes 4-8 contain 'ftyp' or 'moov'
    const ftyp = buffer.toString('ascii', 4, 8);
    if (ftyp === 'ftyp' || ftyp === 'moov') {
      return (
        declaredMime === 'video/mp4' || 
        declaredMime === 'video/quicktime' || 
        ['.mp4', '.mov'].includes(ext)
      );
    }

    // Check WebM / Matroska: EBML header (1A 45 DF A3)
    if (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) {
      return declaredMime === 'video/webm' || ext === '.webm';
    }

    return false;
  } catch (err) {
    console.error('Error verifying file signature:', err);
    return false;
  }
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase().trim();
    const safeExt = ALLOWED_MEDIA_EXTENSIONS.has(rawExt) ? rawExt : '.bin';
    const randomHex = crypto.randomBytes(16).toString('hex');
    const safeName = `media_${Date.now()}_${randomHex}${safeExt}`;
    cb(null, safeName);
  }
});
const upload = multer({ 
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500 MB max for videos
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().trim();
    if (!ALLOWED_MEDIA_EXTENSIONS.has(ext)) {
      return cb(new Error(`File type rejected: extension '${ext}' is not permitted.`));
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
      return cb(new Error(`File MIME rejected: '${file.mimetype}' is not an approved media format.`));
    }
    cb(null, true);
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust reverse proxy (Cloud Run, reverse proxies) for correct client IP detection
  app.set('trust proxy', 1);

  // Global security headers (Step 4: Strict CSP & Security Policies)
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.firebaseapp.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://res.cloudinary.com https://drive.google.com https://*.googleusercontent.com https://images.unsplash.com https://i.ytimg.com https://*.vimeocdn.com",
      "media-src 'self' blob: data: https://res.cloudinary.com https://drive.google.com https://*.googlevideo.com https://*.googleusercontent.com",
      "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://*.firebaseio.com https://api.cloudinary.com https://formsubmit.co https://*.googleapis.com wss:",
      "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com https://embed.figma.com https://drive.google.com",
      "frame-ancestors 'self' https://*.google.com https://*.googleusercontent.com",
      "object-src 'none'",
      "base-uri 'self'"
    ];
    res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
    next();
  });

  // Rate Limiting Configurations (Step 2: Anti-Abuse & Request Throttling)
  const globalApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // Limit each IP to 300 API requests per 15 minutes
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP, please try again later.' }
  });

  const mediaStreamLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // Limit each IP to 60 stream/proxy requests per minute
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Media stream rate limit reached. Please wait a moment.' }
  });

  const oembedLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // Limit each IP to 30 oembed calls per minute
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'OEmbed request rate limit reached. Please wait a moment.' }
  });

  const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 contact messages per 15 minutes
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many contact messages sent from this IP. Please wait 15 minutes before sending another message.' }
  });

  const adminActionLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 80, // Generous for chunked uploads while stopping infinite loops/floods
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Action rate limit reached. Please wait a few minutes before retrying.' }
  });

  // Apply general API rate limiter to all /api/ routes
  app.use('/api/', globalApiLimiter);

  // Serve uploaded files (Step 4: Sandboxed, script-disabled static delivery)
  app.use(
    '/uploads',
    (req, res, next) => {
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox; base-uri 'none'");
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      next();
    },
    express.static(uploadDir, {
      dotfiles: 'ignore',
      index: false
    })
  );
  app.use(express.json({ limit: '5mb' }));

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
  app.post('/api/data', adminActionLimiter, requireAdminAuth, (req, res) => {
    try {
      fs.writeFileSync(dataFile, JSON.stringify(req.body, null, 2), 'utf8');
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save data' });
    }
  });

  // Protected: Only admin can delete files, with path traversal prevention
  app.post('/api/delete', adminActionLimiter, requireAdminAuth, (req, res) => {
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

  // Secure, Rate-Limited Contact Endpoint (Anti-Spam & Honeypot Protected)
  app.post('/api/contact', contactLimiter, async (req, res) => {
    try {
      const { name, email, subject, message, _gotcha } = req.body;

      // Honeypot check: Bots routinely fill hidden inputs
      if (_gotcha) {
        console.warn('Bot detected via contact form honeypot');
        return res.status(400).json({ error: 'Invalid submission' });
      }

      // Strict validation checks
      if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
        return res.status(400).json({ error: 'Name is required and must be under 100 characters' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || typeof email !== 'string' || !emailRegex.test(email.trim()) || email.length > 120) {
        return res.status(400).json({ error: 'A valid email address is required' });
      }

      if (subject && (typeof subject !== 'string' || subject.length > 200)) {
        return res.status(400).json({ error: 'Subject must be under 200 characters' });
      }

      if (!message || typeof message !== 'string' || message.trim().length < 5 || message.length > 5000) {
        return res.status(400).json({ error: 'Message must be between 5 and 5000 characters' });
      }

      // Step 4: Strict Sanitization of contact payload to prevent header/HTML injection
      const cleanName = name.trim().replace(/[<>]/g, '').slice(0, 100);
      const cleanEmail = email.trim().slice(0, 120);
      const cleanSubject = (subject || 'New message from Portfolio!').trim().replace(/[\r\n<>]/g, ' ').slice(0, 200);
      const cleanMessage = message.trim().slice(0, 5000);

      // Forward to FormSubmit securely from the backend with strict timeout
      const contactTarget = ADMIN_EMAIL;
      const upstreamRes = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(contactTarget)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          _subject: cleanSubject,
          message: cleanMessage
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (!upstreamRes.ok) {
        const upstreamText = await upstreamRes.text();
        console.warn('FormSubmit upstream warning:', upstreamRes.status, upstreamText);
      }

      return res.json({ success: true, message: 'Message transmitted successfully.' });
    } catch (err: any) {
      console.error('Contact endpoint error:', err);
      return res.status(500).json({ error: 'Unable to deliver message at this time. Please try again later.' });
    }
  });

  // Oembed Proxy endpoint with strict hostname validation & Anti-SSRF defense
  app.get('/api/oembed', oembedLimiter, async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing URL parameter' });
    }
    
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') {
        return res.status(400).json({ error: 'Only HTTPS URLs are allowed' });
      }

      if (parsed.port && parsed.port !== '443') {
        return res.status(400).json({ error: 'Custom ports are not permitted' });
      }

      if (parsed.username || parsed.password) {
        return res.status(400).json({ error: 'Credentials in URL are forbidden' });
      }

      const host = parsed.hostname.toLowerCase();
      const allowedHosts = ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com', 'm.tiktok.com'];
      if (!allowedHosts.includes(host)) {
        return res.status(400).json({ error: 'Only official TikTok URLs are supported' });
      }

      // Check that target host does not resolve to private or internal networks
      const resolved = await dns.lookup(host, { all: true });
      for (const entry of resolved) {
        if (isPrivateOrBlockedIP(entry.address)) {
          return res.status(403).json({ error: 'Target host resolves to a prohibited internal IP address' });
        }
      }

      const fetchUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
      const response = await safeFetchWithRedirects(fetchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        },
        timeoutMs: 8000
      }, ['tiktok.com'], 0); // 0 redirects allowed: strictly pinned to TikTok

      if (!response.ok) {
        throw new Error(`Upstream returned HTTP status ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Upstream did not return a valid JSON format');
      }

      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      console.error('Oembed proxy error:', err);
      res.status(500).json({ error: err.message || 'Failed to fetch oembed' });
    }
  });

  // Google Drive thumbnail proxy endpoint (hardened against SSRF, redirects & private IPs)
  app.get('/api/gdrive-thumbnail', mediaStreamLimiter, async (req, res) => {
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
        const response = await safeFetchWithRedirects(fetchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
          },
          timeoutMs: 10000
        }, ['googleusercontent.com', 'google.com'], 3);

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
        // try next candidate safely
      }
    }

    return res.status(404).json({ error: 'Thumbnail not available' });
  });

  // Google Drive video stream proxy endpoint (hardened against SSRF, redirects & private IPs)
  app.get('/api/gdrive-stream', mediaStreamLimiter, async (req, res) => {
    const { id } = req.query;
    if (!id || typeof id !== 'string' || !DRIVE_ID_REGEX.test(id)) {
      return res.status(400).json({ error: 'Invalid or missing Google Drive ID parameter' });
    }

    const candidateUrls = [
      `https://drive.usercontent.google.com/download?id=${id}&export=download&authuser=0`,
      `https://drive.google.com/uc?export=download&id=${id}&confirm=t`,
      `https://docs.google.com/uc?export=download&id=${id}`
    ];

    // Sanitize Range header against injection
    const rawRange = req.headers.range;
    let rangeHeader: string | undefined = undefined;
    if (typeof rawRange === 'string' && /^bytes=\d*-\d*$/.test(rawRange.trim())) {
      rangeHeader = rawRange.trim();
    }

    for (const streamUrl of candidateUrls) {
      try {
        const fetchHeaders: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          'Accept': '*/*'
        };
        if (rangeHeader) {
          fetchHeaders['Range'] = rangeHeader;
        }

        const response = await safeFetchWithRedirects(streamUrl, {
          headers: fetchHeaders,
          timeoutMs: 15000
        }, ['google.com', 'googleusercontent.com'], 3);

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
            req.on('close', () => {
              nodeStream.destroy();
            });
            return nodeStream.pipe(res);
          }
        }
      } catch (err) {
        // try next candidate safely
      }
    }

    return res.status(404).json({ error: 'Stream not available' });
  });

  // Protected: Cloudinary Proxy Upload endpoint (admin authorization enforced)
  app.post(
    '/api/upload/cloudinary',
    adminActionLimiter,
    requireAdminAuth,
    upload.single('file'),
    async (req, res) => {
      console.log('Received authenticated Cloudinary proxy upload request:', req.file?.originalname);
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Step 4: Strict binary magic bytes verification
      const rawExt = path.extname(req.file.originalname).toLowerCase().trim();
      if (!verifyFileSignature(req.file.path, req.file.mimetype, rawExt)) {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ error: 'File rejected: Binary signature does not match allowed media formats' });
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
  app.all(['/api/upload', '/api/upload/'], adminActionLimiter, requireAdminAuth, (req, res, next) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
    next();
  }, upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Step 4: Strict binary magic bytes verification
    const rawExt = path.extname(req.file.originalname).toLowerCase().trim();
    if (!verifyFileSignature(req.file.path, req.file.mimetype, rawExt)) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'File rejected: Binary signature does not match allowed media formats' });
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
