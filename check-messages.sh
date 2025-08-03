#!/bin/bash
# Script to check for messages in DynamoDB using AWS CLI

# Default table name - update this with your actual table name if needed
TABLE_NAME="Message-ucxyfxymdSeftmpcx6ljfb734i-dev"

# Check if a table name was provided as an argument
if [ ! -z "$1" ]; then
  TABLE_NAME="$1"
fi

echo "Checking for messages in DynamoDB table: $TABLE_NAME"
echo "------------------------------------------------------"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
  echo "AWS CLI is not installed. Please install it first:"
  echo "  npm install -g aws-cli"
  echo "  or visit https://aws.amazon.com/cli/"
  exit 1
fi

# Check if AWS CLI is configured
if ! aws configure list &> /dev/null; then
  echo "AWS CLI is not configured. Please run:"
  echo "  aws configure"
  echo "And enter your AWS credentials."
  exit 1
fi

# Scan the DynamoDB table
echo "Scanning table for messages..."
RESULT=$(aws dynamodb scan --table-name "$TABLE_NAME" --max-items 100 2>&1)

# Check if there was an error
if [[ $RESULT == *"An error occurred"* ]]; then
  echo "Error querying DynamoDB:"
  echo "$RESULT"
  exit 1
fi

# Check if the table is empty
if [[ $RESULT == *"\"Count\": 0"* ]]; then
  echo "No messages found in the table."
  exit 0
fi

# Extract and display the items
echo "$RESULT" | grep -E "\"senderName\"|\"senderEmail\"|\"subject\"|\"content\"|\"createdAt\"|\"read\"|\"archived\"" | while read -r line; do
  # Format the output
  formatted_line=$(echo "$line" | sed -E 's/"([^"]+)": "?([^,"]+)"?,?/\1: \2/')
  echo "$formatted_line"
done

echo "------------------------------------------------------"
echo "To view more details, use the AWS Management Console:"
echo "https://console.aws.amazon.com/dynamodb/home"
