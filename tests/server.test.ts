import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { app } from '../index';

describe('PDF Upload/Download', () => {
  const uploadDir = path.join(__dirname, '../uploads');

  beforeAll(() => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
  });

  afterAll(() => {
    fs.rmSync(uploadDir, { recursive: true, force: true });
  });

  describe('Upload PDF', () => {
    it('should upload a valid PDF file', async () => {
      const res = await request(app)
        .post('/upload')
        .attach('pdf', path.join(__dirname, 'test.pdf'));
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('File uploaded successfully');
      expect(res.body.filename).toBeDefined();
    });

    it('should reject non-PDF file types', async () => {
      const res = await request(app)
        .post('/upload')
        .attach('pdf', path.join(__dirname, 'test.jpg'));
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('No file uploaded');
    });
  });

  describe('Download PDF', () => {
    it('should download an existing PDF file', async () => {
      const filename = 'test.pdf';
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, 'test content');

      const res = await request(app).get(`/download/${filename}`);
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-disposition']).toBe('attachment');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should return 404 for a non-existing PDF file', async () => {
      const res = await request(app).get('/download/nonexistent.pdf');
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('File not found');
    });

    it('should block path traversal attempts with dot-dot-slash', async () => {
      const res = await request(app).get('/download/../../../etc/passwd');
      expect(res.statusCode).toBe(404);
    });

    it('should block path traversal with forward slashes', async () => {
      const res = await request(app).get('/download/../../etc/passwd');
      expect(res.statusCode).toBe(404);
    });

    it('should block path traversal with backslashes', async () => {
      const res = await request(app).get('/download/..\\..\\etc\\passwd');
      expect(res.statusCode).toBe(404);
    });

    it('should block path traversal with URL encoded characters', async () => {
      const res = await request(app).get('/download/..%2F..%2F..%2Fetc%2Fpasswd');
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Invalid filename');
    });

    it('should block empty filename', async () => {
      const res = await request(app).get('/download/');
      expect(res.statusCode).toBe(404);
    });

    it('should block invalid filename characters', async () => {
      const res = await request(app).get('/download/test@file.pdf');
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Invalid filename format');
    });

    it('should block filenames that are too long', async () => {
      const longFilename = 'a'.repeat(256) + '.pdf';
      const res = await request(app).get(`/download/${longFilename}`);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Filename too long');
    });
  });

  describe('Security Headers', () => {
    it('should not expose X-Powered-By header', async () => {
      const res = await request(app).get('/');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('should include security headers from Helmet', async () => {
      const res = await request(app).get('/');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
    });
  });
});
