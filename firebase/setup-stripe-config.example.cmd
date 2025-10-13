@echo off
echo Setting up Stripe configuration for Firebase Functions...

echo Setting Stripe Secret Key...
call firebase functions:config:set stripe.key="sk_test_your_stripe_secret_key_here"

echo Setting Stripe Webhook Secret...
call firebase functions:config:set stripe.webhook="whsec_your_stripe_webhook_secret_here"

echo Setting Stripe Publishable Key...
call firebase functions:config:set stripe.publishable="pk_test_your_stripe_publishable_key_here"

echo.
echo Configuration complete! Verifying settings...
call firebase functions:config:get

echo.
echo Next steps:
echo 1. Deploy your functions with: firebase deploy --only functions
echo 2. Test the integration using the test cards from STRIPE_TESTING_GUIDE.md
echo.
