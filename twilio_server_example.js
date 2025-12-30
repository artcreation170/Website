// Simple Express server example showing Twilio Verify usage for OTP send/verify
// Usage:
// 1. Install dependencies: npm install express body-parser dotenv twilio qrcode nodemailer
// 2. Set environment variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SERVICE_SID, PORT (optional)
// 3. Run: node twilio_server_example.js

const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(helmet());
app.use(bodyParser.json());

// Configure CORS (restrict in production to your domain)
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));

// Basic rate limiter for API endpoints
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: 'Too many requests, please try again later.' });
app.use('/api/', apiLimiter);

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_SERVICE_SID; // Twilio Verify Service SID

if (!accountSid || !authToken || !serviceSid) {
  console.error('Missing Twilio env vars. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SERVICE_SID');
  process.exit(1);
}

const client = require('twilio')(accountSid, authToken);
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');

// Ensure qrcodes folder exists
const qrDir = path.join(__dirname, 'qrcodes');
if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

// Serve static site and qrcodes from this directory (run server from Website/)
app.use(express.static(path.join(__dirname)));

// Simple in-memory store for email OTPs (for demo). For production use a persistent store (Redis, DB).
const emailOtps = new Map();

// Periodic cleanup for expired OTPs
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of emailOtps.entries()) {
    if (v.expiresAt && now > v.expiresAt) emailOtps.delete(k);
  }
}, 60 * 1000);

// Nodemailer transporter: prefer SMTP env vars, fallback to ethereal test account
async function createTransporter() {
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
  }
  // fallback to ethereal
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: { user: testAccount.user, pass: testAccount.pass }
  });
}

// Send OTP via Twilio Verify
app.post('/api/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ success: false, error: 'Missing phone' });
  // basic validation
  const digits = (phone || '').replace(/\D/g, '');
  if (!/^\d{8,15}$/.test(digits)) return res.status(400).json({ success: false, error: 'Invalid phone' });
  try {
    const verification = await client.verify.services(serviceSid)
      .verifications.create({ to: phone, channel: 'sms' });
    return res.json({ success: true, sid: verification.sid, status: verification.status });
  } catch (err) {
    console.error('send-otp error', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Verify OTP
app.post('/api/verify-otp', async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ verified: false, error: 'Missing phone or code' });
  try {
    const check = await client.verify.services(serviceSid)
      .verificationChecks.create({ to: phone, code });
    return res.json({ verified: check.status === 'approved', status: check.status });
  } catch (err) {
    console.error('verify-otp error', err);
    return res.status(500).json({ verified: false, error: err.message });
  }
});

// Send Email OTP
app.post('/api/send-email-otp', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ success: false, error: 'Missing email' });
  try {
    const existing = emailOtps.get(email);
    const now = Date.now();
    const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute
    if (existing && existing.lastSent && now - existing.lastSent < RESEND_COOLDOWN_MS) {
      return res.status(429).json({ success: false, error: 'OTP recently sent. Please wait before retrying.' });
    }
    
    const transporter = await createTransporter();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = now + (5 * 60 * 1000);
    // Store attemptsLeft to prevent brute force
    emailOtps.set(email, { code, expiresAt, attemptsLeft: 5, lastSent: now });
    const mail = await transporter.sendMail({
      from: process.env.FROM_EMAIL || 'no-reply@example.com',
      to: email,
      subject: 'Your verification code',
      text: `Your verification code is ${code}. It expires in 5 minutes.`
    });
    const info = mail && mail.messageId ? { messageId: mail.messageId } : {};
    if (nodemailer.getTestMessageUrl) {
      info.preview = nodemailer.getTestMessageUrl(mail) || undefined;
    }
    return res.json({ success: true, ...info });
  } catch (err) {
    console.error('send-email-otp error', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Verify Email OTP
app.post('/api/verify-email-otp', async (req, res) => {
  const { email, code } = req.body || {};
  if (!email || !code) return res.status(400).json({ verified: false, error: 'Missing email or code' });
  try {
    const entry = emailOtps.get(email);
    if (!entry) return res.json({ verified: false, error: 'No code sent' });
    if (Date.now() > entry.expiresAt) {
      emailOtps.delete(email);
      return res.json({ verified: false, error: 'Code expired' });
    }
    if (entry.attemptsLeft <= 0) {
      emailOtps.delete(email);
      return res.status(429).json({ verified: false, error: 'Too many attempts' });
    }
    if (entry.code === String(code)) {
      emailOtps.delete(email);
      return res.json({ verified: true });
    }
    // wrong code: decrement attempts
    entry.attemptsLeft = (entry.attemptsLeft || 5) - 1;
    emailOtps.set(email, entry);
    return res.json({ verified: false, error: 'Incorrect code', attemptsLeft: entry.attemptsLeft });
  } catch (err) {
    console.error('verify-email-otp error', err);
    return res.status(500).json({ verified: false, error: err.message });
  }
});

// Generate and store QR image for payment (server-side)
// Request body: { product: 'name', price: '499' }
app.post('/api/generate-qr', async (req, res) => {
  const { product, price } = req.body || {};
  if (!product || !price) return res.status(400).json({ success: false, error: 'Missing product or price' });
  try {
    const payload = `Pay INR ${price} for ${product}`;
    const filename = `qr_${Date.now()}.png`;
    const outPath = path.join(qrDir, filename);
    await QRCode.toFile(outPath, payload, { type: 'png' });
    // Expose via simple static path
    const urlPath = `/qrcodes/${filename}`;
    return res.json({ success: true, filename, url: urlPath });
  } catch (err) {
    console.error('generate-qr error', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Serve generated QR images
app.use('/qrcodes', express.static(qrDir));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Twilio OTP example server listening on ${PORT}`));
