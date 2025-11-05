# SHREY.FIT - Fitness Platform Repository

A comprehensive fitness platform with multiple development approaches and Firebase backend integration.

## 🏗️ Repository Architecture

This repository contains **three distinct development approaches** for the fitness platform:

### 1. **Static Marketing Website** (`/static/` Directory)
Traditional HTML/CSS/JavaScript implementation for public-facing pages.

**Location:** `/static/` folder (organized static website)
**Files:** 
- `static/*.html` - main marketing pages (index, about, services, etc.)
- `static/blogs/*.html` - all blog content organized in dedicated subdirectory
**Assets:** 
- `static/css/` - all stylesheets (modular CSS organization)
- `static/js/` - JavaScript files
- `static/assets/` - images and media files
**Use:** Marketing pages, blog, public content

**Blog Organization:**
- Blog index: `static/blogs/index.html` (replaces blog.html)
- Individual posts: `static/blogs/blog-*.html`
- Clean URLs: Access via `/blogs/` instead of `/blog.html`

**To run:**
```bash
# Navigate to static directory and serve
cd static
npx http-server . -p 8080
# or
cd static && open index.html

# Or serve from parent directory
npx http-server static -p 8080
```

### 2. **Legacy React Application** (`/legacy-react/` Directory)
Webpack-based React implementation for interactive components.

**Location:** `/legacy-react/` folder (complete legacy React project)
**Configuration:** `legacy-react/webpack.config.js`, `legacy-react/package.json`
**Components:** `legacy-react/src/react/signup/`, React signup components
**Build System:** Webpack + Babel

**To run:**
```bash
cd legacy-react
npm install  # if first time
npm run start
# or
npm run watch
```

### 3. **Modern Next.js Application** (`/app/` Directory)
TypeScript + Next.js implementation with modern tooling.

**Location:** `/app/` folder (complete Next.js project)
**Features:** TypeScript, Tailwind CSS, React 19, ShadCN UI
**Pages:** Login, Signup, Dashboard, User management
**Configuration:** `/app/package.json`, Next.js config

**To run:**
```bash
cd app
npm install  # if first time
npm run dev  # starts on localhost:3000
```

## 📂 Organized Directory Structure

```
ShreyasFitnessWeb-FirebaseENHANCED/
├── README.md                    # This file
├── 
├── # Static Marketing Website
├── static/                     # Organized static website
│   ├── *.html                 # Main pages (index, about, services, contact, etc.)
│   ├── blogs/                 # Blog content organized in subdirectory
│   │   ├── index.html         # Blog listing page (main blog page)
│   │   └── blog-*.html        # Individual blog posts
│   ├── css/                   # Organized stylesheets (modular approach)
│   ├── js/                    # JavaScript files  
│   └── assets/                # Images and media files
├── 
├── # Legacy React System  
├── legacy-react/               # Complete legacy React project
│   ├── package.json           # Webpack dependencies
│   ├── webpack.config.js      # Build configuration
│   ├── src/react/signup/      # React components
│   ├── dist/                  # Build output
│   └── README.md              # Legacy React documentation
├── 
├── # Modern Next.js System
├── app/                        # Complete Next.js project
│   ├── src/app/               # App Router pages
│   ├── src/components/        # UI components
│   └── package.json           # Next.js dependencies
├── 
├── # Firebase Backend
├── firebase/
│   ├── functions/             # Cloud Functions
│   ├── extensions/            # Firebase Extensions
│   ├── setup-stripe-config.example.cmd  # Stripe configuration script
│   └── setup-stripe-webhook.cmd        # Stripe webhook setup
├── 
├── # Configuration
├── firebase-config.json        # 🔥 Firebase region configuration (IMPORTANT!)
├── .firebaserc                 # Firebase project config
├── firebase.json               # Firebase settings
├── firestore.rules            # Database security rules
├── 
└── # Documentation
    └── docs/
        ├── 01-setup/          # Setup guides
        ├── 02-implementation/ # Feature guides  
        ├── 03-guides/         # User guides
        ├── 04-architecture/   # System design
        └── 05-archives/       # Legacy docs
```

