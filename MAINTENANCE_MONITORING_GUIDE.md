# PrivacyGuard Maintenance and Monitoring Guide

This guide provides comprehensive procedures for maintaining and monitoring the PrivacyGuard platform to ensure optimal performance, security, and reliability.

## Table of Contents

1. [Monitoring Overview](#monitoring-overview)
2. [Performance Monitoring](#performance-monitoring)
3. [Security Monitoring](#security-monitoring)
4. [Database Monitoring](#database-monitoring)
5. [Application Monitoring](#application-monitoring)
6. [Infrastructure Monitoring](#infrastructure-monitoring)
7. [Alerting and Notifications](#alerting-and-notifications)
8. [Maintenance Schedules](#maintenance-schedules)
9. [Preventive Maintenance](#preventive-maintenance)
10. [Capacity Planning](#capacity-planning)
11. [Incident Response](#incident-response)
12. [Reporting and Analytics](#reporting-and-analytics)

## Monitoring Overview

### Monitoring Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │───►│   Prometheus    │───►│    Grafana      │
│    Metrics      │    │   (Metrics)     │    │  (Dashboard)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   System Logs   │───►│   ELK Stack     │───►│   AlertManager  │
│   (Filebeat)    │    │ (Elasticsearch) │    │ (Notifications) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Health Checks │───►│   Uptime Robot  │───►│   PagerDuty     │
│   (External)    │    │   (Monitoring)  │    │  (Escalation)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Monitoring Components

1. **Application Performance Monitoring (APM)**
2. **Infrastructure Monitoring**
3. **Database Performance Monitoring**
4. **Security Event Monitoring**
5. **Business Metrics Monitoring**
6. **External Service Monitoring**

### Monitoring Tools Stack

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **ELK Stack**: Log aggregation and analysis
- **AlertManager**: Alert routing and notifications
- **Uptime Robot**: External uptime monitoring
- **PagerDuty**: Incident management and escalation

## Performance Monitoring

### Application Performance Metrics

#### Response Time Monitoring

```bash
# Monitor API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/api/v1/health

# Prometheus query for average response time
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])
```

**Key Metrics:**
- Average response time: < 2 seconds
- 95th percentile response time: < 5 seconds
- 99th percentile response time: < 10 seconds

#### Throughput Monitoring

```bash
# Monitor requests per second
# Prometheus query
rate(http_requests_total[5m])
```

**Key Metrics:**
- Requests per second (RPS)
- Requests per minute (RPM)
- Peak traffic patterns

#### Error Rate Monitoring

```bash
# Monitor error rates
# Prometheus query for error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100
```

**Thresholds:**
- Error rate < 1% (normal)
- Error rate < 5% (warning)
- Error rate > 5% (critical)

### System Resource Monitoring

#### CPU Monitoring

```bash
# Monitor CPU usage
docker stats --format "table {{.Container}}\t{{.CPUPerc}}"

# Prometheus query
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

**Thresholds:**
- CPU usage < 70% (normal)
- CPU usage 70-85% (warning)
- CPU usage > 85% (critical)

#### Memory Monitoring

```bash
# Monitor memory usage
free -h
docker stats --format "table {{.Container}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Prometheus query
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100
```

**Thresholds:**
- Memory usage < 80% (normal)
- Memory usage 80-90% (warning)
- Memory usage > 90% (critical)

#### Disk Monitoring

```bash
# Monitor disk usage
df -h
du -sh /opt/privacyguard/*

# Prometheus query
100 - ((node_filesystem_avail_bytes * 100) / node_filesystem_size_bytes)
```

**Thresholds:**
- Disk usage < 80% (normal)
- Disk usage 80-90% (warning)
- Disk usage > 90% (critical)

### Network Monitoring

```bash
# Monitor network connections
netstat -tulpn | grep -E ":80|:443|:3001|:5432|:27017|:6379"

# Monitor network traffic
iftop -i eth0

# Prometheus query for network I/O
rate(node_network_receive_bytes_total[5m])
rate(node_network_transmit_bytes_total[5m])
```

## Security Monitoring

### Authentication Monitoring

#### Failed Login Attempts

```bash
# Monitor failed login attempts
docker-compose logs backend | grep "authentication failed" | tail -20

# Create alert for multiple failed attempts
grep "authentication failed" /var/log/privacyguard/auth.log | 
  awk '{print $1}' | sort | uniq -c | awk '$1 > 5 {print $2}'
```

#### Suspicious Activity Detection

```bash
# Monitor for suspicious patterns
docker-compose logs backend | grep -E "rate.limit|suspicious|security" | tail -50

# Check for brute force attempts
docker-compose logs nginx | awk '{print $1}' | sort | uniq -c | sort -nr | head -10
```

### Access Control Monitoring

```bash
# Monitor unauthorized access attempts
docker-compose logs backend | grep -i "unauthorized\|forbidden" | tail -20

# Monitor privilege escalation attempts
docker-compose logs backend | grep -i "privilege\|escalation\|admin" | tail -20
```

### Security Event Alerts

#### Real-time Security Monitoring

```bash
#!/bin/bash
# /opt/privacyguard/scripts/security-monitor.sh

# Monitor for security events
tail -f /var/log/privacyguard/security.log | while read line; do
  if echo "$line" | grep -q "SECURITY_BREACH"; then
    # Send immediate alert
    curl -X POST https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK \
      -H 'Content-type: application/json' \
      --data "{\"text\":\"🚨 SECURITY ALERT: $line\"}"
  fi
done
```

## Database Monitoring

### PostgreSQL Monitoring

#### Connection Monitoring

```bash
# Monitor active connections
docker-compose exec postgres psql -U privacyguard_user -d privacyguard -c "
  SELECT count(*) as active_connections,
         (SELECT setting::int FROM pg_settings WHERE name='max_connections') as max_connections,
         (SELECT setting::int FROM pg_settings WHERE name='max_connections') - count(*) as available_connections
  FROM pg_stat_activity;"
```

#### Query Performance Monitoring

```bash
# Monitor slow queries
docker-compose exec postgres psql -U privacyguard_user -d privacyguard -c "
  SELECT query, mean_time, calls, total_time, rows, 
         100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
  FROM pg_stat_statements 
  ORDER BY mean_time DESC 
  LIMIT 10;"
```

#### Database Size Monitoring

```bash
# Monitor database growth
docker-compose exec postgres psql -U privacyguard_user -d privacyguard -c "
  SELECT schemaname, tablename,
         pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
         pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
  FROM pg_tables 
  WHERE schemaname = 'public' 
  ORDER BY size_bytes DESC;"
```

### MongoDB Monitoring

#### Performance Metrics

```bash
# Monitor MongoDB performance
docker-compose exec mongodb mongosh --eval "
  db.serverStatus().metrics.operation"

# Monitor collection statistics
docker-compose exec mongodb mongosh --eval "
  db.stats(1024*1024)"  # Size in MB
```

#### Index Usage Monitoring

```bash
# Monitor index usage
docker-compose exec mongodb mongosh --eval "
  db.policy_documents.aggregate([{\$indexStats: {}}])"

# Check for missing indexes
docker-compose exec mongodb mongosh --eval "
  db.policy_documents.find().explain('executionStats')"
```

### Redis Monitoring

#### Memory and Performance

```bash
# Monitor Redis memory usage
docker-compose exec redis redis-cli info memory

# Monitor cache hit rate
docker-compose exec redis redis-cli info stats | grep -E "hit|miss"

# Monitor key statistics
docker-compose exec redis redis-cli info keyspace
```

## Application Monitoring

### Health Check Monitoring

#### Automated Health Checks

```bash
#!/bin/bash
# /opt/privacyguard/scripts/health-check.sh

HEALTH_ENDPOINT="http://localhost:3001/health"
ALERT_WEBHOOK="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

# Check application health
response=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_ENDPOINT")

if [ "$response" != "200" ]; then
  # Send alert
  curl -X POST "$ALERT_WEBHOOK" \
    -H 'Content-type: application/json' \
    --data "{\"text\":\"🔴 Health check failed: HTTP $response\"}"
  
  # Log the failure
  echo "$(date): Health check failed with HTTP $response" >> /var/log/privacyguard/health.log
fi
```

#### Service Dependency Monitoring

```bash
# Monitor service dependencies
docker-compose exec backend npm run health:dependencies

# Check database connectivity
docker-compose exec backend npm run db:ping

# Check external service connectivity
docker-compose exec backend npm run external:ping
```

### Business Metrics Monitoring

#### DSAR Processing Metrics

```bash
# Monitor DSAR processing times
docker-compose exec postgres psql -U privacyguard_user -d privacyguard -c "
  SELECT 
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as avg_processing_hours,
    COUNT(*) as total_requests,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_requests,
    COUNT(CASE WHEN due_date < NOW() AND status != 'completed' THEN 1 END) as overdue_requests
  FROM dsar_requests 
  WHERE created_at > NOW() - INTERVAL '30 days';"
```

#### Risk Assessment Metrics

```bash
# Monitor risk assessment trends
docker-compose exec postgres psql -U privacyguard_user -d privacyguard -c "
  SELECT 
    risk_level,
    COUNT(*) as count,
    AVG(overall_score) as avg_score
  FROM risk_assessments 
  WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY risk_level;"
```

## Infrastructure Monitoring

### Container Monitoring

#### Docker Container Health

```bash
# Monitor container status
docker-compose ps

# Monitor container resource usage
docker stats --no-stream

# Monitor container logs for errors
docker-compose logs --since 1h backend | grep -i error
```

#### Container Performance Metrics

```bash
# Monitor container restart counts
docker inspect $(docker-compose ps -q) | jq '.[].RestartCount'

# Monitor container uptime
docker inspect $(docker-compose ps -q) | jq '.[].State.StartedAt'
```

### Network Monitoring

```bash
# Monitor network connectivity between services
docker-compose exec backend ping postgres
docker-compose exec backend ping mongodb
docker-compose exec backend ping redis

# Monitor external connectivity
docker-compose exec backend curl -I https://api.external-service.com
```

### Storage Monitoring

```bash
# Monitor Docker volume usage
docker system df

# Monitor backup storage
du -sh /opt/privacyguard/backups/*

# Monitor log file sizes
du -sh /opt/privacyguard/logs/*
```

## Alerting and Notifications

### Alert Configuration

#### Prometheus Alert Rules

```yaml
# /opt/privacyguard/monitoring/alert-rules.yml
groups:
  - name: privacyguard-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100 > 5
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}% for the last 5 minutes"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"

      - alert: DatabaseConnectionHigh
        expr: pg_stat_activity_count / pg_settings_max_connections * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High database connection usage"
          description: "Database connection usage is {{ $value }}%"
```

#### AlertManager Configuration

```yaml
# /opt/privacyguard/monitoring/alertmanager.yml
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@privacyguard.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
  - name: 'web.hook'
    email_configs:
      - to: 'ops-team@privacyguard.com'
        subject: 'PrivacyGuard Alert: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}
    
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#alerts'
        title: 'PrivacyGuard Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

### Notification Channels

#### Email Notifications

```bash
# Configure email alerts
# Update /etc/postfix/main.cf for SMTP relay
relayhost = [smtp.your-provider.com]:587
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_security_options = noanonymous
smtp_tls_security_level = encrypt
```

#### Slack Integration

```bash
# Send Slack notifications
send_slack_alert() {
  local message="$1"
  local webhook_url="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
  
  curl -X POST "$webhook_url" \
    -H 'Content-type: application/json' \
    --data "{\"text\":\"$message\"}"
}
```

#### PagerDuty Integration

```bash
# Send PagerDuty alerts for critical issues
send_pagerduty_alert() {
  local severity="$1"
  local message="$2"
  local integration_key="YOUR_PAGERDUTY_INTEGRATION_KEY"
  
  curl -X POST https://events.pagerduty.com/v2/enqueue \
    -H 'Content-Type: application/json' \
    -d "{
      \"routing_key\": \"$integration_key\",
      \"event_action\": \"trigger\",
      \"payload\": {
        \"summary\": \"$message\",
        \"severity\": \"$severity\",
        \"source\": \"privacyguard-monitoring\"
      }
    }"
}
```

## Maintenance Schedules

### Daily Maintenance Tasks

#### Automated Daily Tasks (2:00 AM)

```bash
#!/bin/bash
# /opt/privacyguard/scripts/daily-maintenance.sh

# Health checks
./health-check.sh

# Backup verification
./verify-backups.sh

# Log rotation
./rotate-logs.sh

# Performance metrics collection
./collect-metrics.sh

# Security scan
./security-scan.sh

# Database maintenance
docker-compose exec postgres psql -U privacyguard_user -d privacyguard -c "ANALYZE;"

# Clear temporary files
find /tmp -name "privacyguard-*" -mtime +1 -delete

# Update system metrics
./update-metrics.sh
```

### Weekly Maintenance Tasks

#### Automated Weekly Tasks (Sunday 2:00 AM)

```bash
#!/bin/bash
# /opt/privacyguard/scripts/weekly-maintenance.sh

# Database optimization
docker-compose exec postgres psql -U privacyguard_user -d privacyguard -c "VACUUM ANALYZE;"
docker-compose exec mongodb mongosh --eval "db.runCommand({compact: 'policy_documents'})"

# System updates
sudo apt update && sudo apt upgrade -y

# Docker cleanup
docker system prune -f
docker volume prune -f

# SSL certificate renewal check
sudo certbot renew --dry-run

# Performance baseline update
./update-performance-baseline.sh

# Capacity planning data collection
./collect-capacity-data.sh

# Security audit
./security-audit.sh
```

### Monthly Maintenance Tasks

#### Manual Monthly Tasks (First Sunday)

```bash
#!/bin/bash
# /opt/privacyguard/scripts/monthly-maintenance.sh

# Full security audit
./full-security-audit.sh

# Disaster recovery test
./dr-test.sh

# Performance optimization review
./performance-review.sh

# Capacity planning analysis
./capacity-analysis.sh

# Documentation updates
./update-documentation.sh

# Backup integrity verification
./verify-backup-integrity.sh

# Dependency updates
./update-dependencies.sh

# Configuration review
./config-review.sh
```

## Preventive Maintenance

### Database Maintenance

#### PostgreSQL Maintenance

```bash
# Weekly PostgreSQL maintenance
docker-compose exec postgres psql -U privacyguard_user -d privacyguard -c "
  -- Update table statistics
  ANALYZE;
  
  -- Reclaim storage space
  VACUUM;
  
  -- Rebuild indexes if needed
  REINDEX DATABASE privacyguard;
  
  -- Check for bloated tables
  SELECT schemaname, tablename, 
         pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
  FROM pg_tables 
  WHERE schemaname = 'public' 
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

#### MongoDB Maintenance

```bash
# Weekly MongoDB maintenance
docker-compose exec mongodb mongosh --eval "
  // Compact collections
  db.runCommand({compact: 'policy_documents'});
  db.runCommand({compact: 'analytics'});
  
  // Update collection statistics
  db.policy_documents.stats();
  
  // Check index usage
  db.policy_documents.aggregate([{\$indexStats: {}}]);
"
```

#### Redis Maintenance

```bash
# Weekly Redis maintenance
docker-compose exec redis redis-cli BGREWRITEAOF
docker-compose exec redis redis-cli BGSAVE

# Check memory usage and optimize
docker-compose exec redis redis-cli info memory
docker-compose exec redis redis-cli config set maxmemory-policy allkeys-lru
```

### Application Maintenance

#### Dependency Updates

```bash
# Monthly dependency updates
docker-compose exec backend npm audit
docker-compose exec backend npm update

# Security vulnerability scan
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image privacyguard-backend:latest
```

#### Configuration Optimization

```bash
# Review and optimize configuration
./scripts/config-optimizer.sh

# Update environment variables if needed
./scripts/update-config.sh

# Restart services with new configuration
docker-compose restart
```

## Capacity Planning

### Resource Usage Analysis

#### Historical Data Collection

```bash
#!/bin/bash
# /opt/privacyguard/scripts/collect-capacity-data.sh

# Collect CPU usage data
echo "$(date),$(docker stats --no-stream --format 'table {{.CPUPerc}}' | tail -n +2 | tr -d '%' | awk '{sum+=$1} END {print sum/NR}')" >> /var/log/privacyguard/cpu-usage.csv

# Collect memory usage data
echo "$(date),$(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')" >> /var/log/privacyguard/memory-usage.csv

# Collect disk usage data
echo "$(date),$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')" >> /var/log/privacyguard/disk-usage.csv

# Collect database size data
db_size=$(docker-compose exec postgres psql -U privacyguard_user -d privacyguard -t -c "SELECT pg_size_pretty(pg_database_size('privacyguard'));" | tr -d ' ')
echo "$(date),$db_size" >> /var/log/privacyguard/db-size.csv
```

#### Growth Trend Analysis

```bash
#!/bin/bash
# /opt/privacyguard/scripts/analyze-growth.sh

# Analyze database growth trends
python3 << EOF
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime, timedelta

# Load data
df = pd.read_csv('/var/log/privacyguard/db-size.csv', names=['date', 'size'])
df['date'] = pd.to_datetime(df['date'])

# Calculate growth rate
df['size_mb'] = df['size'].str.extract('(\d+)').astype(float)
growth_rate = (df['size_mb'].iloc[-1] - df['size_mb'].iloc[0]) / len(df)

print(f"Database growth rate: {growth_rate:.2f} MB/day")

# Predict when disk will be full
current_disk_usage = 75  # Current percentage
disk_size_gb = 100  # Total disk size in GB
days_to_full = (disk_size_gb * 1024 * (100 - current_disk_usage) / 100) / growth_rate

print(f"Estimated days until disk full: {days_to_full:.0f}")
EOF
```

### Scaling Recommendations

#### Horizontal Scaling Triggers

```bash
# CPU-based scaling
if [ $(docker stats --no-stream --format '{{.CPUPerc}}' | tr -d '%' | awk '{if($1>80) print $1}' | wc -l) -gt 0 ]; then
  echo "Consider horizontal scaling: High CPU usage detected"
fi

# Memory-based scaling
if [ $(free | grep Mem | awk '{if($3/$2 > 0.85) print "high"}') = "high" ]; then
  echo "Consider horizontal scaling: High memory usage detected"
fi

# Request rate-based scaling
current_rps=$(docker-compose logs nginx | grep "$(date '+%d/%b/%Y:%H:%M')" | wc -l)
if [ $current_rps -gt 1000 ]; then
  echo "Consider horizontal scaling: High request rate detected"
fi
```

#### Vertical Scaling Recommendations

```bash
# Generate scaling recommendations
./scripts/scaling-recommendations.sh > /var/log/privacyguard/scaling-report.txt
```

## Incident Response

### Incident Classification

#### Severity Levels

- **P1 - Critical**: Complete system outage, data loss, security breach
- **P2 - High**: Major functionality impacted, significant performance degradation
- **P3 - Medium**: Minor functionality impacted, moderate performance issues
- **P4 - Low**: Cosmetic issues, minor performance issues

#### Response Times

- **P1**: 15 minutes
- **P2**: 1 hour
- **P3**: 4 hours
- **P4**: 24 hours

### Incident Response Procedures

#### Automated Incident Detection

```bash
#!/bin/bash
# /opt/privacyguard/scripts/incident-detector.sh

# Check for critical issues
if ! curl -f -s http://localhost:3001/health > /dev/null; then
  # System is down - P1 incident
  ./create-incident.sh "P1" "System health check failed"
fi

# Check error rate
error_rate=$(docker-compose logs --since 5m backend | grep -c "ERROR")
if [ $error_rate -gt 10 ]; then
  # High error rate - P2 incident
  ./create-incident.sh "P2" "High error rate detected: $error_rate errors in 5 minutes"
fi
```

#### Incident Response Automation

```bash
#!/bin/bash
# /opt/privacyguard/scripts/create-incident.sh

severity="$1"
description="$2"
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Create incident record
incident_id="INC-$(date +%Y%m%d%H%M%S)"

# Log incident
echo "$timestamp,$incident_id,$severity,$description" >> /var/log/privacyguard/incidents.log

# Send notifications based on severity
case $severity in
  "P1")
    # Critical - notify immediately via multiple channels
    send_pagerduty_alert "critical" "$description"
    send_slack_alert "🚨 P1 INCIDENT: $description"
    send_email_alert "ops-team@privacyguard.com" "P1 Incident: $incident_id" "$description"
    ;;
  "P2")
    # High - notify via Slack and email
    send_slack_alert "⚠️ P2 INCIDENT: $description"
    send_email_alert "ops-team@privacyguard.com" "P2 Incident: $incident_id" "$description"
    ;;
esac

echo "Incident created: $incident_id"
```

## Reporting and Analytics

### Performance Reports

#### Daily Performance Report

```bash
#!/bin/bash
# /opt/privacyguard/scripts/daily-report.sh

report_date=$(date +%Y-%m-%d)
report_file="/var/log/privacyguard/reports/daily-$report_date.txt"

cat > "$report_file" << EOF
PrivacyGuard Daily Performance Report - $report_date
================================================

System Health:
$(curl -s http://localhost:3001/health | jq '.data.status')

Response Time (24h average):
$(docker-compose logs --since 24h nginx | grep -o '[0-9]\+\.[0-9]\+' | awk '{sum+=$1; count++} END {print sum/count "s"}')

Error Rate (24h):
$(docker-compose logs --since 24h backend | grep -c "ERROR")

Database Performance:
$(docker-compose exec postgres psql -U privacyguard_user -d privacyguard -t -c "SELECT count(*) FROM pg_stat_activity;") active connections

Resource Usage:
CPU: $(docker stats --no-stream --format '{{.CPUPerc}}' | head -1)
Memory: $(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')
Disk: $(df -h / | tail -1 | awk '{print $5}')

DSAR Metrics (24h):
New requests: $(docker-compose exec postgres psql -U privacyguard_user -d privacyguard -t -c "SELECT count(*) FROM dsar_requests WHERE created_at > NOW() - INTERVAL '24 hours';")
Completed requests: $(docker-compose exec postgres psql -U privacyguard_user -d privacyguard -t -c "SELECT count(*) FROM dsar_requests WHERE completed_at > NOW() - INTERVAL '24 hours';")

EOF

# Send report via email
mail -s "PrivacyGuard Daily Report - $report_date" ops-team@privacyguard.com < "$report_file"
```

#### Weekly Performance Report

```bash
#!/bin/bash
# /opt/privacyguard/scripts/weekly-report.sh

# Generate comprehensive weekly report
python3 << EOF
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage

# Generate performance charts
# ... (chart generation code)

# Create HTML report
html_report = """
<html>
<body>
<h1>PrivacyGuard Weekly Performance Report</h1>
<h2>Key Metrics</h2>
<ul>
<li>Average Response Time: {avg_response_time}ms</li>
<li>Total Requests: {total_requests}</li>
<li>Error Rate: {error_rate}%</li>
<li>Uptime: {uptime}%</li>
</ul>
<h2>Performance Charts</h2>
<img src="cid:performance_chart">
</body>
</html>
""".format(
    avg_response_time=250,
    total_requests=50000,
    error_rate=0.5,
    uptime=99.9
)

# Send email with charts
# ... (email sending code)
EOF
```

### Business Intelligence Reports

#### DSAR Processing Analytics

```bash
# Generate DSAR analytics report
docker-compose exec postgres psql -U privacyguard_user -d privacyguard -c "
  SELECT 
    DATE_TRUNC('week', created_at) as week,
    COUNT(*) as total_requests,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
    AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - created_at))/3600) as avg_hours,
    COUNT(CASE WHEN due_date < NOW() AND status != 'completed' THEN 1 END) as overdue
  FROM dsar_requests 
  WHERE created_at > NOW() - INTERVAL '12 weeks'
  GROUP BY week 
  ORDER BY week;
" > /var/log/privacyguard/reports/dsar-analytics.csv
```

#### Risk Assessment Trends

```bash
# Generate risk assessment trends
docker-compose exec postgres psql -U privacyguard_user -d privacyguard -c "
  SELECT 
    DATE_TRUNC('month', created_at) as month,
    risk_level,
    COUNT(*) as count,
    AVG(overall_score) as avg_score
  FROM risk_assessments 
  WHERE created_at > NOW() - INTERVAL '12 months'
  GROUP BY month, risk_level 
  ORDER BY month, risk_level;
" > /var/log/privacyguard/reports/risk-trends.csv
```

### Compliance Reporting

#### GDPR Compliance Report

```bash
# Generate GDPR compliance report
docker-compose exec postgres psql -U privacyguard_user -d privacyguard -c "
  SELECT 
    'Lawful Basis Records' as metric,
    COUNT(*) as count,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active
  FROM lawful_basis_records
  UNION ALL
  SELECT 
    'Processing Records' as metric,
    COUNT(*) as count,
    COUNT(*) as active
  FROM processing_records;
" > /var/log/privacyguard/reports/gdpr-compliance.csv
```

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-01  
**Next Review**: 2024-04-01  
**Owner**: Operations Team