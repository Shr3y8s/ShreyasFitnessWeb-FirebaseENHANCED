# Beginner's Guide to Building Your Fitness Platform
## A Step-by-Step Guide for Non-Developers

**Created for:** Shreyas Annapureddy  
**Date:** July 27, 2025

---

## Table of Contents

1. [Introduction: What We're Building](#introduction-what-were-building)
2. [Web Development Basics](#web-development-basics)
3. [Tools We'll Be Using](#tools-well-be-using)
4. [Setting Up Your Computer](#setting-up-your-computer)
5. [Phase 1: Creating User Login](#phase-1-creating-user-login)
6. [Phase 2: Building Dashboards](#phase-2-building-dashboards)
7. [Phase 3: Adding Payment Processing](#phase-3-adding-payment-processing)
8. [Phase 4: Adding Scheduling](#phase-4-adding-scheduling)
9. [Troubleshooting Common Issues](#troubleshooting-common-issues)
10. [Glossary of Terms](#glossary-of-terms)

---

## Introduction: What We're Building

We're going to build a fitness coaching platform that will allow you to:

- Have clients log in to their personal dashboards
- Share workout plans and nutrition guides with clients
- Process payments for your coaching services
- Allow clients to schedule sessions with you
- Manage all your clients from a coach dashboard

This guide assumes you have **no prior knowledge** of web development or programming. We'll explain everything from scratch!

---

## Web Development Basics

Before we dive in, let's understand some basic concepts:

### What is a Website vs. Web Application?

- A **website** is like a digital brochure - it displays information but doesn't do much else
- A **web application** is interactive - users can log in, submit information, and get personalized experiences

We're building a web application because your fitness platform needs to be interactive.

### Front-end vs. Back-end

Web applications have two main parts:

- **Front-end**: What users see and interact with (the visual part)
- **Back-end**: The "behind the scenes" part that stores data and handles logic

Think of it like a restaurant:
- Front-end = The dining area, menus, and waitstaff that customers interact with
- Back-end = The kitchen, inventory system, and staff that customers don't see

### Basic Web Technologies

We'll be using these fundamental technologies:

- **HTML**: The structure of web pages (like the skeleton of a body)
- **CSS**: The styling of web pages (like the clothing and appearance)
- **JavaScript**: Makes pages interactive (like the muscles that create movement)
- **Databases**: Stores information (like your client data, workout plans, etc.)

Don't worry if these seem confusing now - we'll explain each one as we use it!

---

## Tools We'll Be Using

### Visual Studio Code (VS Code)

This is a program for writing code. Think of it like Microsoft Word, but designed specifically for coding.

### AWS (Amazon Web Services)

AWS is a collection of online services that will power our application. We'll use several AWS services:

- **Amplify**: Makes it easier to build web applications
- **Cognito**: Handles user logins and accounts
- **DynamoDB**: Stores your data (client information, workouts, etc.)
- **Lambda**: Runs code when needed (like when someone books a session)

### Stripe

Stripe will handle payments securely. It's like a digital cash register for your business.

### Calendly

Calendly will manage scheduling. It's like an online appointment book.

---

## Setting Up Your Computer

Let's get your computer ready for development!

### Step 1: Install Node.js

Node.js is a tool that helps run JavaScript code on your computer.

1. Go to [nodejs.org](https://nodejs.org)
2. Download the "LTS" version (LTS stands for "Long Term Support" - it's the stable version)
3. Run the installer and follow the prompts
4. Accept the default options if you're unsure

![Node.js Download Page](https://nodejs.org/static/images/logo.svg)

### Step 2: Install Visual Studio Code

1. Go to [code.visualstudio.com](https://code.visualstudio.com)
2. Download the version for your operating system (Windows, Mac, etc.)
3. Run the installer and follow the prompts

### Step 3: Create an AWS Account

1. Go to [aws.amazon.com](https://aws.amazon.com)
2. Click "Create an AWS Account"
3. Follow the sign-up process
   - You'll need to provide a credit card, but most services have a free tier
   - You'll need to verify your phone number
   - Choose the "Basic Plan" (free) when asked

### Step 4: Install the AWS Amplify CLI

The CLI (Command Line Interface) is a tool that lets you type commands to interact with AWS.

1. Open Command Prompt (Windows) or Terminal (Mac)
   - On Windows: Press Windows key, type "cmd", press Enter
   - On Mac: Press Command+Space, type "terminal", press Enter
2. Type this command and press Enter:
   ```
   npm install -g @aws-amplify/cli
   ```
3. Wait for the installation to complete (this might take a few minutes)

### Step 5: Configure AWS Amplify

1. In Command Prompt/Terminal, type:
   ```
   amplify configure
   ```
2. Press Enter
3. It will open your web browser and ask you to sign in to AWS
4. After signing in, go back to Command Prompt/Terminal
5. Follow these prompts:
   - Select your region (choose the one closest to you, like "us-west-2")
   - Create a new IAM user (enter a username like "amplify-user")
   - It will open your browser again to set permissions
   - Click through the screens to create the user
   - You'll see an "Access key ID" and "Secret access key" - copy these
   - Go back to Command Prompt/Terminal and paste these keys when asked
   - Enter a profile name (you can just use "default")

Congratulations! Your computer is now set up for development.

---

## Phase 1: Creating User Login

In this phase, we'll create the login system for your fitness platform.

### Step 1: Initialize Your Project with Amplify

1. Open Command Prompt/Terminal
2. Navigate to your project folder:
   ```
   cd c:/Users/shrey/OneDrive/Documents/GitHub/ShreyasFitnessWeb
   ```
3. Initialize Amplify in your project:
   ```
   amplify init
   ```
4. Answer the prompts:
   - Enter a name for the project: "ShreyMethodFitness"
   - Enter a name for the environment: "dev"
   - Choose your default editor: "Visual Studio Code"
   - Choose the type of app: "javascript"
   - Choose JavaScript framework: "none"
   - Source directory path: "/" (just press Enter)
   - Distribution directory path: "/" (just press Enter)
   - Build command: "npm run build" (just press Enter)
   - Start command: "npm start" (just press Enter)
   - Select "Yes" when asked if you want to use an AWS profile

**What's happening here?** You're telling AWS Amplify about your project so it can help you build it.

### Step 2: Add Authentication

1. In Command Prompt/Terminal, type:
   ```
   amplify add auth
   ```
2. Answer the prompts:
   - Choose the default configuration: "Default configuration"
   - How do you want users to sign in: "Username"
   - Do you want to configure advanced settings: "Yes"
   - What attributes are required: Select "Email" and "Name" using spacebar, then press Enter
   - Do you want to enable any of the following capabilities: Don't select any, just press Enter
   - Select "Yes" for "Do you want to edit your user pool groups"
   - Select "Add a group" and create two groups:
     - First group name: "clients"
     - Second group name: "coaches"
   - Select "No" when asked if you want to add another group

**What's happening here?** You're setting up the system that will handle user accounts, logins, and passwords.

### Step 3: Set Up Database for Messages

1. In Command Prompt/Terminal, type:
   ```
   amplify add api
   ```
2. Answer the prompts:
   - Select "GraphQL" as the API service
   - Enter API name: "shreymethodapi"
   - Select authorization type: "Amazon Cognito User Pool"
   - Do you want to configure additional auth types: "No"
   - Select "Single object with fields" as the schema template
   - Do you want to edit the schema now: "Yes"

3. It will open a file in VS Code. Replace everything in this file with:

```graphql
type Message @model
@auth(rules: [
  { allow: groups, groups: ["coaches"], operations: [create, read, update, delete] },
  { allow: owner, operations: [create, read] }
]) {
  id: ID!
  senderName: String!
  senderEmail: String!
  subject: String!
  content: String!
  read: Boolean!
  archived: Boolean!
  createdAt: AWSDateTime!
}

type User @model
@auth(rules: [
  { allow: groups, groups: ["coaches"], operations: [read, update] },
  { allow: owner, operations: [read, update] }
]) {
  id: ID!
  name: String!
  email: String!
  phone: String
  userGroup: String!
  createdAt: AWSDateTime!
}
```

4. Save the file (Ctrl+S or File > Save)

**What's happening here?** You're creating a database to store messages between you and your clients.

### Step 4: Deploy Your Backend Resources

1. In Command Prompt/Terminal, type:
   ```
   amplify push
   ```
2. Review the changes and confirm by typing "y"
3. Select "Yes" when asked to generate code for the GraphQL API
4. Choose the default options for the code generation

**What's happening here?** You're uploading your configuration to AWS so they can create all the necessary resources for your application.

### Step 5: Create Login Page

1. Open VS Code
2. Create a new file called `client-login.html`
3. Copy and paste this code:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - The Shrey Method Fitness</title>
    <link rel="stylesheet" href="css/styles.css">
    <!-- Add AWS Amplify libraries -->
    <script src="https://cdn.jsdelivr.net/npm/aws-amplify@5.0.4/dist/aws-amplify.min.js"></script>
</head>
<body>
    <!-- Navigation bar (reuse existing) -->
    
    <div class="auth-container">
        <div class="auth-form">
            <h2>Log In to Your Dashboard</h2>
            <div id="error-message" class="error-message"></div>
            
            <form id="login-form">
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" required>
                </div>
                
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" required>
                </div>
                
                <div class="form-actions">
                    <a href="forgot-password.html" class="forgot-password">Forgot Password?</a>
                    <button type="submit" class="btn-primary">Log In</button>
                </div>
            </form>
            
            <p class="auth-redirect">New client? <a href="signup.html">Sign Up</a></p>
        </div>
    </div>
    
    <script src="js/auth.js"></script>
</body>
</html>
```

4. Save the file (Ctrl+S or File > Save)

**What's happening here?** You're creating the login page that users will see when they want to access their dashboard.

### Step 6: Create Authentication JavaScript

1. Create a folder called `js` if it doesn't exist already
2. Create a new file called `js/auth.js`
3. Copy and paste this code:

```javascript
// Configure Amplify
const awsConfig = {
    Auth: {
        region: 'us-west-2', // Your AWS region
        userPoolId: 'us-west-2_xxxxxxxx', // Your Cognito User Pool ID
        userPoolWebClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx', // Your App Client ID
    }
};

// Replace the placeholder values with your actual values
// You can find these in the AWS Cognito console or in the aws-exports.js file

Amplify.configure(awsConfig);

// Login form handler
document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    
    try {
        const user = await Amplify.Auth.signIn(email, password);
        
        // Check user group and redirect accordingly
        const session = await Amplify.Auth.currentSession();
        const idToken = session.getIdToken().payload;
        
        if (idToken['cognito:groups'] && idToken['cognito:groups'].includes('coaches')) {
            window.location.href = 'coach-dashboard.html';
        } else {
            window.location.href = 'client-dashboard.html';
        }
    } catch (error) {
        errorMessage.textContent = error.message;
    }
});
```

4. Save the file (Ctrl+S or File > Save)

**What's happening here?** You're creating the code that will handle the login process when someone submits the login form.

### Step 7: Update Configuration Values

1. In Command Prompt/Terminal, type:
   ```
   amplify status
   ```
2. Note the name of your Auth resource (something like "authshreymethod123456")
3. Type:
   ```
   amplify console auth
   ```
4. This will open the AWS Cognito console in your browser
5. Click on "User Pools" in the left sidebar
6. Click on your user pool (it should have the name you noted earlier)
7. Click on "App integration" in the left sidebar
8. Under "App clients and analytics", find your app client
9. Note the "App client ID" value
10. Go back to VS Code and open `js/auth.js`
11. Replace the placeholder values with your actual values:
    - Replace `us-west-2` with your region (if different)
    - Replace `us-west-2_xxxxxxxx` with your User Pool ID
    - Replace `xxxxxxxxxxxxxxxxxxxxxxxxxx` with your App Client ID
12. Save the file (Ctrl+S or File > Save)

**What's happening here?** You're connecting your login page to your AWS authentication system.

### Step 8: Create CSS for Login Page

1. Create a folder called `css` if it doesn't exist already
2. Create a new file called `css/styles.css`
3. Copy and paste this code:

```css
/* General Styles */
:root {
    --primary: #4CAF50;
    --primary-dark: #388E3C;
    --secondary: #2E7D32;
    --light-gray: #f5f5f5;
    --dark-gray: #333;
}

body {
    font-family: 'Inter', sans-serif;
    margin: 0;
    padding: 0;
    color: var(--dark-gray);
    line-height: 1.6;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

/* Authentication Styles */
.auth-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-color: var(--light-gray);
}

.auth-form {
    background-color: white;
    padding: 40px;
    border-radius: 10px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 400px;
}

.auth-form h2 {
    margin-top: 0;
    margin-bottom: 20px;
    color: var(--secondary);
    text-align: center;
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
}

.form-group input {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
    font-size: 16px;
}

.form-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 30px;
}

.forgot-password {
    color: var(--primary);
    text-decoration: none;
}

.forgot-password:hover {
    text-decoration: underline;
}

.btn-primary {
    background-color: var(--primary);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 500;
    transition: background-color 0.3s ease;
}

.btn-primary:hover {
    background-color: var(--primary-dark);
}

.auth-redirect {
    text-align: center;
    margin-top: 20px;
}

.auth-redirect a {
    color: var(--primary);
    text-decoration: none;
}

.auth-redirect a:hover {
    text-decoration: underline;
}

.error-message {
    color: red;
    margin-bottom: 15px;
    text-align: center;
}
```

4. Save the file (Ctrl+S or File > Save)

**What's happening here?** You're creating the styling for your login page so it looks nice.

### Step 9: Create Signup Page

1. Create a new file called `signup.html`
2. Copy and paste this code:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign Up - The Shrey Method Fitness</title>
    <link rel="stylesheet" href="css/styles.css">
    <!-- Add AWS Amplify libraries -->
    <script src="https://cdn.jsdelivr.net/npm/aws-amplify@5.0.4/dist/aws-amplify.min.js"></script>
</head>
<body>
    <!-- Navigation bar (reuse existing) -->
    
    <div class="auth-container">
        <div class="auth-form">
            <h2>Create Your Account</h2>
            <div id="error-message" class="error-message"></div>
            
            <form id="signup-form">
                <div class="form-group">
                    <label for="name">Full Name</label>
                    <input type="text" id="name" required>
                </div>
                
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" required>
                </div>
                
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" required>
                </div>
                
                <div class="form-group">
                    <label for="confirm-password">Confirm Password</label>
                    <input type="password" id="confirm-password" required>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn-primary">Sign Up</button>
                </div>
            </form>
            
            <p class="auth-redirect">Already have an account? <a href="client-login.html">Log In</a></p>
        </div>
    </div>
    
    <script src="js/signup.js"></script>
</body>
</html>
```

3. Save the file (Ctrl+S or File > Save)

### Step 10: Create Signup JavaScript

1. Create a new file called `js/signup.js`
2. Copy and paste this code:

```javascript
// Configure Amplify (same as auth.js)
const awsConfig = {
    Auth: {
        region: 'us-west-2', // Your AWS region
        userPoolId: 'us-west-2_xxxxxxxx', // Your Cognito User Pool ID
        userPoolWebClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx', // Your App Client ID
    }
};

// Replace with your actual values (same as in auth.js)

Amplify.configure(awsConfig);

// Signup form handler
document.getElementById('signup-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const errorMessage = document.getElementById('error-message');
    
    // Clear previous error messages
    errorMessage.textContent = '';
    
    // Validate passwords match
    if (password !== confirmPassword) {
        errorMessage.textContent = 'Passwords do not match';
        return;
    }
    
    try {
        // Sign up the user
        const { user } = await Amplify.Auth.signUp({
            username: email,
            password: password,
            attributes: {
                email: email,
                name: name
            }
        });
        
        // Redirect to verification page
        window.location.href = 'verify.html?email=' + encodeURIComponent(email);
        
    } catch (error) {
        errorMessage.textContent = error.message;
    }
});
```

3. Save the file (Ctrl+S or File > Save)
4. Update the configuration values with your actual values (same as in Step 7)

**What's happening here?** You're creating the signup page and the code that will handle the signup process.

### Step 11: Create Verification Page

1. Create a new file called `verify.html`
2. Copy and paste this code:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Account - The Shrey Method Fitness</title>
    <link rel="stylesheet" href="css/styles.css">
    <!-- Add AWS Amplify libraries -->
    <script src="https://cdn.jsdelivr.net/npm/aws-amplify@5.0.4/dist/aws-amplify.min.js"></script>
</head>
<body>
    <!-- Navigation bar (reuse existing) -->
    
    <div class="auth-container">
        <div class="auth-form">
            <h2>Verify Your Account</h2>
            <p>We've sent a verification code to your email. Please enter it below to verify your account.</p>
            <div id="error-message" class="error-message"></div>
            
            <form id="verify-form">
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" readonly>
                </div>
                
                <div class="form-group">
                    <label for="code">Verification Code</label>
                    <input type="text" id="code" required>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn-primary">Verify Account</button>
                </div>
            </form>
            
            <p class="auth-redirect">Didn't receive a code? <a href="#" id="resend-code">Resend Code</a></p>
        </div>
    </div>
    
    <script src="js/verify.js"></script>
</body>
</html>
```

3. Save the file (Ctrl+S or File > Save)

### Step 12: Create Verification JavaScript

1. Create a new file called `js/verify.js`
2. Copy and paste this code:

```javascript
// Configure Amplify (same as auth.js)
const awsConfig = {
    Auth: {
        region: 'us-west-2', // Your AWS region
        userPoolId: 'us-west-2_xxxxxxxx', // Your Cognito User Pool ID
        userPoolWebClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx', // Your App Client ID
    }
};

// Replace with your actual values (same as in auth.js)

Amplify.configure(awsConfig);

// Get email from URL parameter
function getEmailFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('email');
}

// Set email field value
document.addEventListener('DOMContentLoaded', function() {
    const emailField = document.getElementById('email');
    const email = getEmailFromUrl();
    
    if (email) {
        emailField.value = email;
    } else {
        window.location.href = 'signup.html'; // Redirect if no email provided
    }
});

// Verification form handler
document.getElementById('verify-form').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const code = document.getElementById('code').value;
    const errorMessage = document.getElementById('error-message');
    
    try {
        // Confirm signup with verification code
        await Amplify.Auth.confirmSignUp(email, code);
        
        // Show success message
        alert('Account verified successfully! You can now log in.');
        
        // Redirect to login page
        window.location.href = 'client-login.html';
        
    } catch (error) {
        errorMessage.textContent = error.message;
    }
});

// Resend code handler
document.getElementById('resend-code').addEventListener('click', async function(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const errorMessage = document.getElementById('error-message');
    
    try {
        // Resend verification code
        await Amplify.Auth.resendSignUp(email);
        
        // Show success message
        alert('Verification code resent. Please check your email.');
        
    } catch (error) {
        errorMessage.textContent = error.message;
    }
});
```

3. Save the file (Ctrl+S or File > Save)
4. Update the configuration values with your actual values (same as in Step 7)

**What's happening here?** You're creating the verification page that users will see after signing up. They'll need to enter a code sent to their email to verify their account.

### Step 13: Test Your Authentication System

1. Open your website in a browser
   - Right-click on `client-login.html` in VS Code
   - Select "Open with Live Server" (if you have the Live Server extension)
   - Or open the file directly in your browser
2. Try signing up a new user
3. Check your email for the verification code
4. Enter the verification code to verify your account
5. Try logging in with your new account

Congratulations! You've completed Phase 1 of your fitness platform. You now have a working authentication system that allows users to sign up, verify their accounts, and log in.

---

## Phase 2: Building Dashboards

In this phase, we'll create the dashboards for both clients and coaches. We'll break this down into smaller steps to make it easier to follow.

### Step 1: Extend Database Schema

First, we need to add more tables to our database to store program information.

1. In Command Prompt/Terminal, type:
   ```
   amplify update api
   ```
2. Select "GraphQL" when prompted
3. Select "Update the GraphQL schema" when asked what you'd like to do
4. It will open the schema file in VS Code
5. Add these new types to the file (after the existing types):

```graphql
type Program @model
@auth(rules: [
  { allow: groups, groups: ["coaches"], operations: [create, read, update, delete] },
  { allow: owner, operations: [read] }
]) {
  id: ID!
  name: String!
  description: String!
  duration: Int!
  type: String!
  createdAt: AWSDateTime!
}

type ClientProgram @model
@auth(rules: [
  { allow: groups, groups: ["coaches"], operations: [create, read, update, delete] },
  { allow: owner, operations: [read] }
]) {
  id: ID!
  clientId: ID!
  programId: ID!
  startDate: AWSDateTime!
  currentWeek: Int!
  status: String!
  nextCheckIn: AWSDateTime
}

type ProgramContent @model
@auth(rules: [
  { allow: groups, groups: ["coaches"], operations: [create, read, update, delete] },
  { allow: owner, operations: [read] }
]) {
  id: ID!
  programId: ID!
  clientId: ID
  title: String!
  description: String
  fileUrl: String!
  fileType: String!
  week: Int
  createdAt: AWSDateTime!
}
```

6. Save the file (Ctrl+S or File > Save)

**What's happening here?** You're adding more tables to your database to store information about workout programs, client assignments, and program content.

### Step 2: Add Storage for Files

1. In Command Prompt/Terminal, type:
   ```
   amplify add storage
   ```
2. Answer the prompts:
   - Select "Content (Images, audio, video, etc.)"
   - Resource name: "shreymethodstorage"
   - Bucket name: "shreymethodfitness-storage"
   - Who should have access: "Auth users only"
   - What kind of access: "read/write"
   - Do you want to add a Lambda Trigger for your S3 Bucket: "No"

**What's happening here?** You're setting up storage for files like workout PDFs, nutrition guides, etc.

### Step 3: Deploy Your Updated Backend

1. In Command Prompt/Terminal, type:
   ```
   amplify push
   ```
2. Review the changes and confirm by typing "y"
3. Wait for the deployment to complete

**What's happening here?** You're updating your AWS resources with the new database tables and storage.

### Step 4: Create Dashboard CSS

1. Create a new file called `css/dashboard.css`
2. Copy and paste this code:

```css
/* Dashboard Layout */
.dashboard-container {
    display: flex;
    min-height: 100vh;
}

.dashboard-sidebar {
    width: 250px;
    background-color: var(--secondary);
    color: white;
    padding: 20px 0;
    display: flex;
    flex-direction: column;
}

.dashboard-content {
    flex: 1;
    background-color: var(--light-gray);
    overflow-y: auto;
}

/* Sidebar Styles */
.logo {
    padding: 0 20px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo h2 {
    margin: 0;
    font-size: 1.5rem;
}

.dashboard-nav {
    margin-top: 20px;
    flex: 1;
}

.dashboard-nav ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

.dashboard-nav li {
    margin-bottom: 5px;
}

.dashboard-nav a {
    display: block;
    padding: 10px 20px;
    color: rgba(255, 255, 255, 0.8);
    text-decoration: none;
    transition: all 0.3s ease;
}

.dashboard-nav a:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: white;
}

.dashboard-nav li.active a {
    background-color: var(--primary);
    color: white;
}

.sidebar-footer {
    padding: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* Content Area Styles */
.dashboard-header {
    background-color: white;
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.dashboard-header h1 {
    margin: 0;
    font-size: 1.8rem;
    color: var(--secondary);
}

.user-menu {
    display: flex;
    align-items: center;
}

.user-menu span {
    margin-right: 10px;
}

.avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
}

.content-container {
    padding: 20px;
}

/* Dashboard Cards */
.dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
}

.dashboard-card {
    background-color: white;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.dashboard-card h2 {
    margin-top: 0;
    margin-bottom: 15px;
    font-size: 1.3rem;
    color: var(--secondary);
}

/* Button Styles */
.btn-secondary {
    background-color: rgba(255, 255, 255, 0.2);
    color: white;
    border: none;
    padding: 8px 15px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.3s ease;
    width: 100%;
}

.btn-secondary:hover {
    background-color: rgba(255, 255, 255, 0.3);
}

.quick-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.quick-actions button {
    width: 100%;
}

/* Loading Indicator */
.loading {
    color: var(--dark-gray);
    font-style: italic;
    opacity: 0.7;
}
```

3. Save the file (Ctrl+S or File > Save)

**What's happening here?** You're creating the styling for the dashboard pages.

### Step 5: Create Client Dashboard HTML

1. Create a new file called `client-dashboard.html`
2. Copy and paste this code:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Client Dashboard - The Shrey Method Fitness</title>
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/dashboard.css">
    <script src="https://cdn.jsdelivr.net/npm/aws-amplify@5.0.4/dist/aws-amplify.min.js"></script>
</head>
<body>
    <div class="dashboard-container">
        <!-- Sidebar navigation -->
        <div class="dashboard-sidebar">
            <div class="logo">
                <h2>The Shrey Method</h2>
            </div>
            <nav class="dashboard-nav">
                <ul>
                    <li class="active"><a href="client-dashboard.html">Overview</a></li>
                    <li><a href="client-program.html">My Program</a></li>
                    <li><a href="client-nutrition.html">Nutrition</a></li>
                    <li><a href="client-messages.html">Messages</a></li>
                    <li><a href="client-payments.html">Payments</a></li>
                    <li><a href="client-schedule.html">Schedule</a></li>
                </ul>
            </nav>
            <div class="sidebar-footer">
                <button id="logout-btn" class="btn-secondary">Log Out</button>
            </div>
        </div>
        
        <!-- Main content area -->
        <div class="dashboard-content">
            <header class="dashboard-header">
                <h1>Welcome Back, <span id="client-name">Client</span>!</h1>
                <div class="user-menu">
                    <span id="user-name"></span>
                    <img src="images/default-avatar.jpg" alt="Profile" class="avatar" id="user-avatar">
                </div>
            </header>
            
            <div class="content-container">
                <div class="dashboard-grid">
                    <!-- Program Overview Card -->
                    <div class="dashboard-card">
                        <h2>Current Program</h2>
                        <div id="program-info">
                            <div class="loading">Loading program information...</div>
                        </div>
                    </div>
                    
                    <!-- Progress Card -->
                    <div class="dashboard-card">
                        <h2>Program Progress</h2>
                        <div id="progress-container">
                            <div class="loading">Loading progress...</div>
                        </div>
                    </div>
                    
                    <!-- Quick Access Card -->
                    <div class="dashboard-card">
                        <h2>Quick Access</h2>
                        <div class="quick-actions">
                            <button id="view-workout-btn" class="btn-primary">View Today's Workout</button>
                            <button id="log-nutrition-btn" class="btn-primary">Log Nutrition</button>
                            <button id="message-coach-btn" class="btn-primary">Message Coach</button>
                        </div>
                    </div>
                    
                    <!-- Recent Files Card -->
                    <div class="dashboard-card">
                        <h2>Recent Files</h2>
                        <div id="recent-files">
                            <div class="loading">Loading recent files...</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script src="js/client-dashboard.js"></script>
</body>
</html>
```

3. Save the file (Ctrl+S or File > Save)

**What's happening here?** You're creating the main dashboard page that clients will see after logging in.

### Step 6: Create Client Dashboard JavaScript

1. Create a new file called `js/client-dashboard.js`
2. Copy and paste this code:

```javascript
// Configure Amplify
const awsConfig = {
    Auth: {
        region: 'us-west-2', // Your AWS region
        userPoolId: 'us-west-2_xxxxxxxx', // Your Cognito User Pool ID
        userPoolWebClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx', // Your App Client ID
    },
    API: {
        endpoints: [{
            name: "shreymethodapi",
            endpoint: "https://xxxxxxxxxx.execute-api.us-west-2.amazonaws.com/dev"
        }]
    }
};

// Replace with your actual values (same as in auth.js)

Amplify.configure(awsConfig);

// Check authentication
async function checkAuth() {
    try {
        const user = await Amplify.Auth.currentAuthenticatedUser();
        return user;
    } catch (error) {
        window.location.href = 'client-login.html';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = await checkAuth();
        
        // Set user name
        const clientName = document.getElementById('client-name');
        const userName = document.getElementById('user-name');
        
        clientName.textContent = user.attributes.name || user.username;
        userName.textContent = user.attributes.name || user.username;
        
        // Set up quick action buttons
        document.getElementById('view-workout-btn').addEventListener('click', () => {
            alert('This feature will be implemented in a future update.');
        });
        
        document.getElementById('log-nutrition-btn').addEventListener('click', () => {
            alert('This feature will be implemented in a future update.');
        });
        
        document.getElementById('message-coach-btn').addEventListener('click', () => {
            alert('This feature will be implemented in a future update.');
        });
        
        // Set up logout
        document.getElementById('logout-btn').addEventListener('click', async () => {
            try {
                await Amplify.Auth.signOut();
                window.location.href = 'client-login.html';
            } catch (error) {
                console.error('Error signing out: ', error);
            }
        });
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
});
```

3. Save the file (Ctrl+S or File > Save)
4. Update the configuration values with your actual values (same as in Phase 1, Step 7)

**What's happening here?** You're creating a basic JavaScript file for the client dashboard that handles authentication and sets up event listeners for the buttons.

### Step 7: Create Coach Dashboard HTML

1. Create a new file called `coach-dashboard.html`
2. Copy and paste this code:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Coach Dashboard - The Shrey Method Fitness</title>
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/dashboard.css">
    <script src="https://cdn.jsdelivr.net/npm/aws-amplify@5.0.4/dist/aws-amplify.min.js"></script>
</head>
<body>
    <div class="dashboard-container">
        <!-- Sidebar navigation -->
        <div class="dashboard-sidebar">
            <div class="logo">
                <h2>The Shrey Method</h2>
            </div>
            <nav class="dashboard-nav">
                <ul>
                    <li class="active"><a href="coach-dashboard.html">Dashboard</a></li>
                    <li><a href="coach-clients.html">Clients</a></li>
                    <li><a href="coach-messages.html">Messages</a></li>
                    <li><a href="coach-programs.html">Programs</a></li>
                    <li><a href="coach-settings.html">Settings</a></li>
                </ul>
            </nav>
            <div class="sidebar-footer">
                <button id="logout-btn" class="btn-secondary">Log Out</button>
            </div>
        </div>
        
        <!-- Main content area -->
        <div class="dashboard-content">
            <header class="dashboard-header">
                <h1>Coach Dashboard</h1>
                <div class="user-menu">
                    <span id="user-name">Coach</span>
                    <img src="images/default-avatar.jpg" alt="Profile" class="avatar" id="user-avatar">
                </div>
            </header>
            
            <div class="content-container">
                <div class="dashboard-grid">
                    <!-- Stats Card -->
                    <div class="dashboard-card">
                        <h2>Client Statistics</h2>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <h3>Active Clients</h3>
                                <p id="active-clients-count">0</p>
                            </div>
                            <div class="stat-item">
                                <h3>New This Month</h3>
                                <p id="new-clients-count">0</p>
                            </div>
                            <div class="stat-item">
                                <h3>Check-ins Today</h3>
                                <p id="checkins-today-count">0</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Quick Actions Card -->
                    <div class="dashboard-card">
                        <h2>Quick Actions</h2>
                        <div class="quick-actions">
                            <button id="add-client-btn" class="btn-primary">Add New Client</button>
                            <button id="create-program-btn" class="btn-primary">Create Program</button>
                            <button id="view-messages-btn" class="btn-primary">View Messages</button>
                        </div>
                    </div>
                    
                    <!-- Recent Activity Card -->
                    <div class="dashboard-card">
                        <h2>Recent Activity</h2>
                        <div id="recent-activity">
                            <p>No recent activity to display.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script src="js/coach-dashboard.js"></script>
</body>
</html>
```

3. Save the file (Ctrl+S or File > Save)

**What's happening here?** You're creating the main dashboard page that coaches will see after logging in.

### Step 8: Create Coach Dashboard JavaScript

1. Create a new file called `js/coach-dashboard.js`
2. Copy and paste this code:

```javascript
// Configure Amplify
const awsConfig = {
    Auth: {
        region: 'us-west-2', // Your AWS region
        userPoolId: 'us-west-2_xxxxxxxx', // Your Cognito User Pool ID
        userPoolWebClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx', // Your App Client ID
    },
    API: {
        endpoints: [{
            name: "shreymethodapi",
            endpoint: "https://xxxxxxxxxx.execute-api.us-west-2.amazonaws.com/dev"
        }]
    }
};

// Replace with your actual values (same as in auth.js)

Amplify.configure(awsConfig);

// Check authentication
async function checkAuth() {
    try {
        const user = await Amplify.Auth.currentAuthenticatedUser();
        
        // Check if user is in coaches group
        const session = await Amplify.Auth.currentSession();
        const idToken = session.getIdToken().payload;
        
        if (!idToken['cognito:groups'] || !idToken['cognito:groups'].includes('coaches')) {
            // Redirect to client dashboard if not a coach
            window.location.href = 'client-dashboard.html';
            return;
        }
        
        return user;
    } catch (error) {
        window.location.href = 'client-login.html';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = await checkAuth();
        
        // Set user name
        const userName = document.getElementById('user-name');
        userName.textContent = user.attributes.name || user.username;
        
        // Set up quick action buttons
        document.getElementById('add-client-btn').addEventListener('click', () => {
            alert('This feature will be implemented in a future update.');
        });
        
        document.getElementById('create-program-btn').addEventListener('click', () => {
            alert('This feature will be implemented in a future update.');
        });
        
        document.getElementById('view-messages-btn').addEventListener('click', () => {
            alert('This feature will be implemented in a future update.');
        });
        
        // Set up logout
        document.getElementById('logout-btn').addEventListener('click', async () => {
            try {
                await Amplify.Auth.signOut();
                window.location.href = 'client-login.html';
            } catch (error) {
                console.error('Error signing out: ', error);
            }
        });
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
});
```

3. Save the file (Ctrl+S or File > Save)
4. Update the configuration values with your actual values (same as in Phase 1, Step 7)

**What's happening here?** You're creating a basic JavaScript file for the coach dashboard that handles authentication, checks if the user is a coach, and sets up event listeners for the buttons.

### Step 9: Add a User to the Coaches Group

1. In Command Prompt/Terminal, type:
   ```
   amplify console auth
   ```
2. This will open the AWS Cognito console in your browser
3. Click on "User Pools" in the left sidebar
4. Click on your user pool
5. Click on "Users and groups" in the left sidebar
6. Click on the "Groups" tab
7. Click on the "coaches" group
8. Click "Add users to group"
9. Select your user from the list
10. Click "Add"

**What's happening here?** You're adding your user account to the coaches group so you can access the coach dashboard.

### Step 10: Create Images Folder

1. Create a folder called `images` if it doesn't exist already
2. Add a default avatar image to this folder (you can use any image or download one from the internet)
3. Rename it to `default-avatar.jpg`

**What's happening here?** You're adding a default avatar image that will be displayed in the dashboard.

### Step 11: Test Both Dashboards

1. Open your website in a browser
2. Log in with your account
3. You should be redirected to the coach dashboard (since you're in the coaches group)
4. Test the logout button
5. Create a new user account (if you haven't already)
6. Log in with the new account
7. You should be redirected to the client dashboard (since the new user is not in the coaches group)

Congratulations! You've completed Phase 2 of your fitness platform. You now have basic dashboards for both clients and coaches.

---

## Phase 3: Adding Payment Processing

In this phase, we'll add payment processing capabilities to your fitness platform using Stripe. We'll break this down into smaller steps to make it easier to follow.

### Step 1: Create a Stripe Account

1. Go to [stripe.com](https://stripe.com)
2. Click "Start now" or "Create account"
3. Follow the sign-up process
4. Once you're signed in, go to the Developers section
5. Find your API keys (you'll need these later)

**What's happening here?** You're creating a Stripe account that will handle payment processing for your fitness platform.

### Step 2: Install Stripe Libraries

1. In Command Prompt/Terminal, type:
   ```
   npm install stripe @stripe/stripe-js
   ```
2. Wait for the installation to complete

**What's happening here?** You're installing the Stripe libraries that will allow you to integrate Stripe with your fitness platform.

### Step 3: Create Lambda Function for Payment Processing

1. In Command Prompt/Terminal, type:
   ```
   amplify add function
   ```
2. Answer the prompts:
   - Function name: "processPayment"
   - Choose the runtime: "NodeJS"
   - Choose the function template: "Hello World"
   - Do you want to configure advanced settings: "Yes"
   - Do you want to access other resources in this project from your Lambda function: "No"
   - Do you want to invoke this function on a recurring schedule: "No"
   - Do you want to configure Lambda layers for this function: "No"
   - Do you want to edit the local lambda function now: "Yes"

3. It will open the function file in VS Code. Replace the content with:

```javascript
const stripe = require('stripe')('sk_test_your_stripe_secret_key');

exports.handler = async (event) => {
    try {
        const body = JSON.parse(event.body);
        const { operation, payload } = body;
        
        switch (operation) {
            case 'createPaymentIntent':
                return await createPaymentIntent(payload);
            case 'createSubscription':
                return await createSubscription(payload);
            case 'cancelSubscription':
                return await cancelSubscription(payload);
            default:
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Invalid operation' })
                };
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

async function createPaymentIntent(payload) {
    const { amount, currency, customerId } = payload;
    
    const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        customer: customerId
    });
    
    return {
        statusCode: 200,
        body: JSON.stringify({
            clientSecret: paymentIntent.client_secret
        })
    };
}

async function createSubscription(payload) {
    const { customerId, priceId } = payload;
    
    const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        expand: ['latest_invoice.payment_intent']
    });
    
    return {
        statusCode: 200,
        body: JSON.stringify({
            subscriptionId: subscription.id,
            clientSecret: subscription.latest_invoice.payment_intent.client_secret
        })
    };
}

async function cancelSubscription(payload) {
    const { subscriptionId } = payload;
    
    const canceledSubscription = await stripe.subscriptions.del(subscriptionId);
    
    return {
        statusCode: 200,
        body: JSON.stringify({
            subscriptionId: canceledSubscription.id,
            status: canceledSubscription.status
        })
    };
}
```

4. Replace `'sk_test_your_stripe_secret_key'` with your actual Stripe secret key
5. Save the file (Ctrl+S or File > Save)

**What's happening here?** You're creating a Lambda function that will handle payment processing using Stripe.

### Step 4: Create API Endpoint for Payment Processing

1. In Command Prompt/Terminal, type:
   ```
   amplify add api
   ```
2. Answer the prompts:
   - Select "REST" as the API service
   - Enter API name: "paymentapi"
   - Enter path: "/payments"
   - Choose Lambda source: "Use a Lambda function already added in the current Amplify project"
   - Choose the Lambda function: "processPayment"
   - Do you want to restrict API access: "Yes"
   - Who should have access: "Authenticated users only"
   - What kind of access do you want for Authenticated users: "read/write"
   - Do you want to add another path: "No"

**What's happening here?** You're creating an API endpoint that will connect to your Lambda function for payment processing.

### Step 5: Deploy Your Updated Backend

1. In Command Prompt/Terminal, type:
   ```
   amplify push
   ```
2. Review the changes and confirm by typing "y"
3. Wait for the deployment to complete

**What's happening here?** You're updating your AWS resources with the new Lambda function and API endpoint.

### Step 6: Create Client Payments Page

1. Create a new file called `client-payments.html`
2. Copy and paste this code:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payments - The Shrey Method Fitness</title>
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/dashboard.css">
    <script src="https://cdn.jsdelivr.net/npm/aws-amplify@5.0.4/dist/aws-amplify.min.js"></script>
    <script src="https://js.stripe.com/v3/"></script>
</head>
<body>
    <div class="dashboard-container">
        <!-- Sidebar navigation (same as client-dashboard.html) -->
        <div class="dashboard-sidebar">
            <div class="logo">
                <h2>The Shrey Method</h2>
            </div>
            <nav class="dashboard-nav">
                <ul>
                    <li><a href="client-dashboard.html">Overview</a></li>
                    <li><a href="client-program.html">My Program</a></li>
                    <li><a href="client-nutrition.html">Nutrition</a></li>
                    <li><a href="client-messages.html">Messages</a></li>
                    <li class="active"><a href="client-payments.html">Payments</a></li>
                    <li><a href="client-schedule.html">Schedule</a></li>
                </ul>
            </nav>
            <div class="sidebar-footer">
                <button id="logout-btn" class="btn-secondary">Log Out</button>
            </div>
        </div>
        
        <!-- Main content area -->
        <div class="dashboard-content">
            <header class="dashboard-header">
                <h1>Payments</h1>
                <div class="user-menu">
                    <span id="user-name"></span>
                    <img src="images/default-avatar.jpg" alt="Profile" class="avatar" id="user-avatar">
                </div>
            </header>
            
            <div class="content-container">
                <div class="dashboard-grid">
                    <!-- Available Plans Card -->
                    <div class="dashboard-card">
                        <h2>Available Plans</h2>
                        <div id="available-plans">
                            <div class="plan-card">
                                <h3>Monthly Coaching</h3>
                                <p class="plan-price">$199/month</p>
                                <ul class="plan-features">
                                    <li>Personalized workout plans</li>
                                    <li>Nutrition guidance</li>
                                    <li>Weekly check-ins</li>
                                    <li>24/7 messaging support</li>
                                </ul>
                                <button class="btn-primary subscribe-btn" data-plan="monthly">Subscribe</button>
                            </div>
                            
                            <div class="plan-card">
                                <h3>3-Month Coaching</h3>
                                <p class="plan-price">$179/month</p>
                                <p class="plan-discount">Save 10%</p>
                                <ul class="plan-features">
                                    <li>All monthly features</li>
                                    <li>Discounted rate</li>
                                    <li>Priority support</li>
                                </ul>
                                <button class="btn-primary subscribe-btn" data-plan="quarterly">Subscribe</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Payment Method Card -->
                    <div class="dashboard-card">
                        <h2>Payment Method</h2>
                        <div id="payment-method">
                            <p>No payment method on file.</p>
                            <button id="add-payment-method-btn" class="btn-primary">Add Payment Method</button>
                        </div>
                    </div>
                    
                    <!-- Payment History Card -->
                    <div class="dashboard-card">
                        <h2>Payment History</h2>
                        <div id="payment-history">
                            <p>No payment history to display.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Payment Modal -->
    <div id="payment-modal" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Add Payment Method</h2>
            <form id="payment-form">
                <div id="card-element">
                    <!-- Stripe Card Element will be inserted here -->
                </div>
                <div id="card-errors" class="error-message"></div>
                <button type="submit" class="btn-primary">Save Payment Method</button>
            </form>
        </div>
    </div>
    
    <script src="js/client-payments.js"></script>
</body>
</html>
```

3. Save the file (Ctrl+S or File > Save)

**What's happening here?** You're creating a payments page that will allow clients to subscribe to your coaching plans.

### Step 7: Create Client Payments JavaScript

1. Create a new file called `js/client-payments.js`
2. Copy and paste this code:

```javascript
// Configure Amplify
const awsConfig = {
    Auth: {
        region: 'us-west-2', // Your AWS region
        userPoolId: 'us-west-2_xxxxxxxx', // Your Cognito User Pool ID
        userPoolWebClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx', // Your App Client ID
    },
    API: {
        endpoints: [{
            name: "shreymethodapi",
            endpoint: "https://xxxxxxxxxx.execute-api.us-west-2.amazonaws.com/dev"
        }, {
            name: "paymentapi",
            endpoint: "https://xxxxxxxxxx.execute-api.us-west-2.amazonaws.com/dev"
        }]
    }
};

// Replace with your actual values (same as in auth.js)

Amplify.configure(awsConfig);

// Initialize Stripe
const stripe = Stripe('pk_test_your_stripe_publishable_key'); // Replace with your Stripe publishable key
let cardElement;

// Check authentication
async function checkAuth() {
    try {
        const user = await Amplify.Auth.currentAuthenticatedUser();
        return user;
    } catch (error) {
        window.location.href = 'client-login.html';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = await checkAuth();
        
        // Set user name
        const userName = document.getElementById('user-name');
        userName.textContent = user.attributes.name || user.username;
        
        // Set up payment modal
        const modal = document.getElementById('payment-modal');
        const addPaymentMethodBtn = document.getElementById('add-payment-method-btn');
        const closeBtn = document.querySelector('.close');
        
        addPaymentMethodBtn.addEventListener('click', () => {
            modal.style.display = 'block';
            setupStripeElements();
        });
        
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        // Set up subscription buttons
        document.querySelectorAll('.subscribe-btn').forEach(button => {
            button.addEventListener('click', () => {
                alert('This feature will be implemented in a future update.');
            });
        });
        
        // Set up payment form
        document.getElementById('payment-
