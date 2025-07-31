"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
exports.app = (0, express_1.default)();
exports.app.disable('x-powered-by');
exports.app.use((0, helmet_1.default)());
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});
exports.app.use(limiter);
const upload = (0, multer_1.default)({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        }
        else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});
exports.app.use(express_1.default.static('public'));
exports.app.post('/upload', upload.single('pdf'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    const sanitizedFilename = req.file.filename.replace(/[^a-zA-Z0-9.-]/g, '');
    res.json({
        message: 'File uploaded successfully',
        filename: sanitizedFilename
    });
});
exports.app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ error: 'Invalid filename' });
    }
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '');
    const uploadsDir = path_1.default.resolve(__dirname, 'uploads');
    const filePath = path_1.default.join(uploadsDir, sanitizedFilename);
    if (!filePath.startsWith(uploadsDir)) {
        return res.status(403).json({ error: 'Access denied: Path traversal attempt detected' });
    }
    fs_1.default.access(filePath, fs_1.default.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).json({ error: 'File not found' });
        }
        const fileStream = fs_1.default.createReadStream(filePath);
        fileStream.on('error', () => {
            res.status(500).json({ error: 'Error reading file' });
        });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
        fileStream.pipe(res);
    });
});
exports.app.listen(3000, () => {
    console.log('Server listening on port 3000');
});
