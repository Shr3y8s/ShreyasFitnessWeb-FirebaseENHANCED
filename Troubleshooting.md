# Troubleshooting
## The Shrey Method Fitness Platform Guide

[← Back to Phase 4](Phase4_Scheduling.md) | [Next: Glossary →](Glossary.md)

---

This section covers common issues you might encounter while building or using your fitness platform, along with their solutions. If you run into a problem, check here first before seeking additional help.

## Authentication Issues

### Issue: Users can't sign up

**Possible causes and solutions:**

1. **AWS Cognito configuration issues**
   - Make sure you've correctly set up the User Pool in AWS Cognito
   - Check that you've configured the required attributes (Email and Name)
   - Verify that your App Client ID is correct in the JavaScript files

2. **Network or CORS issues**
   - Ensure your internet connection is stable
   - If you're getting CORS errors in the browser console, you may need to configure CORS settings in AWS

3. **Email verification not working**
   - Check your spam folder for verification emails
   - Verify that the email service in AWS Cognito is set up correctly
   - Try using a different email address

### Issue: Users can't log in

**Possible causes and solutions:**

1. **Incorrect credentials**
   - Make sure the email and password are correct
   - Check if the user has verified their email

2. **Configuration issues**
   - Verify that the AWS configuration values in `auth.js` are correct
   - Check that the User Pool ID and App Client ID match your AWS Cognito settings

3. **Account issues**
   - The user account might be disabled or deleted
   - The user might need to reset their password

### Issue: Users are not redirected to the correct dashboard

**Possible causes and solutions:**

1. **Group assignment issues**
   - Make sure the user is assigned to the correct group (clients or coaches)
   - Check the code that checks for group membership in `auth.js`

2. **Redirect logic issues**
   - Verify that the redirect logic in `auth.js` is working correctly
   - Check the browser console for any errors

## Database Issues

### Issue: Data is not being saved or retrieved

**Possible causes and solutions:**

1. **API configuration issues**
   - Make sure the API endpoint in your JavaScript files is correct
   - Verify that the API is properly configured in AWS

2. **Permission issues**
   - Check that the authentication rules in your GraphQL schema are correct
   - Verify that the user has the necessary permissions to access the data

3. **Code issues**
   - Look for errors in the browser console
   - Check that you're using the correct API calls in your code

### Issue: GraphQL errors

**Possible causes and solutions:**

1. **Schema issues**
   - Make sure your GraphQL schema is valid
   - Check for typos or syntax errors in the schema

2. **Query or mutation issues**
   - Verify that your queries and mutations match the schema
   - Check that you're passing the correct parameters

3. **Authentication issues**
   - Make sure the user is authenticated before making API calls
   - Check that the user has the necessary permissions

## Storage Issues

### Issue: Files can't be uploaded

**Possible causes and solutions:**

1. **Storage configuration issues**
   - Make sure the storage is properly configured in AWS
   - Verify that the user has the necessary permissions to upload files

2. **File size issues**
   - Check if the file is too large (AWS has limits on file sizes)
   - Try uploading a smaller file to see if it works

3. **Code issues**
   - Look for errors in the browser console
   - Check that you're using the correct Storage API calls

### Issue: Files can't be downloaded

**Possible causes and solutions:**

1. **Permission issues**
   - Make sure the user has the necessary permissions to download the file
   - Check the access control settings for the file in AWS

2. **File not found**
   - Verify that the file exists in the storage
   - Check that you're using the correct file path

3. **Code issues**
   - Look for errors in the browser console
   - Check that you're using the correct Storage API calls

## Payment Issues

### Issue: Stripe integration not working

**Possible causes and solutions:**

1. **API key issues**
   - Make sure you're using the correct Stripe API keys
   - Check if you're using test keys in production or vice versa

2. **Lambda function issues**
   - Verify that the Lambda function is properly configured
   - Check the CloudWatch logs for any errors

3. **Frontend issues**
   - Look for errors in the browser console
   - Check that the Stripe Elements are properly initialized

### Issue: Subscriptions not being created

**Possible causes and solutions:**

1. **Product and price issues**
   - Make sure you've created the products and prices in Stripe
   - Verify that you're using the correct price IDs

