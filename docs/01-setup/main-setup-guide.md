# SHREY.FIT Development Setup Guide

## 🚀 Quick Start for New Developers

This guide will help you set up the SHREY.FIT project for development after pulling from GitHub.

## 📋 Prerequisites

### Required Software
1. **Node.js** (version 18 or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **Git** 
   - Usually pre-installed on most systems
   - Verify: `git --version`

3. **Code Editor** (recommended)
   - VS Code: [code.visualstudio.com](https://code.visualstudio.com/)

## 🛠️ Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Navigate to the project directory (if just pulled)
cd ShreyasFitnessWeb-FirebaseENHANCED

# Install root project dependencies (if any)
npm install

# Install Next.js app dependencies
cd app
npm install
```

### 2. Environment Configuration

```bash
# In the /app directory, copy the environment template
cp .env.example .env.local
```

**IMPORTANT**: Edit `.env.local` with the actual Firebase values:
- Get Firebase credentials from the project owner
- Replace all placeholder values with real configuration
- Never commit `.env.local` to GitHub

### 3. Start Development

```bash
# Make sure you're in the /app directory
cd app

# Start the Next.js development server
npm run dev
```

The Next.js app will be available at `http://localhost:3000` (or next available port)

### 4. Test the Integration

1. **Static Site**: Open any HTML file directly or use Live Server extension
2. **Next.js Components**: 
   - Login: `http://localhost:3000/login`
   - Signup: `http://localhost:3000/signup` 
   - Dashboard: `http://localhost:3000/dashboard`
3. **Integration**: Click "Sign Up / Login" from the static site navigation

## 🏗️ Project Structure

```
ShreyasFitnessWeb-FirebaseENHANCED/
├── app/                          # Next.js application
│   ├── src/
│   │   ├── app/                  # App Router pages
│   │   │   ├── login/           # Login page
│   │   │   ├── signup/          # Signup flow
│   │   │   └── dashboard/       # User dashboard
│   │   ├── components/ui/       # ShadCN UI components
│   │   └── lib/                 # Utilities & Firebase config
│   ├── .env.local               # Environment variables (create from .env.example)
│   └── package.json             # Next.js dependencies
├── *.html                       # Static marketing site
├── css/                         # Static site styles
└── js/                          # Static site JavaScript
```

## 🔧 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS v4, ShadCN UI
- **Icons**: Lucide React
- **Authentication**: Firebase Auth
- **Database**: Firestore
- **Payments**: Stripe (integration ready)
- **Forms**: React Hook Form + Zod validation

## 🚨 Important Notes

- **Development URLs**: Links in HTML files point to `localhost:3000` for development
- **Environment Security**: Never commit `.env.local` - it's already in `.gitignore`
- **Port Conflicts**: If port 3000 is in use, Next.js will use the next available port
- **Hot Reload**: Both static files and Next.js components support live updates

## 🐛 Common Issues

1. **Port 3000 in use**: Next.js will automatically use port 3001, 3002, etc.
2. **Environment errors**: Make sure `.env.local` has all required Firebase values
3. **Dependency issues**: Delete `node_modules` and `package-lock.json`, then run `npm install`

## 📞 Need Help?

Contact the project owner for:
- Firebase configuration values
- Stripe keys (when implementing payments)
- Any development questions

---
Happy coding! 🚀
