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
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        }
        else {
            cb(new Error('Only PDF files are allowed'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});
exports.app.use(express_1.default.static('public'));
exports.app.post('/upload', upload.single('pdf'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    const safeFilename = path_1.default.basename(req.file.filename);
    res.json({
        message: 'File uploaded successfully',
        filename: safeFilename
    });
});
exports.app.get('/download/:filename', (req, res) => {
    const filename = path_1.default.basename(req.params.filename);
    if (!filename || filename === '.' || filename === '..') {
        return res.status(400).send('Invalid filename');
    }
    const filePath = path_1.default.join(__dirname, 'uploads', filename);
    if (!filePath.startsWith(path_1.default.join(__dirname, 'uploads'))) {
        return res.status(403).send('Access denied');
    }
    fs_1.default.access(filePath, fs_1.default.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).send('File not found');
        }
        const fileStream = fs_1.default.createReadStream(filePath);
        fileStream.on('error', () => {
            res.status(404).send('File not found');
        });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        fileStream.pipe(res);
    });
});
exports.app.listen(3000, () => {
    console.log('Server listening on port 3000');
});
