import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
// @ts-ignore - html-escaper doesn't have type declarations
import { escape } from 'html-escaper';

export const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  frameguard: { action: 'deny' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

const fileUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many file operations, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

app.use(express.static('public'));

app.use('/download', (req, res, next) => {
  const rawUrl = req.url;
  if (rawUrl.includes('..') || rawUrl.includes('%2e%2e') || rawUrl.includes('%2E%2E')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  next();
});

app.post('/upload', fileUploadLimiter, upload.single('pdf'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const safeFilename = escape(req.file.filename);
  res.json({ 
    message: 'File uploaded successfully',
    filename: safeFilename,
    originalName: escape(req.file.originalname || 'unknown')
  });
});

app.get('/download/:filename', fileUploadLimiter, (req, res) => {
  const filename = req.params.filename;
  
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename format' });
  }
  
  if (filename.length > 255) {
    return res.status(400).json({ error: 'Filename too long' });
  }
  
  const uploadsDir = path.resolve(__dirname, 'uploads');
  const safePath = path.join(uploadsDir, path.basename(filename));
  
  if (!fs.existsSync(safePath) || !safePath.startsWith(uploadsDir + path.sep)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.setHeader('Content-Disposition', 'attachment');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(safePath);
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
