# PrivacyGuard Docker Production Deployment

This guide provides instructions for deploying PrivacyGuard using Docker in a production environment.

## Prerequisites

- Docker and Docker Compose installed
- At least 4GB of RAM available
- 10GB of free disk space
- Access to a terminal/command prompt

## Environment Configuration

1. Copy the example environment file:
   ```bash
   cp .env.production.example .env
   ```

2. Edit the `.env` file to set production values:
   - `POSTGRES_PASSWORD`: Strong password for PostgreSQL
   - `MONGODB_ROOT_PASSWORD`: Strong password for MongoDB
   - `REDIS_PASSWORD`: Strong password for Redis
   - `JWT_SECRET`: Strong secret key (at least 32 characters)
   - `CORS_ORIGIN`: Your production domain
   - Other configuration as needed

## Deployment Steps

### Using the Deployment Script (Recommended)

**On Windows:**
```cmd
docker-deploy.bat
```

**On Linux/Mac:**
```bash
chmod +x docker-deploy.sh
./docker-deploy.sh
```

### Manual Deployment

1. Build and start the services:
   ```bash
   docker-compose -f docker-compose.prod.yml up --build -d
   ```

2. Run database migrations:
   ```bash
   docker-compose -f docker-compose.prod.yml exec backend npm run migrate
   ```

3. Seed the database with initial data:
   ```bash
   docker-compose -f docker-compose.prod.yml exec backend npm run seed
   ```

## Service Information

- **Frontend UI**: Available at `http://localhost` (or your configured domain)
- **Backend API**: Available at `http://localhost:3001`
- **Health Check**: `http://localhost:3001/health`

### Default Credentials (After Seeding)
- **Admin**: admin@privacyguard.com / admin123
- **DPO**: dpo@privacyguard.com / dpo123

## Management Commands

### View Service Status
```bash
docker-compose -f docker-compose.prod.yml ps
```

### View Logs
```bash
# View all service logs
docker-compose -f docker-compose.prod.yml logs

# View specific service logs (e.g., backend)
docker-compose -f docker-compose.prod.yml logs backend

# Follow logs in real-time
docker-compose -f docker-compose.prod.yml logs -f
```

### Stop Services
```bash
docker-compose -f docker-compose.prod.yml down
```

### Update Services
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart services
docker-compose -f docker-compose.prod.yml up --build -d
```

## Security Notes

1. **Change Default Passwords**: The default passwords should be changed immediately in production.
2. **JWT Secret**: Use a strong, randomly generated JWT secret.
3. **Environment Variables**: Never commit sensitive environment variables to version control.
4. **Database Backups**: Regular backups are configured but should be verified.

## Troubleshooting

### Common Issues

1. **Port Already in Use**: Ensure ports 80, 443, 3001, 5432, 27017, and 6379 are available.
2. **Insufficient Memory**: The application requires at least 4GB of RAM to run all services.
3. **Database Connection Issues**: Verify that database passwords match between services.

### Check Service Health
```bash
# Check specific service
docker-compose -f docker-compose.prod.yml ps

# Check backend logs for errors
docker-compose -f docker-compose.prod.yml logs backend | grep -i error

# Check if backend is responding
curl http://localhost:3001/health
```

## Scaling Considerations

The current setup runs one instance of each service. For production environments with higher load, consider:

- Increasing resource limits in the docker-compose file
- Using external managed database services instead of containers
- Setting up a reverse proxy with SSL termination (Nginx/Apache)
- Implementing a load balancer for multiple instances

## Updating Production

1. Backup your data:
   - PostgreSQL: `docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U privacyguard_user privacyguard > backup.sql`
   - MongoDB: `docker-compose -f docker-compose.prod.yml exec mongodb mongodump --out=/backups/mongodb`
   
2. Pull the latest code:
   ```bash
   git pull origin main
   ```

3. Recreate the services:
   ```bash
   docker-compose -f docker-compose.prod.yml up --build -d
   ```

4. Run any new migrations:
   ```bash
   docker-compose -f docker-compose.prod.yml exec backend npm run migrate
   ```