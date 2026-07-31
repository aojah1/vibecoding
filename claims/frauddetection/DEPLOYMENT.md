# Deployment Guide

## Quick Start (Development)

### Linux/Mac
```bash
./setup.sh
nano .env  # Add your OpenAI API key
python app.py
```

### Windows
```cmd
setup.bat
notepad .env  # Add your OpenAI API key
python app.py
```

## Production Deployment

### Prerequisites
- Python 3.8+
- Production-grade web server (Gunicorn, uWSGI)
- Reverse proxy (Nginx, Apache)
- SSL certificate
- Database (PostgreSQL, MySQL) for persistent storage

### Step 1: Environment Setup

```bash
# Create production environment
python3 -m venv venv_prod
source venv_prod/bin/activate
pip install -r requirements.txt
pip install gunicorn  # Production WSGI server
```

### Step 2: Configure Environment Variables

Create `.env.production`:
```env
# OpenAI Configuration
OPENAI_API_KEY=your_production_api_key
OPENAI_MODEL=gpt-4-turbo-preview

# NVIDIA Configuration (when available)
NVIDIA_INFERENCE_ENDPOINT=https://nvidia-endpoint.com
NVIDIA_API_KEY=your_nvidia_key
PREFER_NVIDIA=true

# Flask Configuration
FLASK_ENV=production
FLASK_DEBUG=False

# Security
SECRET_KEY=your_very_secure_secret_key_here
SESSION_COOKIE_SECURE=True
SESSION_COOKIE_HTTPONLY=True

# Database (for persistent storage)
DATABASE_URL=postgresql://user:password@localhost:5432/fraud_detection

# Rate Limiting
RATE_LIMIT_ENABLED=True
RATE_LIMIT_PER_HOUR=100

# Logging
LOG_LEVEL=INFO
LOG_FILE=/var/log/statefarm_fraud/app.log
```

### Step 3: Run with Gunicorn

```bash
# Basic
gunicorn -w 4 -b 0.0.0.0:5000 app:app

# Production settings
gunicorn \
  --workers 4 \
  --bind 0.0.0.0:5000 \
  --timeout 120 \
  --access-logfile /var/log/statefarm_fraud/access.log \
  --error-logfile /var/log/statefarm_fraud/error.log \
  --log-level info \
  app:app
```

### Step 4: Nginx Configuration

Create `/etc/nginx/sites-available/fraud-detection`:

```nginx
upstream fraud_detection {
    server 127.0.0.1:5000;
}

server {
    listen 80;
    server_name fraud-detection.statefarm.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name fraud-detection.statefarm.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/statefarm.crt;
    ssl_certificate_key /etc/ssl/private/statefarm.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logging
    access_log /var/log/nginx/fraud-detection-access.log;
    error_log /var/log/nginx/fraud-detection-error.log;

    # Max body size for large claim uploads
    client_max_body_size 10M;

    location / {
        proxy_pass http://fraud_detection;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # Static files (if any)
    location /static/ {
        alias /path/to/your/static/files/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/fraud-detection /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 5: Systemd Service

Create `/etc/systemd/system/fraud-detection.service`:

```ini
[Unit]
Description=StateFarm AI Fraud Detection Service
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/opt/fraud-detection
Environment="PATH=/opt/fraud-detection/venv_prod/bin"
ExecStart=/opt/fraud-detection/venv_prod/bin/gunicorn \
    --workers 4 \
    --bind 127.0.0.1:5000 \
    --timeout 120 \
    --access-logfile /var/log/statefarm_fraud/access.log \
    --error-logfile /var/log/statefarm_fraud/error.log \
    --log-level info \
    app:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable fraud-detection
sudo systemctl start fraud-detection
sudo systemctl status fraud-detection
```

## Database Integration (Optional)

For production, replace in-memory storage with a database.

### Install Database Dependencies

```bash
pip install psycopg2-binary  # PostgreSQL
# or
pip install pymysql  # MySQL
```

### Update app.py

Replace the in-memory `analysis_history` list with database calls:

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

# Database setup
DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

# Replace list operations with database operations
# Instead of: analysis_history.append(analysis)
# Use: 
session = Session()
db_analysis = AnalysisRecord(**analysis)
session.add(db_analysis)
session.commit()
session.close()
```

