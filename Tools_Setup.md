# Tools Setup
## The Shrey Method Fitness Platform Guide

[← Back to Web Dev Basics](Web_Dev_Basics.md) | [Next: Phase 1 - User Login →](Phase1_User_Login.md)

---

Before we start building your fitness platform, we need to set up your computer with the necessary tools. This section will guide you through installing and configuring everything you need.

## Required Tools

We'll be installing and setting up:

1. **Node.js** - A JavaScript runtime that lets us run JavaScript code on your computer
2. **Visual Studio Code (VS Code)** - A code editor that makes writing code easier
3. **AWS Account** - Amazon Web Services will host our application
4. **AWS Amplify CLI** - A command-line tool for working with AWS services

Let's go through each step one by one.

## Step 1: Install Node.js

Node.js is a tool that helps run JavaScript code on your computer.

1. Go to [nodejs.org](https://nodejs.org)
2. Download the "LTS" version (LTS stands for "Long Term Support" - it's the stable version)
   
   ![Node.js Download Page](https://nodejs.org/static/images/logo.svg)

3. Run the installer and follow the prompts
4. Accept the default options if you're unsure
5. To verify the installation, open Command Prompt (Windows) or Terminal (Mac) and type:
   ```
   node --version
   ```
   You should see a version number like `v16.15.0` or similar

## Step 2: Install Visual Studio Code

Visual Studio Code (VS Code) is a free code editor that makes writing and editing code much easier.

1. Go to [code.visualstudio.com](https://code.visualstudio.com)
2. Download the version for your operating system (Windows, Mac, etc.)
3. Run the installer and follow the prompts
4. Once installed, open VS Code
5. Recommended: Install these helpful extensions by clicking on the Extensions icon in the sidebar (or press Ctrl+Shift+X) and searching for:
   - "Live Server" - Lets you run your website locally
   - "Prettier" - Formats your code to make it more readable
   - "ESLint" - Helps catch errors in your code

## Step 3: Create an AWS Account

AWS (Amazon Web Services) will host our application's back-end services.

1. Go to [aws.amazon.com](https://aws.amazon.com)
2. Click "Create an AWS Account"
3. Follow the sign-up process:
   - You'll need to provide a credit card, but most services have a free tier
   - You'll need to verify your phone number
   - Choose the "Basic Plan" (free) when asked
4. Once your account is created, sign in to the AWS Management Console

**Important Note:** AWS offers many services with free tiers, but you may incur charges if you exceed the free tier limits. We'll try to stay within the free tier in this guide, but it's good to monitor your AWS billing dashboard regularly.

## Step 4: Install the AWS Amplify CLI

The AWS Amplify CLI (Command Line Interface) is a tool that lets you type commands to interact with AWS.

1. Open Command Prompt (Windows) or Terminal (Mac)
   - On Windows: Press Windows key, type "cmd", press Enter
   - On Mac: Press Command+Space, type "terminal", press Enter
2. Type this command and press Enter:
   ```
   npm install -g @aws-amplify/cli
   ```
3. Wait for the installation to complete (this might take a few minutes)
4. To verify the installation, type:
   ```
   amplify --version
   ```
   You should see a version number like `5.0.0` or similar

## Step 5: Configure AWS Amplify

Now we need to connect the Amplify CLI to your AWS account.

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

## Step 6: Create a Project Folder

Let's create a folder for your project:

1. Open File Explorer (Windows) or Finder (Mac)
2. Navigate to where you want to store your project (e.g., Documents)
3. Create a new folder called "ShreyMethodFitness"
4. Open VS Code
5. Go to File > Open Folder and select your "ShreyMethodFitness" folder

## Verifying Your Setup

Let's make sure everything is working correctly:

1. In VS Code, open the integrated terminal by going to View > Terminal (or press Ctrl+`)
2. Type the following commands:
   ```
   node --version
   npm --version
   amplify --version
   ```
3. All three commands should show version numbers, confirming that the tools are installed correctly

## Troubleshooting

If you encounter any issues during setup:

- **Node.js installation problems**: Try downloading the installer again or use the LTS version instead of the current version
- **VS Code won't open**: Make sure your computer meets the minimum requirements
- **AWS account creation issues**: Try using a different browser or clearing your cookies
- **Amplify CLI installation errors**: Make sure you have administrator privileges when running the command
- **Amplify configure errors**: Double-check that you're signed in to the correct AWS account

For more detailed troubleshooting, see the [Troubleshooting](Troubleshooting.md) section.

## Next Steps

Congratulations! Your computer is now set up for development. In the next section, we'll start building the user login system for your fitness platform.

---

[← Back to Web Dev Basics](Web_Dev_Basics.md) | [Next: Phase 1 - User Login →](Phase1_User_Login.md)
