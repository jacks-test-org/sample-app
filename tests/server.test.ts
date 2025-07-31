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
      expect(res.text).toContain('File uploaded');
    });

    it('should accept any file type (multer behavior)', async () => {
      const res = await request(app)
        .post('/upload')
        .attach('pdf', path.join(__dirname, 'test.jpg'));
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('File uploaded');
    });
  });

  describe('Download PDF', () => {
    it('should download an existing PDF file', async () => {
      const filename = 'test.pdf';
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, 'test content');

      const res = await request(app).get(`/download/${filename}`);
      expect(res.statusCode).toBe(200);
      expect(res.text).toBe('test content');
    });

    it('should return 404 for a non-existing PDF file', async () => {
      const res = await request(app).get('/download/nonexistent.pdf');
      expect(res.statusCode).toBe(404);
      expect(res.text).toBe('File not found');
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
      expect(res.text).toBe('Invalid filename');
    });

    it('should block empty filename', async () => {
      const res = await request(app).get('/download/');
      expect(res.statusCode).toBe(404);
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