2. **Customer issues**
   - Check if the customer exists in Stripe
   - Verify that the customer has a valid payment method

3. **Code issues**
   - Look for errors in the browser console or Lambda logs
   - Check that you're using the correct Stripe API calls

## Scheduling Issues

### Issue: Calendly widget not loading

**Possible causes and solutions:**

1. **Script loading issues**
   - Make sure the Calendly script is properly loaded
   - Check for any script errors in the browser console

2. **Configuration issues**
   - Verify that you're using the correct Calendly URL
   - Check that the Calendly widget is properly initialized

3. **DOM issues**
   - Make sure the container element for the widget exists
   - Check that the widget is being initialized after the DOM is loaded

### Issue: Sessions not being booked

**Possible causes and solutions:**

1. **Calendly account issues**
   - Make sure your Calendly account is active
   - Check that you've set up your availability correctly

2. **Event type issues**
   - Verify that the event types are properly configured
   - Check that the event types are enabled

3. **User information issues**
   - Make sure the user's name and email are being passed correctly
   - Check that the user has permission to book sessions

## Deployment Issues

### Issue: AWS Amplify deployment fails

**Possible causes and solutions:**

1. **Configuration issues**
   - Make sure your `amplify.yml` file is correct
   - Check that you've configured the build settings properly

2. **Build errors**
   - Look for errors in the build logs
   - Fix any code errors that are causing the build to fail

3. **Permission issues**
   - Make sure your AWS account has the necessary permissions
   - Check that your IAM roles are properly configured

### Issue: Website not loading after deployment

**Possible causes and solutions:**

1. **DNS issues**
   - Make sure your domain is properly configured
   - Check that the DNS records are pointing to the correct location

2. **CloudFront issues**
   - Verify that the CloudFront distribution is properly configured
   - Check that the distribution is enabled and not in a pending state

3. **File issues**
   - Make sure all the necessary files are included in the deployment
   - Check that the file paths in your HTML files are correct

## General Troubleshooting Tips

### Check the Browser Console

The browser console is your best friend when troubleshooting frontend issues. It will show you any JavaScript errors, network requests, and other useful information.

To open the browser console:
- Chrome: Press F12 or right-click and select "Inspect", then click on the "Console" tab
- Firefox: Press F12 or right-click and select "Inspect Element", then click on the "Console" tab
- Safari: Enable the Developer menu in Preferences > Advanced, then select Develop > Show JavaScript Console

### Check AWS CloudWatch Logs

CloudWatch Logs is where you'll find logs for your Lambda functions and other AWS services. If you're having issues with backend functionality, check the logs for any errors.

To access CloudWatch Logs:
1. Go to the AWS Management Console
2. Navigate to CloudWatch
3. Click on "Logs" in the left sidebar
4. Find the log group for your Lambda function or other service

### Use the AWS Amplify CLI for Troubleshooting

The Amplify CLI has several commands that can help you troubleshoot issues:

- `amplify status`: Shows the status of your Amplify project
- `amplify console`: Opens the AWS Amplify Console in your browser
- `amplify console auth`: Opens the Amazon Cognito Console for your User Pool
- `amplify console api`: Opens the AWS AppSync Console for your GraphQL API
- `amplify console storage`: Opens the Amazon S3 Console for your storage bucket

### Get Help from the Community

If you're still stuck after trying the solutions above, consider reaching out to the community for help:

- [AWS Amplify GitHub Issues](https://github.com/aws-amplify/amplify-js/issues)
- [AWS Amplify Discord](https://discord.gg/amplify)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/aws-amplify)

## Next Steps

If you've encountered an issue that's not covered in this troubleshooting guide, or if the solutions provided don't resolve your problem, consider:

1. Searching online for similar issues and solutions
2. Checking the official documentation for the specific service or library you're using
3. Reaching out to a developer for professional assistance

Remember, troubleshooting is a normal part of the development process. Don't get discouraged if you encounter issues - they're opportunities to learn and improve your understanding of the platform.

---

[← Back to Phase 4](Phase4_Scheduling.md) | [Next: Glossary →](Glossary.md)
