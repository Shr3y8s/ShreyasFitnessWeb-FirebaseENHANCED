@echo off
echo Setting up Stripe webhook for Firebase Stripe Extension...
echo.
echo This script will help you configure the webhook for your Stripe account.
echo You'll need to:
echo 1. Create a webhook in the Stripe Dashboard
echo 2. Update the Firebase extension with the webhook secret
echo.

echo Step 1: Get your webhook endpoint URL
echo.
echo Run this command to get your webhook URL:
echo firebase ext:info firestore-stripe-payments
echo.
echo Look for the "Extension Instance ID" and note the webhook URL which should be something like:
echo https://[region]-[project-id].cloudfunctions.net/ext-firestore-stripe-payments-handleWebhookEvents
echo.
pause

echo Step 2: Create a webhook in your Stripe Dashboard
echo.
echo 1. Go to https://dashboard.stripe.com/webhooks
echo 2. Click "Add endpoint"
echo 3. Enter the webhook URL from Step 1
echo 4. Select at least these events to send:
echo    - product.created
echo    - product.updated
echo    - price.created
echo    - price.updated
echo    - checkout.session.completed
echo    - customer.subscription.created
echo    - customer.subscription.updated
echo    - customer.subscription.deleted
echo    - invoice.payment_succeeded
echo    - invoice.payment_failed
echo 5. Create the webhook and copy the "Signing Secret" (starts with whsec_)
echo.
pause

echo Step 3: Update the Firebase extension with your webhook secret
echo.
echo Run this command with your webhook secret from Step 2:
echo firebase ext:configure firestore-stripe-payments --param=stripeWebhookSecret=whsec_your_signing_secret
echo.

echo Step 4: Sync Stripe products with Firestore
echo.
echo After configuring the webhook, you can trigger a product sync by running:
echo firebase ext:update firestore-stripe-payments
echo.
echo When prompted if you want to perform an initial sync, select "Yes"
echo.

echo Complete!
echo Your Stripe webhook should now be properly configured.
echo.
pause
