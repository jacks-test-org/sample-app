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
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

app.use(express.static('public'));

app.post('/upload', upload.single('pdf'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  
  const safeFilename = path.basename(req.file.filename);
  res.json({ 
    message: 'File uploaded successfully',
    filename: safeFilename
  });
});

app.get('/download/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  
  if (!filename || filename === '.' || filename === '..') {
    return res.status(400).send('Invalid filename');
  }
  
  const filePath = path.join(__dirname, 'uploads', filename);
  
  if (!filePath.startsWith(path.join(__dirname, 'uploads'))) {
    return res.status(403).send('Access denied');
  }
  
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).send('File not found');
    }
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', () => {
      res.status(404).send('File not found');
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    fileStream.pipe(res);
  });
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
