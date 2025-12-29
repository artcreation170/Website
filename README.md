# Art and Creation — local delivery checklist

Quick steps to prepare and deliver the site with improved performance.

1) Run a local web server (FormSubmit and many features require HTTP):

Windows / PowerShell:
```powershell
python -m http.server 8000
# or if port 8000 is in use:
python -m http.server 0
```

2) Convert images to WebP (optional but recommended):

```bash
pip install -r requirements.txt
python convert_images.py --quality 80
```

3) Verify images and start server, then open:

http://localhost:8000/index.html

4) Deploy to a static host (Netlify, Vercel, GitHub Pages) and enable caching/CDN.

Notes & recommendations:
- Compress large JPEGs and resize to appropriate thumbnail sizes (for product cards use 600×400 or smaller).
- Remove or lazy-load non-critical third-party widgets (YouTube script, analytics) to reduce render blocking.
- Use the included `js/webp-swap.js` which attempts to replace JPG/PNG images with `.webp` files if they exist and the browser supports WebP.
- For production email delivery use a server-side integration or a client provider (EmailJS, SMTP) — FormSubmit requires HTTP(s).
# art-creationweb-appI

A web application for showcasing and creating digital art.

## Features
- Upload and display artwork
- User authentication
- Gallery view
- Responsive design

## Getting Started

1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/art-creationweb-app.git
    ```
2. Install dependencies:
    ```bash
    npm install
    ```
3. Start the development server:
    ```bash
    npm start
    ```

## Technologies Used
- React
- Node.js
- Express
- MongoDB

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](LICENSE)