## 🚀 Quick Start Guide

### For New Developers:

1. **Choose your development approach:**
   - **Static HTML:** Open files directly or use Live Server
   - **Legacy React:** `npm install` then `npm run start` 
   - **Modern Next.js:** `cd app` then `npm run dev`

2. **Firebase Setup:** See `/docs/01-setup/main-setup-guide.md`

3. **Development Workflow:**
   - Static site runs independently
   - Next.js app connects to shared Firebase backend
   - All three systems can run simultaneously

## 🔥 Firebase Integration

**Backend Services:**
- **Authentication:** Firebase Auth (shared)
- **Database:** Firestore (shared)
- **Functions:** Firebase Cloud Functions
- **Payments:** Stripe integration via Firebase Extensions

**Configuration:**
- Production config in Firebase Console
- Local config in `app/.env.local`
- **Region config:** `firebase-config.json` (see below)
- Firebase CLI for deployment

### ⚙️ Firebase Region Configuration (CRITICAL)

The `firebase-config.json` file at the project root is the **single source of truth** for Firebase Functions region configuration:

```json
{
  "region": "us-west1",
  "projectId": "shreyfitweb"
}
```

**Why this matters:**
- Ensures front-end and back-end use the **same region**
- Prevents CORS errors from region mismatch
- Single place to change deployment region

**How it works:**
1. **Next.js (Front-end):** `app/next.config.ts` reads this file at build time
2. **Cloud Functions (Back-end):** `firebase/functions/index.js` reads this file at deploy time
3. Both systems automatically use the same region

**To change regions:**
1. Edit `firebase-config.json` - change `"region"` value
2. Redeploy Cloud Functions: `firebase deploy --only functions`
3. Restart Next.js dev server: `cd app && npm run dev`

**📖 Full Documentation:** See `/docs/02-implementation/region-configuration-guide.md`

**⚠️ IMPORTANT:** Always ensure this file is committed to Git so all team members and deployments use the same region.

## 📖 Documentation

All documentation has been organized in `/docs/`:

- **Setup Guides:** `/docs/01-setup/`
- **Implementation:** `/docs/02-implementation/` 
- **User Guides:** `/docs/03-guides/`
- **Architecture:** `/docs/04-architecture/`
- **Archives:** `/docs/05-archives/`

## 🛠️ Development Commands

```bash
# Static HTML site
open index.html
# or
npx http-server . -p 8080

# Legacy React app  
cd legacy-react
npm install
npm run start

# Modern Next.js app
cd app
npm install
npm run dev

# Firebase deployment
firebase login
firebase deploy --only functions
firebase deploy --only firestore:rules

# After changing firebase-config.json region
firebase deploy --only functions  # Deploy to new region
cd app && npm run dev              # Restart to pick up new region
```

## 🎯 Integration Flow

**Navigation between systems:**
- Static HTML → Next.js: Links to `http://localhost:3000/login`
- Next.js → Static: Return to marketing pages
- Shared Firebase backend for all authentication and data

**Development ports:**
- Static HTML: Direct browser or port 8080
- Legacy React: Webpack dev server (usually port 3000)
- Next.js: port 3000 (or next available)

## 🤝 Team Development

**Shared Firebase Backend:**
- Multiple developers use same Firebase project
- Coordinate function deployments
- Shared authentication and database

**Safe Development:**
- Local apps connect to remote Firebase
- No Firebase emulators needed for basic development
- Use `firebase deploy` carefully (coordinate with team)

---

## 💡 Need Help?

- **Setup Issues:** See `/docs/01-setup/main-setup-guide.md`
- **Implementation:** Check `/docs/02-implementation/`
- **Troubleshooting:** See `/docs/03-guides/troubleshooting.md`
- **Architecture:** Review `/docs/04-architecture/system-design.md`

**Firebase Access:** Contact project owner for configuration values and project permissions.
