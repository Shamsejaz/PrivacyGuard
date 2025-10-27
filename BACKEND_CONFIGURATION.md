# 🔧 Backend Configuration Guide

This guide explains how to configure PrivacyComply to work with different backend modes.

## 🎯 Available Modes

### 1. 🎭 **Mock Mode** (Default for Development)
- **Purpose**: Development and testing without backend dependency
- **Authentication**: Demo credentials only
- **API Calls**: Disabled (no network requests)

### 2. 🌐 **Production Mode** (Live Backend)
- **Purpose**: Production deployment with live backend
- **Authentication**: Real user accounts from backend
- **API Calls**: Full backend integration at `app.privacycomply.ai`

### 3. 🏠 **Local Backend Mode**
- **Purpose**: Development with local backend server
- **Authentication**: Local user accounts
- **API Calls**: Local backend at `localhost:3001`

## 🚀 Quick Switch Commands

### Windows (PowerShell)
```powershell
# Switch to mock mode (demo credentials only)
.\switch-backend-mode.ps1 mock

# Switch to production mode (live backend)
.\switch-backend-mode.ps1 production

# Switch to development mode (mock + local backend fallback)
.\switch-backend-mode.ps1 development
```

### Linux/Mac (Bash)
```bash
# Switch to mock mode (demo credentials only)
./switch-backend-mode.sh mock

# Switch to production mode (live backend)
./switch-backend-mode.sh production

# Switch to development mode (mock + local backend fallback)
./switch-backend-mode.sh development
```

## 🔑 Authentication Credentials

### Mock Mode Demo Credentials
```
DPO User:        dpo@privacycomply.com / DPO123!@#
Compliance User: compliance@privacycomply.com / Compliance123!@#
Legal User:      legal@privacycomply.com / Legal123!@#
Admin User:      admin@privacycomply.com / Admin123!@#
Business User:   business@privacycomply.com / Business123!@#
```

### Production Mode
- Use real user accounts created in the live backend
- Contact your system administrator for credentials
- Backend URL: `https://app.privacycomply.ai/api/v1`

## ⚙️ Manual Configuration

### Environment Files

#### `.env.local` (Current Active Configuration)
This file determines which mode is active. It's created automatically by the switch scripts.

#### `.env.development` (Mock Mode Template)
```bash
VITE_API_BASE_URL=http://mock-disabled:9999
VITE_API_URL=http://mock-disabled:9999
VITE_WS_URL=ws://mock-disabled:9999
VITE_PYTHON_PII_ENDPOINT=http://localhost:8000
VITE_APP_NAME=PrivacyComply
VITE_NODE_ENV=development
```

#### `.env.production.local` (Live Backend Template)
```bash
VITE_API_BASE_URL=https://app.privacycomply.ai/api/v1
VITE_API_URL=https://app.privacycomply.ai/api/v1
VITE_WS_URL=wss://app.privacycomply.ai
VITE_PYTHON_PII_ENDPOINT=https://app.privacycomply.ai/pii
VITE_APP_NAME=PrivacyComply
VITE_NODE_ENV=production
```

## 🔍 Troubleshooting

### Issue: "Network error during authentication"
**Solution**: 
1. Check if you're in the correct mode
2. Verify backend URL is accessible
3. Check browser console for detailed errors

### Issue: "Invalid credentials" in Production Mode
**Solution**:
1. Ensure you have valid backend credentials
2. Contact system administrator
3. Try switching to mock mode for testing

### Issue: Compliance frameworks not visible
**Solution**:
1. Ensure you're logged in with DPO or Compliance role
2. Check user role in browser console
3. Verify authentication was successful

## 🔄 Development Workflow

### For Frontend Development
```bash
# Use mock mode for UI development
.\switch-backend-mode.ps1 mock
npm run dev
```

### For Full-Stack Development
```bash
# Start local backend first
cd backend && npm run dev

# Switch to development mode
.\switch-backend-mode.ps1 development
npm run dev
```

### For Production Testing
```bash
# Switch to production mode
.\switch-backend-mode.ps1 production
npm run dev
```

## 🌐 Production Deployment

### Docker Backend Authentication Mode
Deploy frontend with live backend connection:

#### Windows (PowerShell)
```powershell
# Deploy with backend authentication
.\deploy-backend-auth.ps1

# Deploy without rebuilding
.\deploy-backend-auth.ps1 -NoBuild

# View logs
.\deploy-backend-auth.ps1 -Logs

# Stop services
.\deploy-backend-auth.ps1 -Stop

# Clean up
.\deploy-backend-auth.ps1 -Clean
```

#### Linux/Mac (Bash)
```bash
# Deploy with backend authentication
./deploy-backend-auth.sh

# Deploy without rebuilding
./deploy-backend-auth.sh --no-build

# View logs
./deploy-backend-auth.sh --logs

# Stop services
./deploy-backend-auth.sh --stop

# Clean up
./deploy-backend-auth.sh --clean
```

### Docker Production Build (Full Stack)
```bash
# Build with production environment
docker-compose -f docker-compose.production.yml up --build
```

### Docker Backend Authentication Build
```bash
# Build frontend-only with backend authentication
docker-compose -f docker-compose.backend-auth.yml up --build
```

### Environment Variables for Production
Ensure these are set in your production environment:
```bash
VITE_API_BASE_URL=https://app.privacycomply.ai/api/v1
VITE_API_URL=https://app.privacycomply.ai/api/v1
VITE_WS_URL=wss://app.privacycomply.ai
VITE_DEPLOYMENT_MODE=backend-auth
```

## 📊 Monitoring Backend Connection

The application provides console logging to help you understand the current backend mode:

- `🎭 Mock authentication mode enabled` - Mock mode active
- `🌐 Using live backend authentication` - Production mode active
- `✅ Backend health check passed` - Backend is accessible
- `⚠️ Backend health check failed` - Backend connection issues

## 🔒 Security Considerations

### Mock Mode
- ✅ Safe for development and testing
- ❌ Do not use in production
- ❌ Demo credentials are publicly known

### Production Mode
- ✅ Secure authentication with real backend
- ✅ Proper user management
- ⚠️ Ensure HTTPS is enabled
- ⚠️ Verify CORS configuration

## 📞 Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your current mode with the switch scripts
3. Test with mock mode to isolate backend issues
4. Contact the development team with console logs