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
// @ts-ignore - html-escaper doesn't have type declarations
const html_escaper_1 = require("html-escaper");
exports.app = (0, express_1.default)();
exports.app.use((0, helmet_1.default)({
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
const fileUploadLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many file operations, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
const upload = (0, multer_1.default)({
    dest: 'uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(null, false);
        }
    }
});
exports.app.use(express_1.default.static('public'));
exports.app.use('/download', (req, res, next) => {
    const rawUrl = req.url;
    if (rawUrl.includes('..') || rawUrl.includes('%2e%2e') || rawUrl.includes('%2E%2E')) {
        return res.status(400).json({ error: 'Invalid filename' });
    }
    next();
});
exports.app.post('/upload', fileUploadLimiter, upload.single('pdf'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const safeFilename = (0, html_escaper_1.escape)(req.file.filename);
    res.json({
        message: 'File uploaded successfully',
        filename: safeFilename,
        originalName: (0, html_escaper_1.escape)(req.file.originalname || 'unknown')
    });
});
exports.app.get('/download/:filename', fileUploadLimiter, (req, res) => {
    const filename = req.params.filename;
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
        return res.status(400).json({ error: 'Invalid filename format' });
    }
    if (filename.length > 255) {
        return res.status(400).json({ error: 'Filename too long' });
    }
    const uploadsDir = path_1.default.resolve(__dirname, 'uploads');
    const safePath = path_1.default.join(uploadsDir, path_1.default.basename(filename));
    if (!fs_1.default.existsSync(safePath) || !safePath.startsWith(uploadsDir + path_1.default.sep)) {
        return res.status(404).json({ error: 'File not found' });
    }
    res.setHeader('Content-Disposition', 'attachment');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(safePath);
});
exports.app.listen(3000, () => {
    console.log('Server listening on port 3000');
});
