# Vercel Hosting Deployment Guide

## 🚀 Quick Deploy Commands

### Production Deployment
```bash
npm run deploy
# or
npm run vercel:deploy
```

### Preview Deployment
```bash
npm run deploy:preview
# or
npm run vercel:preview
```

### Development with Vercel
```bash
npm run vercel:dev
```

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run deploy` | Build and deploy to production |
| `npm run deploy:preview` | Build and deploy to preview |
| `npm run vercel:deploy` | Deploy to production (no build) |
| `npm run vercel:preview` | Deploy to preview (no build) |
| `npm run vercel:dev` | Run development server with Vercel |
| `npm run vercel:link` | Link project to Vercel |
| `npm run vercel:env` | Pull environment variables |

## 🔧 Configuration

### Vercel Configuration (`vercel.json`)
- **Framework**: Next.js 15.4.1
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Regions**: US East (iad1)
- **Function Timeout**: 30 seconds for API routes

### Environment Variables
```bash
# Pull environment variables from Vercel
npm run vercel:env
```

## 🌐 Deployment URLs

### Production URLs
- **Main**: https://fixigo.vercel.app
- **Latest**: https://fixigo-qow86o3ya-quickfixgo.vercel.app

### Preview URLs
- **Preview**: https://fixigo-bs7vnzbog-quickfixgo.vercel.app

## 📊 Performance Optimizations

### Caching Headers
- **Service Worker**: No cache (always fresh)
- **Manifest**: 1 year cache (immutable)

### API Functions
- **Timeout**: 30 seconds
- **Regions**: US East for optimal performance

## 🔄 Deployment Workflow

1. **Development**
   ```bash
   npm run dev
   ```

2. **Preview Deployment**
   ```bash
   npm run deploy:preview
   ```

3. **Production Deployment**
   ```bash
   npm run deploy
   ```

## 🛠️ Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   npm run build
   ```

2. **Environment Variables**
   ```bash
   npm run vercel:env
   ```

3. **Link Project**
   ```bash
   npm run vercel:link
   ```

### Performance Monitoring
- Visit: https://vercel.com/quickfixgo/fixigo
- Check Analytics and Performance tabs

## 📱 PWA Support

The application includes Progressive Web App (PWA) features:
- Service Worker for offline functionality
- Manifest for app installation
- Optimized caching strategies

## 🔐 Security

- HTTPS enabled by default
- Environment variables encrypted
- API routes protected with authentication

## 📈 Monitoring

- **Vercel Analytics**: Built-in performance monitoring
- **Function Logs**: Available in Vercel dashboard
- **Error Tracking**: Automatic error reporting

## 🎯 Best Practices

1. **Always test preview deployments first**
2. **Use environment variables for secrets**
3. **Monitor performance metrics**
4. **Keep dependencies updated**
5. **Use proper caching strategies**

---

**Last Updated**: August 7, 2025
**Vercel CLI Version**: 44.7.3
