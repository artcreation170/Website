Production deployment notes

1. Install dependencies (from Website/):

```powershell
npm install express body-parser dotenv twilio qrcode nodemailer express-rate-limit helmet cors
```

2. Create `.env` from `.env.example` and set real credentials (SMTP, Twilio if using SMS, and CORS origin).

3. Start the server from the `Website` folder. The example server will serve static files and API endpoints:

```powershell
node twilio_server_example.js
```

4. In `checkout.html` set `serverApiEnabled = true` to enable server-backed OTP/QR. For production host the static site using the same server or configure CORS and a reverse proxy.

Hardening recommendations

- Use HTTPS/TLS (terminate TLS at a load balancer or reverse proxy).
- Use a persistent store for OTPs (Redis) instead of in-memory Map.
- Configure stricter CORS origin(s).
- Add monitoring, logging and alerts (use a log shipper or hosted logging).
- Implement CAPTCHAs for public forms if abuse is observed.
- Clean up old QR images and secure the upload/storage location.

Notes

- The server sample uses Ethereal SMTP if no SMTP credentials are provided — suitable only for development.
- EmailJS client method is convenient but not secure for production OTPs; prefer server-side generation and verification.
