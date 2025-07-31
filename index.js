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
exports.app.use((0, helmet_1.default)({
    frameguard: { action: 'deny' }
}));
const fileUploadLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many file operations, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
const upload = (0, multer_1.default)({ dest: 'uploads/' });
exports.app.use(express_1.default.static('public'));
exports.app.use('/download', (req, res, next) => {
    const rawUrl = req.url;
    if (rawUrl.includes('..') || rawUrl.includes('%2e%2e') || rawUrl.includes('%2E%2E')) {
        return res.status(400).send('Invalid filename');
    }
    next();
});
exports.app.post('/upload', fileUploadLimiter, upload.single('pdf'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    res.send(`File uploaded: ${req.file.filename}`);
});
exports.app.get('/download/:filename', fileUploadLimiter, (req, res) => {
    const filename = decodeURIComponent(req.params.filename);
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).send('Invalid filename');
    }
    const uploadsDir = path_1.default.resolve(__dirname, 'uploads');
    const filePath = path_1.default.resolve(uploadsDir, filename);
    if (!filePath.startsWith(uploadsDir + path_1.default.sep)) {
        return res.status(400).send('Invalid filename');
    }
    if (!fs_1.default.existsSync(filePath)) {
        return res.status(404).send('File not found');
    }
    const fileStream = fs_1.default.createReadStream(filePath);
    fileStream.on('error', () => {
        res.status(404).send('File not found');
    });
    fileStream.pipe(res);
});
exports.app.listen(3000, () => {
    console.log('Server listening on port 3000');
});
