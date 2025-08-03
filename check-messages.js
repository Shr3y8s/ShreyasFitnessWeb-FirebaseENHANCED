// Script to check for messages in DynamoDB
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Load AWS config
let awsConfig;
try {
    const configPath = path.join(__dirname, 'js', 'aws-config.js');
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Extract region and API key from the config file
    const regionMatch = configContent.match(/region:\s*['"]([^'"]+)['"]/);
    const apiKeyMatch = configContent.match(/apiKey:\s*['"]([^'"]+)['"]/);
    
    if (!regionMatch || !apiKeyMatch) {
        throw new Error('Could not find region or API key in aws-config.js');
    }
    
    awsConfig = {
        region: regionMatch[1],
        credentials: {
            accessKeyId: 'AKIAIOSFODNN7EXAMPLE', // This is a placeholder, will be replaced by actual credentials
            secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' // This is a placeholder
        }
    };
    
    console.log(`Loaded AWS config with region: ${awsConfig.region}`);
} catch (error) {
    console.error('Error loading AWS config:', error);
    process.exit(1);
}

// Function to check for messages
async function checkMessages() {
    try {
        console.log('Checking for messages in DynamoDB...');
        
        // Create DynamoDB client
        const dynamodb = new AWS.DynamoDB.DocumentClient({
            region: awsConfig.region
        });
        
        // Get the table name from environment variables or use a default
        const tableName = process.env.MESSAGE_TABLE_NAME || 'Message-ucxyfxymdSeftmpcx6ljfb734i-dev';
        
        // Query the table
        const params = {
            TableName: tableName,
            Limit: 100
        };
        
        console.log(`Scanning table: ${tableName}`);
        const result = await dynamodb.scan(params).promise();
        
        if (result.Items && result.Items.length > 0) {
            console.log(`Found ${result.Items.length} messages:`);
            
            // Sort by createdAt (newest first)
            result.Items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            // Display each message
            result.Items.forEach((message, index) => {
                console.log(`\n--- Message ${index + 1} ---`);
                console.log(`ID: ${message.id}`);
                console.log(`From: ${message.senderName} (${message.senderEmail})`);
                console.log(`Subject: ${message.subject}`);
                console.log(`Date: ${new Date(message.createdAt).toLocaleString()}`);
                console.log(`Content: ${message.content}`);
                console.log(`Read: ${message.read}`);
                console.log(`Archived: ${message.archived}`);
            });
        } else {
            console.log('No messages found in the database.');
        }
    } catch (error) {
        console.error('Error checking messages:', error);
    }
}

// Check if AWS CLI is configured
console.log('Note: This script requires AWS CLI to be configured with appropriate credentials.');
console.log('If you encounter permission errors, please configure AWS CLI with:');
console.log('  aws configure');
console.log('\nAlternatively, you can set the following environment variables:');
console.log('  AWS_ACCESS_KEY_ID');
console.log('  AWS_SECRET_ACCESS_KEY');
console.log('  AWS_REGION');
console.log('\nYou can also specify the message table name with:');
console.log('  MESSAGE_TABLE_NAME=your-table-name node check-messages.js');

// Run the check
checkMessages();
