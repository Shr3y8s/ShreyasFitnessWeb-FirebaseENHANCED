# Legacy React Application

This directory contains the legacy Webpack-based React implementation for the SHREY.FIT platform.

## 🏗️ Structure

```
legacy-react/
├── package.json          # React + Webpack dependencies
├── package-lock.json     # Dependency lock file
├── webpack.config.js     # Build configuration
├── src/
│   ├── firebase-config.js
│   └── react/
│       └── signup/       # React signup flow
│           ├── index.js
│           ├── signup.css
│           ├── SignupForm.jsx
│           ├── components/
│           │   ├── AccountInfoStep.jsx
│           │   ├── ConfirmationStep.jsx
│           │   ├── PaymentStep.jsx
│           │   ├── PaymentStepDev.jsx
│           │   └── ServiceTierStep.jsx
│           └── utils/
│               └── stripeUtils.js
└── dist/                 # Build output (generated)
```

## 🚀 Development

### Install Dependencies
```bash
npm install
```

### Development Server
```bash
npm run start
# Runs on http://localhost:3000
```

### Build for Production
```bash
npm run build
```

### Watch Mode
```bash
npm run watch
```

## 🔧 Configuration

- **Webpack:** Configured for React with Babel transpilation
- **Entry Point:** Only signup flow (dashboard was moved to Next.js app)
- **Static Files:** Served from parent directory (root of repository)
- **Port:** 3000 (may conflict with Next.js app if running simultaneously)

## 📝 Notes

- **Dashboard functionality** has been moved to the Next.js application (`/app/`)
- This legacy implementation focuses on **signup flow only**
- **Static files** (HTML, CSS, images) are served from the parent directory
- **Firebase configuration** included for authentication integration

## 🔗 Integration

This React app integrates with:
- **Static HTML site** (parent directory)
- **Firebase backend** (shared authentication)
- **Stripe payments** (via React components)

## ⚠️ Development Considerations

- **Port conflicts:** May conflict with Next.js app (both use port 3000)
- **Static file serving:** Serves from `../` to access root-level HTML/CSS files
- **Firebase config:** Uses shared Firebase project with other systems
