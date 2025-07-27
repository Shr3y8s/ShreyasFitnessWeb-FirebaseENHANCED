# Phase 4: Scheduling
## The Shrey Method Fitness Platform Guide

[← Back to Phase 3](Phase3_Payments.md) | [Next: Troubleshooting →](Troubleshooting.md)

---

In this phase, we'll add scheduling capabilities to your fitness platform using Calendly. This will allow:
- Clients to book sessions with you
- You to manage your availability
- Automatic calendar syncing

We'll break this down into small, manageable steps.

## Step 1: Create a Calendly Account

First, you need to create a Calendly account to handle scheduling.

1. Go to [calendly.com](https://calendly.com)
2. Click "Sign up" or "Get started"
3. Follow the sign-up process:
   - Enter your email address
   - Create a password
   - Enter your name
4. Complete the onboarding process:
   - Connect your calendar (Google Calendar, Office 365, etc.)
   - Set your availability
   - Set your time zone

**What's happening here?** You're creating a Calendly account that will handle scheduling for your fitness platform. Calendly is a scheduling tool that will allow clients to book sessions with you based on your availability.

## Step 2: Create Event Types

Now let's create different types of sessions that clients can book.

1. In your Calendly dashboard, click "Create" or "Event Types"
2. Click "New Event Type"
3. Choose "One-on-One" event
4. Create your first event type:
   - Name: "Initial Consultation"
   - Description: "A 30-minute session to discuss your fitness goals and create a plan"
   - Duration: 30 minutes
   - Location: Choose your preferred meeting method (Zoom, Google Meet, In Person, etc.)
   - Set your availability
   - Click "Next" and complete the setup
5. Create a second event type:
   - Name: "Training Session"
   - Description: "A 60-minute personal training session"
   - Duration: 60 minutes
   - Location: Choose your preferred meeting method
   - Set your availability
   - Click "Next" and complete the setup
6. Create a third event type:
   - Name: "Progress Check-In"
   - Description: "A 15-minute session to review your progress and adjust your plan"
   - Duration: 15 minutes
   - Location: Choose your preferred meeting method
   - Set your availability
   - Click "Next" and complete the setup

**What's happening here?** You're creating different types of sessions that clients can book with you. Each event type has its own duration, description, and availability.

## Step 3: Get Your Calendly Integration Code

Now let's get the code to integrate Calendly with your fitness platform.

1. In your Calendly dashboard, click on your profile icon in the top-right corner
2. Select "Integrations"
3. Click on "Add to Website"
4. Choose "Inline Embed"
5. Select the event types you want to include
6. Copy the generated code (we'll use this later)

**What's happening here?** You're getting the code that will allow you to embed Calendly in your fitness platform.

## Step 4: Create Client Scheduling Page

Now let's create the scheduling page that clients will see when they want to book a session with you.

1. Create a new file called `client-schedule.html`
2. Copy and paste this code:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Schedule - The Shrey Method Fitness</title>
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/dashboard.css">
    <script src="https://cdn.jsdelivr.net/npm/aws-amplify@5.0.4/dist/aws-amplify.min.js"></script>
    <!-- Calendly inline widget begin -->
    <script src="https://assets.calendly.com/assets/external/widget.js" type="text/javascript" async></script>
    <!-- Calendly inline widget end -->
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
                    <li><a href="client-payments.html">Payments</a></li>
                    <li class="active"><a href="client-schedule.html">Schedule</a></li>
                </ul>
            </nav>
            <div class="sidebar-footer">
                <button id="logout-btn" class="btn-secondary">Log Out</button>
            </div>
        </div>
        
        <!-- Main content area -->
        <div class="dashboard-content">
            <header class="dashboard-header">
                <h1>Schedule a Session</h1>
                <div class="user-menu">
                    <span id="user-name"></span>
                    <img src="images/default-avatar.jpg" alt="Profile" class="avatar" id="user-avatar">
                </div>
            </header>
            
            <div class="content-container">
                <div class="dashboard-card">
                    <h2>Book Your Session</h2>
                    <p>Select a session type and choose a time that works for you.</p>
                    
                    <!-- Calendly inline widget begin -->
                    <div class="calendly-inline-widget" style="min-width:320px;height:700px;">
                        <!-- Replace the URL below with your actual Calendly URL -->
                        <div id="calendly-widget"></div>
                    </div>
                    <!-- Calendly inline widget end -->
                </div>
            </div>
        </div>
    </div>
    
    <script src="js/client-schedule.js"></script>
</body>
</html>
```

3. Save the file (Ctrl+S or File > Save)

**What's happening here?** You're creating the HTML structure for the scheduling page, which includes an embedded Calendly widget.

## Step 5: Create Client Scheduling JavaScript

Now let's create the JavaScript code that will handle the scheduling functionality.

1. Create a new file called `js/client-schedule.js`
2. Copy and paste this code:

```javascript
// Configure Amplify
const awsConfig = {
    Auth: {
        region: 'us-west-2', // Your AWS region
        userPoolId: 'us-west-2_xxxxxxxx', // Your Cognito User Pool ID
        userPoolWebClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx', // Your App Client ID
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
        const userName = document.getElementById('user-name');
        userName.textContent = user.attributes.name || user.username;
        
        // Initialize Calendly
        initCalendly(user);
        
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
        console.error('Error initializing scheduling page:', error);
    }
});

// Initialize Calendly with user information
function initCalendly(user) {
    // Replace with your actual Calendly URL
    const calendlyUrl = 'https://calendly.com/your-username';
    
    // Get the widget container
    const widget = document.getElementById('calendly-widget');
    
    // Create the Calendly inline widget with prefilled information
    Calendly.initInlineWidget({
        url: calendlyUrl,
        parentElement: widget,
        prefill: {
            name: user.attributes.name || '',
            email: user.attributes.email || '',
        },
        utm: {
            utmSource: 'The Shrey Method Fitness Platform'
        }
    });
}
```

3. Save the file (Ctrl+S or File > Save)
4. Update the configuration values with your actual values (same as in Phase 1, Step 7)
5. Replace `'https://calendly.com/your-username'` with your actual Calendly URL

**What's happening here?** You're creating the JavaScript code that will handle the scheduling functionality, including initializing the Calendly widget with the user's information.

## Step 6: Add CSS for Scheduling Page

Now let's add some CSS styling for the scheduling page.

1. Open `css/dashboard.css`
2. Add this code at the end of the file:

```css
/* Scheduling Styles */
.calendly-inline-widget {
    margin-top: 20px;
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
}
```

3. Save the file (Ctrl+S or File > Save)

**What's happening here?** You're adding some basic CSS styling for the Calendly widget.

## Step 7: Create Coach Scheduling Page

Now let's create a scheduling page for you (as the coach) to manage your availability and view upcoming sessions.

1. Create a new file called `coach-schedule.html`
2. Copy and paste this code:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Schedule - The Shrey Method Fitness</title>
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/dashboard.css">
    <script src="https://cdn.jsdelivr.net/npm/aws-amplify@5.0.4/dist/aws-amplify.min.js"></script>
</head>
<body>
    <div class="dashboard-container">
        <!-- Sidebar navigation (same as coach-dashboard.html) -->
        <div class="dashboard-sidebar">
            <div class="logo">
                <h2>The Shrey Method</h2>
            </div>
            <nav class="dashboard-nav">
                <ul>
                    <li><a href="coach-dashboard.html">Dashboard</a></li>
                    <li><a href="coach-clients.html">Clients</a></li>
                    <li><a href="coach-messages.html">Messages</a></li>
                    <li><a href="coach-programs.html">Programs</a></li>
                    <li class="active"><a href="coach-schedule.html">Schedule</a></li>
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
                <h1>Manage Schedule</h1>
                <div class="user-menu">
                    <span id="user-name"></span>
                    <img src="images/default-avatar.jpg" alt="Profile" class="avatar" id="user-avatar">
                </div>
            </header>
            
            <div class="content-container">
                <div class="dashboard-card">
                    <h2>Upcoming Sessions</h2>
                    <p>View and manage your upcoming sessions.</p>
                    
                    <div class="action-buttons">
                        <a href="https://calendly.com/your-username/event-types" target="_blank" class="btn-primary">Manage Event Types</a>
                        <a href="https://calendly.com/your-username/scheduled-events" target="_blank" class="btn-primary">View All Sessions</a>
                        <a href="https://calendly.com/app/availability" target="_blank" class="btn-primary">Set Availability</a>
                    </div>
                    
                    <div class="upcoming-sessions">
                        <p>Loading upcoming sessions...</p>
                        <p><em>Note: This is a placeholder. In a real implementation, you would fetch and display actual upcoming sessions from the Calendly API.</em></p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script src="js/coach-schedule.js"></script>
</body>
</html>
```

3. Save the file (Ctrl+S or File > Save)
4. Replace `'https://calendly.com/your-username'` with your actual Calendly username in the URLs

**What's happening here?** You're creating the HTML structure for the coach scheduling page, which includes links to manage event types, view scheduled sessions, and set availability.

## Step 8: Create Coach Scheduling JavaScript

Now let's create the JavaScript code for the coach scheduling page.

1. Create a new file called `js/coach-schedule.js`
2. Copy and paste this code:

```javascript
// Configure Amplify
const awsConfig = {
    Auth: {
        region: 'us-west-2', // Your AWS region
        userPoolId: 'us-west-2_xxxxxxxx', // Your Cognito User Pool ID
        userPoolWebClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx', // Your App Client ID
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
        console.error('Error initializing coach scheduling page:', error);
    }
});
```

3. Save the file (Ctrl+S or File > Save)
4. Update the configuration values with your actual values (same as in Phase 1, Step 7)

**What's happening here?** You're creating the JavaScript code for the coach scheduling page, which handles authentication and checks if the user is a coach.

## Step 9: Add CSS for Action Buttons

Now let's add some CSS styling for the action buttons on the coach scheduling page.

1. Open `css/dashboard.css`
2. Add this code at the end of the file:

```css
/* Action Buttons */
.action-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 20px 0;
}

.action-buttons .btn-primary {
    flex: 1;
    min-width: 200px;
    text-align: center;
    text-decoration: none;
    display: inline-block;
}

.upcoming-sessions {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #ddd;
}
```

3. Save the file (Ctrl+S or File > Save)

**What's happening here?** You're adding CSS styling for the action buttons on the coach scheduling page.

## Step 10: Update Navigation Links

Now let's update the navigation links in the dashboard pages to include the scheduling pages.

1. Open `coach-dashboard.html`
2. Find the navigation section and add a link to the scheduling page:
   ```html
   <nav class="dashboard-nav">
       <ul>
           <li class="active"><a href="coach-dashboard.html">Dashboard</a></li>
           <li><a href="coach-clients.html">Clients</a></li>
           <li><a href="coach-messages.html">Messages</a></li>
           <li><a href="coach-programs.html">Programs</a></li>
           <li><a href="coach-schedule.html">Schedule</a></li>
           <li><a href="coach-settings.html">Settings</a></li>
       </ul>
   </nav>
   ```
3. Save the file (Ctrl+S or File > Save)

**What's happening here?** You're updating the navigation links in the coach dashboard to include a link to the scheduling page.

## Step 11: Test the Scheduling Pages

Now let's test your scheduling pages to make sure everything works correctly.

1. Open your website in a browser:
   - Right-click on `client-login.html` in VS Code
   - Select "Open with Live Server" (if you have the Live Server extension)
   - Or open the file directly in your browser
2. Log in with a client account:
   - Navigate to the Schedule page
   - You should see the Calendly widget
   - Try booking a session
3. Log in with your coach account:
   - Navigate to the Schedule page
   - You should see the links to manage your Calendly account
   - Click on the links to make sure they open the correct Calendly pages

**What's happening here?** You're testing the scheduling pages to make sure they work correctly for both clients and coaches.

## Step 12: Set Up Email Notifications

Now let's set up email notifications for when clients book sessions.

1. Go to your Calendly dashboard
2. Click on your profile icon in the top-right corner
3. Select "Account Settings"
4. Click on "Notifications"
5. Configure your email notification preferences:
   - Enable "New event scheduled"
   - Enable "Event canceled"
   - Enable "Event rescheduled"
6. Click "Save"

**What's happening here?** You're setting up email notifications so that you'll be notified when clients book, cancel, or reschedule sessions.

## Next Steps

In this phase, we've integrated Calendly with your fitness platform to add scheduling capabilities. In a real-world scenario, you would now:

1. Customize the Calendly event types further:
   - Add custom questions to gather information from clients before sessions
   - Set up buffer times between sessions
   - Configure automatic reminders

2. Integrate the Calendly API more deeply:
   - Fetch and display upcoming sessions directly in your platform
   - Allow clients to cancel or reschedule sessions from within your platform
   - Sync session information with your client database

However, for the purposes of this guide, we've covered the essential steps to add scheduling capabilities to your fitness platform.

## Congratulations!

You've completed Phase 4 of your fitness platform. You now have scheduling capabilities that allow clients to book sessions with you. This completes the core functionality of your fitness platform!

In the next section, we'll cover troubleshooting common issues that you might encounter while building and using your platform.

---

[← Back to Phase 3](Phase3_Payments.md) | [Next: Troubleshooting →](Troubleshooting.md)
