# Security Configuration for PulseCharts

This document provides security header configurations for different web servers.

## Apache (.htaccess)

The `.htaccess` file in the root directory contains all necessary Apache configurations.

## Nginx

Add these headers to your Nginx server block:

```nginx
server {
    # ... your existing configuration ...

    # Security Headers
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://d3js.org https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; frame-ancestors 'none';" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # HTTPS only (uncomment if using HTTPS)
    # add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Hide server information
    server_tokens off;
    more_clear_headers Server;
    more_clear_headers X-Powered-By;

    # Cache control for HTML files
    location ~* \.(html|htm)$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
    }

    # Block sensitive files
    location ~* \.(env|log|config)$ {
        deny all;
    }
}
```

## Node.js/Express

Add these middleware to your Express app:

```javascript
const helmet = require('helmet');

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'", 
                "'unsafe-inline'", 
                "'unsafe-eval'", 
                "https://cdnjs.cloudflare.com", 
                "https://d3js.org", 
                "https://cdn.jsdelivr.net"
            ],
            styleSrc: [
                "'self'", 
                "'unsafe-inline'", 
                "https://fonts.googleapis.com", 
                "https://cdn.jsdelivr.net"
            ],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: [
                "'self'", 
                "https://fonts.googleapis.com", 
                "https://fonts.gstatic.com"
            ],
            frameAncestors: ["'none'"]
        }
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true
}));

// Cache control for HTML files
app.use('*.html', (req, res, next) => {
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    next();
});
```

## Python/Flask

```python
from flask import Flask, make_response
from flask_talisman import Talisman

app = Flask(__name__)

# Configure Talisman for security headers
Talisman(app, 
    content_security_policy={
        'default-src': "'self'",
        'script-src': [
            "'self'", 
            "'unsafe-inline'", 
            "'unsafe-eval'", 
            "https://cdnjs.cloudflare.com", 
            "https://d3js.org", 
            "https://cdn.jsdelivr.net"
        ],
        'style-src': [
            "'self'", 
            "'unsafe-inline'", 
            "https://fonts.googleapis.com", 
            "https://cdn.jsdelivr.net"
        ],
        'font-src': ["'self'", "https://fonts.gstatic.com"],
        'img-src': ["'self'", "data:", "blob:"],
        'connect-src': [
            "'self'", 
            "https://fonts.googleapis.com", 
            "https://fonts.gstatic.com"
        ],
        'frame-ancestors': "'none'"
    },
    frame_options='DENY',
    content_type_options=True,
    referrer_policy='strict-origin-when-cross-origin'
)

@app.after_request
def after_request(response):
    if request.endpoint and 'html' in str(response.mimetype):
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    return response
```

## Testing Security Headers

Use these tools to verify your security headers are working:

1. **Online Tools:**
   - https://securityheaders.com/
   - https://observatory.mozilla.org/

2. **Browser Developer Tools:**
   - Check Network tab → Response Headers
   - Look for the security headers listed above

3. **Command Line:**
   ```bash
   curl -I https://yoursite.com/chart.html
   ```

## Notes

- The CSP policy includes `'unsafe-inline'` and `'unsafe-eval'` which are required for D3.js and dynamic chart generation
- For production, consider:
  - Hosting D3.js libraries locally to reduce external dependencies
  - Using nonces or hashes instead of `'unsafe-inline'` for better security
  - Enabling HTTPS and adding HSTS headers
  - Regular security audits and header testing