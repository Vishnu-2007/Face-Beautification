const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { spawn } = require('child_process');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'beautify_ai';
const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = Number(process.env.EMAIL_PORT || 587);
const EMAIL_SECURE = process.env.EMAIL_SECURE === 'true';
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Beautify AI <no-reply@beautify.ai>';
const PYTHON_CMD = process.env.PYTHON_CMD || path.join(__dirname, '..', 'direct_beautification', 'direct_beautification', 'gfpgan_env', 'Scripts', 'python.exe');
const DIRECT_MODEL_SCRIPT = path.join(__dirname, '..', 'direct_beautification', 'direct_beautification', 'inference', 'run_inference.py');
const GFPGAN_SCRIPT = path.join(__dirname, '..', 'direct_beautification', 'direct_beautification', 'enhancement', 'gfpgan_enhance.py');
const REALESRGAN_SCRIPT = path.join(__dirname, '..', 'direct_beautification', 'direct_beautification', 'enhancement', 'realesrgan_upscale.py');

let dbClient;
let usersCollection;
let historyCollection;
let otpCollection;

let emailTransporter;
if (EMAIL_HOST && EMAIL_USER && EMAIL_PASS) {
    emailTransporter = nodemailer.createTransport({
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: EMAIL_SECURE,
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS
        }
    });
}

const sendOtpEmail = async (email, otp) => {
    if (!emailTransporter) {
        console.warn(`OTP for ${email}: ${otp} (EMAIL_HOST/EMAIL_USER/EMAIL_PASS not configured)`);
        return;
    }
    await emailTransporter.sendMail({
        from: EMAIL_FROM,
        to: email,
        subject: 'Your Beautify AI login OTP',
        text: `Your Beautify AI login code is ${otp}. It expires in 5 minutes.`,
        html: `<p>Your Beautify AI login code is <strong>${otp}</strong>.</p><p>It expires in 5 minutes.</p>`
    });
};

const getObjectId = (id) => {
    try {
        return new ObjectId(id);
    } catch {
        return null;
    }
};

const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

const runPythonScript = (scriptPath, args = []) => {
    return new Promise((resolve, reject) => {
        console.log(`[PYTHON] Running: ${path.basename(scriptPath)} with args:`, args);

        const pythonProcess = spawn(PYTHON_CMD, [scriptPath, ...args], {
            cwd: path.dirname(scriptPath),
            env: process.env
        });

        let stderr = '';
        let stdout = '';

        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
            console.log(`[PYTHON STDOUT] ${data.toString()}`);
        });

        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
            console.log(`[PYTHON STDERR] ${data.toString()}`);
        });

        pythonProcess.on('error', (err) => {
            console.error(`[PYTHON ERROR] ${scriptPath}: ${err.message}`);
            reject(new Error(`Python process error: ${err.message}`));
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                console.log(`[PYTHON OK] ${path.basename(scriptPath)} completed successfully`);
                resolve({ stdout, stderr });
            } else {
                console.error(`[PYTHON FAIL] ${path.basename(scriptPath)} exited with code ${code}`);
                reject(new Error(`Python process exited with code ${code}. stderr: ${stderr}`));
            }
        });
    });
};

const connectToMongo = async () => {
    dbClient = new MongoClient(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    await dbClient.connect();
    const db = dbClient.db(DB_NAME);
    usersCollection = db.collection('users');
    historyCollection = db.collection('history');
    otpCollection = db.collection('login_otps');

    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await otpCollection.createIndex({ email: 1 }, { unique: true });
    console.log('Connected to MongoDB:', MONGO_URI, 'DB:', DB_NAME);
};

connectToMongo().catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

// --- Middleware ---
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Security headers — allow everything for demo/ngrok
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src * 'unsafe-inline' 'unsafe-eval'; img-src * data: blob:;");
    res.setHeader("ngrok-skip-browser-warning", "true");
    next();
});

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend dist (production build)
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

// Test route
app.get('/test', (req, res) => {
    res.send('Server is working!');
});

// JWT Middleware
const auth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// --- Auth Endpoints ---

