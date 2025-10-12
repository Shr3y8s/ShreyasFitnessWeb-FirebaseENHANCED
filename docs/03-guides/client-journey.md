# Updated Client Journey: Two-Tier Consultation Approach

This document outlines the revised client journey with the updated payment and consultation flow.

## Two Distinct Consultation Types

### 1. Initial 15-Min Free Consultation
- **Purpose:** Quick introduction, assess fit, answer basic questions
- **When:** Before any commitment
- **How:** Scheduled through your current Calendly embed
- **Goal:** Generate interest and qualify leads
- **Important:** No payment is collected during this consultation

### 2. In-Depth 30-Min Planning Consultation
- **Purpose:** Deep dive into client struggles and create a personalized plan
- **When:** After signing up for a service/program and making payment
- **How:** Scheduled through their client dashboard
- **Goal:** Set up the client for success with a detailed roadmap

## Updated Client Journey

### 1. Discovery Phase
- Visitor explores your site
- Books the free 15-min consultation through public Calendly
- Attends the short call where you briefly assess their needs

### 2. Commitment Phase
- Client decides to work with you
- Creates an account on the signup page
- Selects a service tier during the signup process
- Makes payment as part of the signup process
- Account is created upon successful payment

### 3. Onboarding Phase
- Client logs into their new dashboard
- Is prompted to schedule their 30-min planning consultation
- System shows your availability specifically for these longer sessions
- Client selects a time that works for them

### 4. Program Phase
The client's journey after the 30-min consultation varies based on their selected service tier:

#### For In-Person Training Clients:
- No written workout plan is needed (since training is done in-person)
- Client is directed to book actual training sessions via Calendly on their dashboard
- Payment is processed per-session through the dashboard via Stripe
- Client can book individual sessions ($70/session) or save with 4-session packages ($240, $60/session)

#### For Online Coaching Clients:
- You create comprehensive written workout and nutrition plans
- Client accesses these plans through their dashboard
- Regular check-ins and adjustments follow
- Monthly subscription payments are already set up during signup

#### For Complete Transformation Clients:
- You create comprehensive written workout and nutrition plans
- Client accesses these plans through their dashboard
- Client is also directed to book in-person training sessions via Calendly
- Monthly subscription is already set up during signup
- Additional per-session payments are processed when booking sessions

## Technical Implementation

To support this flow, your platform needs:

### 1. Signup Process Enhancement
- Multi-step signup form:
  - Step 1: Account information (name, email, etc.)
  - Step 2: Service tier selection with pricing information
  - Step 3: Payment processing
  - Step 4: Confirmation and account creation

### 2. Two Different Calendly Links/Embeds
- Public page: 15-min consultation link (as you have now)
- Client dashboard: Special 30-min planning session link (only for paying clients)

### 3. Dashboard Notification System
- When a client first logs in, show a prominent prompt to book their 30-min session
- Include a "Getting Started" checklist with the 30-min consultation as the first step

### 4. Program Delivery Timeline
- Set expectation that their custom plan will be available X days after their 30-min consultation
- Add a countdown or status indicator on their dashboard

## Key Changes from Previous Approach

1. **Payment Timing:** 
   - **Previous:** Client might pay during or after the 15-min consultation
   - **Updated:** Client selects tier and pays during the account creation process

2. **Consultation Sequencing:**
   - **Previous:** Potential ambiguity about when consultations happen
   - **Updated:** Clear separation - free 15-min consultation before signup, 30-min planning consultation after signup and payment

3. **Dashboard Experience:**
   - **Previous:** No clear next steps for new users
   - **Updated:** Clear prompt for new users to schedule their 30-min planning consultation