## Monitoring & Logging

### Application Metrics

Add monitoring with Prometheus or DataDog:

```python
from prometheus_flask_exporter import PrometheusMetrics

metrics = PrometheusMetrics(app)

# Custom metrics
analysis_counter = metrics.counter(
    'fraud_analyses_total', 
    'Total fraud analyses performed'
)

high_risk_counter = metrics.counter(
    'high_risk_claims_total',
    'Total high-risk claims detected'
)
```

### Log Rotation

Create `/etc/logrotate.d/fraud-detection`:

```
/var/log/statefarm_fraud/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload fraud-detection > /dev/null 2>&1 || true
    endscript
}
```

## Security Checklist

- [ ] SSL/TLS enabled with valid certificates
- [ ] API authentication implemented
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] CORS properly configured
- [ ] Environment variables secured
- [ ] Database credentials encrypted
- [ ] Regular security updates
- [ ] Audit logging enabled
- [ ] API keys rotated regularly
- [ ] Backup and disaster recovery plan

## Performance Optimization

### Caching

Implement Redis caching for repeated queries:

```python
import redis
import json

cache = redis.Redis(host='localhost', port=6379, db=0)

def get_cached_analysis(claim_id):
    cached = cache.get(f"analysis:{claim_id}")
    if cached:
        return json.loads(cached)
    return None

def cache_analysis(claim_id, analysis, ttl=3600):
    cache.setex(
        f"analysis:{claim_id}", 
        ttl, 
        json.dumps(analysis)
    )
```

### Async Processing

For batch processing, use Celery:

```python
from celery import Celery

celery = Celery('fraud_detection', broker='redis://localhost:6379')

@celery.task
def analyze_claim_async(claim_data):
    result = fraud_service.analyze_claim(claim_data)
    # Store result in database
    return result
```

## Backup Strategy

### Database Backups

```bash
# PostgreSQL
pg_dump fraud_detection > backup_$(date +%Y%m%d).sql

# Automated daily backups
0 2 * * * /usr/local/bin/backup_fraud_db.sh
```

### Configuration Backups

```bash
# Backup critical configs
tar -czf config_backup_$(date +%Y%m%d).tar.gz \
    .env.production \
    /etc/nginx/sites-available/fraud-detection \
    /etc/systemd/system/fraud-detection.service
```

## Troubleshooting

### High CPU Usage
- Reduce number of Gunicorn workers
- Implement caching
- Use more economical OpenAI model (gpt-3.5-turbo)

### Memory Issues
- Enable database instead of in-memory storage
- Implement result pagination
- Add result TTL and automatic cleanup

### Slow Response Times
- Add Redis caching
- Implement async processing for batch operations
- Optimize OpenAI prompt length
- Consider using NVIDIA model for faster inference

## Cost Optimization

### OpenAI API Costs

Monitor usage:
```python
# Track token usage
def track_api_usage(response):
    tokens = response.usage.total_tokens
    cost = tokens * 0.00001  # Approximate cost per token
    # Log or store for analysis
```

Cost reduction strategies:
1. Use gpt-3.5-turbo for non-critical analyses
2. Implement caching for similar claims
3. Batch process where possible
4. Set token limits on responses
5. Monitor and alert on unusual usage patterns

## Maintenance

### Regular Tasks

Daily:
- Monitor error logs
- Check API usage and costs
- Review high-risk claim alerts

Weekly:
- Review system performance metrics
- Update fraud detection patterns
- Backup database

Monthly:
- Security updates
- API key rotation
- Performance optimization review
- Cost analysis

### Updates

```bash
# Activate environment
source venv_prod/bin/activate

# Pull latest code
git pull origin main

# Update dependencies
pip install -r requirements.txt

# Restart service
sudo systemctl restart fraud-detection
```

## Support Contacts

- Development Team: dev-team@statefarm.com
- Infrastructure: infra@statefarm.com
- Security: security@statefarm.com
- OpenAI Support: https://help.openai.com