// Signup
app.post('/api/auth/signup', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const userName = name || 'User';

        const result = await usersCollection.insertOne({
            name: userName,
            email,
            password: hashedPassword,
            created_at: new Date()
        });

        const token = jwt.sign({ id: result.insertedId.toString() }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: { id: result.insertedId.toString(), name: userName, email } });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        console.error('Signup error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    try {
        const user = await usersCollection.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = hashOtp(otp);
        const expiresAt = new Date(Date.now() + 45 * 1000);

        await otpCollection.updateOne(
            { email },
            { $set: { otpHash, expiresAt, createdAt: new Date() } },
            { upsert: true }
        );

        sendOtpEmail(email, otp).catch(err => console.error('Email send error:', err));
        res.json({ message: 'OTP sent to your email. Enter it to complete login.' });
    } catch (err) {
        console.error('Login OTP error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Resend OTP
app.post('/api/auth/resend-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    try {
        const user = await usersCollection.findOne({ email });
        if (!user) return res.status(400).json({ message: 'User not found' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = hashOtp(otp);
        const expiresAt = new Date(Date.now() + 45 * 1000);

        await otpCollection.updateOne(
            { email },
            { $set: { otpHash, expiresAt, createdAt: new Date() } },
            { upsert: true }
        );

        sendOtpEmail(email, otp).catch(err => console.error('Email send error:', err));
        res.json({ message: 'New OTP sent to your email. It expires in 45 seconds.' });
    } catch (err) {
        console.error('Resend OTP error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

    try {
        const otpEntry = await otpCollection.findOne({ email });
        if (!otpEntry || !otpEntry.expiresAt || otpEntry.expiresAt < new Date()) {
            return res.status(400).json({ message: 'OTP is invalid or expired' });
        }

        const providedHash = hashOtp(otp);
        if (providedHash !== otpEntry.otpHash) {
            return res.status(400).json({ message: 'OTP is invalid or expired' });
        }

        const user = await usersCollection.findOne({ email });
        if (!user) return res.status(400).json({ message: 'User not found' });

        await otpCollection.deleteOne({ email });

        const token = jwt.sign({ id: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user._id.toString(), name: user.name, email: user.email } });
    } catch (err) {
        console.error('OTP verify error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update Password
app.post('/api/auth/update-password', auth, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = getObjectId(req.user.id);
    if (!userId) return res.status(400).json({ message: 'Invalid user ID' });

    try {
        const user = await usersCollection.findOne({ _id: userId }, { projection: { password: 1 } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Current password incorrect' });

        const hashedNew = await bcrypt.hash(newPassword, 10);
        await usersCollection.updateOne({ _id: userId }, { $set: { password: hashedNew } });
        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        console.error('Update password error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- Studio Endpoints ---

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

// Process Beautification
app.post('/api/beautify', auth, upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'reference', maxCount: 1 }
]), async (req, res) => {
    const userId = getObjectId(req.user.id);
    const type = req.body.type || 'direct';
    const targetFile = req.files['image'] ? req.files['image'][0].filename : null;
    const referenceFile = req.files['reference'] ? req.files['reference'][0].filename : null;

    if (!targetFile) {
        return res.status(400).json({ message: 'Target image is required' });
    }

    const targetPath = path.join(__dirname, 'uploads', targetFile);
    const outputFileName = `beautified-${Date.now()}-${path.parse(targetFile).name}.png`;
    const outputPath = path.join(__dirname, 'uploads', outputFileName);

    let beautifiedImage = targetFile;

    try {
        if (type !== 'direct') {
            return res.status(400).json({
                success: false,
                message: `Unsupported beautification type: ${type}. Please select direct mode.`
            });
        }

        console.log(`Beautify request: direct mode, target=${targetFile}, output=${outputFileName}`);

        const ssimCheckpoint = 'checkpoints_ssim/generator_epoch_100.pth';
        await runPythonScript(DIRECT_MODEL_SCRIPT, [
            '--input', targetPath,
            '--output', outputPath,
            '--intensity', '0.85',
            '--checkpoint', ssimCheckpoint
        ]);

        const gfpganOutputName = `beautified-gfpgan-${Date.now()}-${path.parse(targetFile).name}.png`;
        const gfpganOutputPath = path.join(__dirname, 'uploads', gfpganOutputName);

        await runPythonScript(GFPGAN_SCRIPT, [
            '--input', outputPath,
            '--output', gfpganOutputPath
        ]);

        const realsrganOutputName = `beautified-realesrgan-${Date.now()}-${path.parse(targetFile).name}.png`;
        const realsrganOutputPath = path.join(__dirname, 'uploads', realsrganOutputName);

        await runPythonScript(REALESRGAN_SCRIPT, [
            '--input', gfpganOutputPath,
            '--output', realsrganOutputPath
        ]);

        beautifiedImage = realsrganOutputName;

        const fileExists = require('fs').existsSync(realsrganOutputPath);
        console.log(`[BEAUTIFY] Output file exists: ${fileExists} at ${realsrganOutputPath}`);

        await historyCollection.insertOne({
            user_id: userId,
            original_image: targetFile,
            beautified_image: beautifiedImage,
            type,
            timestamp: new Date(),
            reference_image: referenceFile || null
        });

        // Relative URL — works with both localhost and ngrok
        res.json({
            success: true,
            beautifiedImageUrl: `/uploads/${beautifiedImage}`
        });
    } catch (err) {
        console.error('Beautify processing error:', err);
        res.status(500).json({ message: 'Beautification failed', details: err.message });
    }
});

// Get User History
app.get('/api/user/history', auth, async (req, res) => {
    const userId = getObjectId(req.user.id);
    if (!userId) return res.status(400).json({ message: 'Invalid user ID' });

    try {
        const rows = await historyCollection
            .find({ user_id: userId })
            .sort({ timestamp: -1 })
            .toArray();
        res.json(rows);
    } catch (err) {
        console.error('Fetch history error:', err);
        res.status(500).json({ message: 'History error' });
    }
});

// Catch-all — serve frontend for any unmatched route (Express v5 compatible)
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});