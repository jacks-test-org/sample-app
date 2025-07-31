import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export const app = express();

app.use(helmet({
  frameguard: { action: 'deny' }
}));

const fileUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many file operations, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));

app.use('/download', (req, res, next) => {
  const rawUrl = req.url;
  if (rawUrl.includes('..') || rawUrl.includes('%2e%2e') || rawUrl.includes('%2E%2E')) {
    return res.status(400).send('Invalid filename');
  }
  next();
});

app.post('/upload', fileUploadLimiter, upload.single('pdf'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  res.send(`File uploaded: ${req.file.filename}`);
});

app.get('/download/:filename', fileUploadLimiter, (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).send('Invalid filename');
  }
  
  const uploadsDir = path.resolve(__dirname, 'uploads');
  const filePath = path.resolve(uploadsDir, filename);
  
  if (!filePath.startsWith(uploadsDir + path.sep)) {
    return res.status(400).send('Invalid filename');
  }
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }
  
  const fileStream = fs.createReadStream(filePath);
  fileStream.on('error', () => {
    res.status(404).send('File not found');
  });
  fileStream.pipe(res);
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
