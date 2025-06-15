
# Deployment Guide

## Pre-deployment Checklist

### 1. Firebase Setup
- [ ] Create Firebase project
- [ ] Enable Authentication (Anonymous)
- [ ] Enable Firestore Database
- [ ] Enable Storage
- [ ] Deploy security rules: `firebase deploy --only firestore:rules`

### 2. Cloud Functions Setup
```bash
cd functions-starter
npm install
firebase deploy --only functions
```

### 3. Environment Variables
Set these in Firebase Functions configuration:
```bash
firebase functions:config:set openai.key="your-openai-api-key"
```

### 4. Security Rules
Deploy the Firestore security rules:
```bash
firebase deploy --only firestore:rules
```

### 5. Performance Optimization
- [ ] Enable Firebase Performance Monitoring
- [ ] Configure CDN for static assets
- [ ] Enable compression in hosting
- [ ] Set up proper caching headers

### 6. Monitoring Setup
- [ ] Enable Firebase Analytics
- [ ] Set up error tracking
- [ ] Configure performance monitoring
- [ ] Set up uptime monitoring

### 7. Domain & SSL
- [ ] Configure custom domain (if needed)
- [ ] Verify SSL certificate
- [ ] Set up redirects

### 8. Testing
- [ ] Test QR generation
- [ ] Test QR scanning with AI
- [ ] Test offline functionality
- [ ] Test payment link sharing
- [ ] Test on multiple devices

## Deployment Commands

### Development Build
```bash
npm run build
firebase serve
```

### Production Deployment
```bash
npm run build
firebase deploy
```

## Post-deployment

### 1. Verify Functionality
- [ ] QR code generation works
- [ ] AI scanning works with OpenAI
- [ ] Payment links are created
- [ ] Offline mode functions
- [ ] Analytics tracking works

### 2. Performance Monitoring
- [ ] Check Core Web Vitals
- [ ] Monitor function execution times
- [ ] Track error rates
- [ ] Monitor offline usage

### 3. User Feedback
- [ ] Set up feedback collection
- [ ] Monitor user behavior
- [ ] Track conversion rates

## Required API Keys
1. **OpenAI API Key** - For AI-powered QR scanning
2. **Firebase Project** - For backend services

## Environment Variables
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_FUNCTIONS_BASE_URL=https://us-central1-your-project.cloudfunctions.net
```

## Security Considerations
- Anonymous authentication protects user sessions
- Firestore rules restrict access to user's own data
- OpenAI API key is secured in Cloud Functions
- No sensitive data stored in client
- HTTPS enforced for all connections
