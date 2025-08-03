@echo off
REM Script to fix the AWS Amplify mock implementation issue
REM This script will download the real AWS Amplify library and create a backup of the mock implementation

echo === AWS Amplify Mock Implementation Fix ===
echo This script will:
echo 1. Create a backup of your current mock implementation
echo 2. Download the real AWS Amplify library from CDN
echo 3. Replace the mock implementation with the real library
echo.

REM Create backup directory if it doesn't exist
if not exist "js\backup" (
    echo Creating backup directory...
    mkdir "js\backup"
)

REM Backup the current mock implementation
echo Creating backup of current mock implementation...
if exist "js\amplify-bundle.min.js" (
    copy "js\amplify-bundle.min.js" "js\backup\amplify-bundle.min.js.bak"
    echo Backup created at js\backup\amplify-bundle.min.js.bak
) else (
    echo Warning: js\amplify-bundle.min.js not found. Skipping backup.
)

REM Download the real AWS Amplify library
echo Downloading real AWS Amplify library from CDN...
powershell -Command "Invoke-WebRequest -Uri 'https://cdn.jsdelivr.net/npm/aws-amplify@5.3.11/dist/aws-amplify.min.js' -OutFile 'js\amplify-bundle.min.js'"

REM Check if download was successful
if %ERRORLEVEL% EQU 0 (
    echo Download successful!
    echo Real AWS Amplify library has been saved to js\amplify-bundle.min.js
) else (
    echo Error: Failed to download AWS Amplify library.
    echo Please check your internet connection and try again.
    
    REM Restore backup if download failed
    if exist "js\backup\amplify-bundle.min.js.bak" (
        echo Restoring backup...
        copy "js\backup\amplify-bundle.min.js.bak" "js\amplify-bundle.min.js"
        echo Backup restored.
    )
    
    exit /b 1
)

echo.
echo === Next Steps ===
echo You need to update your JavaScript code to use the correct namespace:
echo 1. Change 'window.Amplify.configure(...)' to 'Amplify.configure(...)'
echo 2. Change 'window.Amplify.API.graphql(...)' to 'Amplify.API.graphql(...)'
echo.
echo For more information, please refer to the AMPLIFY_MOCK_ISSUE.md file.
echo.
echo === Testing ===
echo To test if the fix works:
echo 1. Open real-amplify-test.html in your browser
echo 2. Click 'Send Test Message' to create a test message
echo 3. Click 'Fetch Messages' to retrieve messages from the database
echo 4. Check your DynamoDB table in the AWS Console to confirm the message was stored
echo.
echo Fix completed successfully!

pause
