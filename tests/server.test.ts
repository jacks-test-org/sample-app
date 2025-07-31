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

    it('should not upload an invalid file type', async () => {
      const res = await request(app)
        .post('/upload')
        .attach('pdf', path.join(__dirname, 'test.jpg'));
      expect(res.statusCode).toBe(500);
      expect(res.text).toContain('Only PDF files are allowed');
    });
  });

  describe('Download PDF', () => {
    it('should download an existing PDF file', async () => {
      const filename = 'test.pdf';
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, 'test content');

      const res = await request(app).get(`/download/${filename}`);
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toBe(`attachment; filename="${filename}"`);
      expect(Buffer.from(res.body).toString()).toBe('test content');
    });

    it('should return 404 for a non-existing PDF file', async () => {
      const res = await request(app).get('/download/nonexistent.pdf');
      expect(res.statusCode).toBe(404);
      expect(res.text).toBe('File not found');
    });
  });
});
