import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});

app.use(limiter);

const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

app.use(express.static('public'));

app.post('/upload', upload.single('pdf'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  
  const sanitizedFilename = req.file.filename.replace(/[^a-zA-Z0-9.-]/g, '');
  res.json({ 
    message: 'File uploaded successfully',
    filename: sanitizedFilename 
  });
});

app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '');
  const uploadsDir = path.resolve(__dirname, 'uploads');
  const filePath = path.join(uploadsDir, sanitizedFilename);
  
  if (!filePath.startsWith(uploadsDir)) {
    return res.status(403).json({ error: 'Access denied: Path traversal attempt detected' });
  }
  
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', () => {
      res.status(500).json({ error: 'Error reading file' });
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
    fileStream.pipe(res);
  });
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
