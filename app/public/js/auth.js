// Flag to prevent redirect during signup process
let isSigningUp = false;
let signupResetTimeout = null;

// Safety function to ensure isSigningUp gets reset
function safelySetSigningUp(value) {
  console.log(`safelySetSigningUp called with value: ${value}`);
  isSigningUp = value;
  
  // Clear any existing timeout
  if (signupResetTimeout) {
    clearTimeout(signupResetTimeout);
    signupResetTimeout = null;
  }
  
  // If setting to true, add a safety timeout to reset it
  if (value === true) {
    signupResetTimeout = setTimeout(() => {
      console.log('Safety timeout: resetting isSigningUp flag');
      isSigningUp = false;
    }, 20000); // Extended to 20 seconds to allow for payment step
  }
}

// Expose this function globally for React components to use
window.safelySetSigningUp = safelySetSigningUp;

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyADF9yuram-pvlzjg6kBtdCk7LuK0M65tk",
  authDomain: "shreyfitweb.firebaseapp.com",
  projectId: "shreyfitweb",
  storageBucket: "shreyfitweb.firebasestorage.app",
  messagingSenderId: "1076359633281",
  appId: "1:1076359633281:web:3687e1675c9e185f0ab080",
  measurementId: "G-5GBP19SXBW"
};

// Track if we're in the process of initializing
let isInitializing = false;

// Initialize Firebase (ensure we don't reinitialize if already done)
let firebaseApp;
if (!firebase.apps.length) {
  isInitializing = true;
  console.log('Initializing Firebase app');
  try {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Firebase initialization error:', error);
    isInitializing = false;
  }
  isInitializing = false;
} else {
  firebaseApp = firebase.app(); // Use existing initialized app
  console.log('Using existing Firebase app');
}

// Auth and Firestore references
const auth = firebase.auth();
const db = firebase.firestore();

// Track authentication state to prevent multiple operations
let isAuthenticating = false;

// Auth state change listener
auth.onAuthStateChanged(user => {
  try {
    if (isInitializing) {
      console.log('Ignoring auth state change during initialization');
      return;
    }
    
    if (isAuthenticating) {
      console.log('Auth state change during authentication process, handling carefully');
    }

    // Check if the URL has a showlogin parameter, which means the user explicitly wants to see the login page
    const urlParams = new URLSearchParams(window.location.search);
    const showLogin = urlParams.get('showlogin') === 'true';
    
    // Only sign out if showlogin=true AND we're not in the middle of a signup process
    if (showLogin && user && !isSigningUp) {
      console.log('User wants to see login page and not in signup process - signing out current user');
      auth.signOut();
      return;
    } else if (showLogin && user && isSigningUp) {
      console.log('Keeping user signed in because signup process is active');
    }

    if (user) {
      // User is signed in
      console.log('User is signed in:', user.uid);
      
      // Check which page we're on
      const currentPage = window.location.pathname.split('/').pop();
      
      console.log('Auth state changed, current page:', currentPage, 'isSigningUp:', isSigningUp);
      
      if ((currentPage === 'account.html' || currentPage === 'signup.html') && !isSigningUp && !showLogin) {
        // No longer redirecting to dashboard
        console.log('User logged in successfully');
        // Stay on current page
      } else if (currentPage === 'signup.html' && isSigningUp) {
        // We're in the signup process, do not redirect
        console.log('In signup process, not redirecting');
      } else if (currentPage === 'dashboard.html' && !isSigningUp) {
        // React dashboard will handle its own data loading via AuthContext
        console.log('On dashboard page, React will handle authentication');
      }
    } else {
      // User is signed out
      console.log('User is signed out');
      
      // No need to check for dashboard page anymore
      console.log('User is signed out');
    }
  } catch (error) {
    console.error('Error in auth state change handler:', error);
  }
});

// Function to load user dashboard data
function loadUserDashboard(user) {
  try {
    // Skip dashboard loading during signup process
    if (isSigningUp) {
      console.log('Skipping dashboard data load during signup');
      return;
    }
    
    console.log('Loading dashboard data for user:', user.uid);
    
    // Make sure we have the user-name element before trying to update it
    const userNameElement = document.getElementById('user-name');
    if (!userNameElement) {
      console.log('user-name element not found, skipping dashboard update');
      return;
    }
    
    // Get user data from Firestore
    db.collection('users').doc(user.uid).get()
      .then(doc => {
        if (doc.exists) {
          const userData = doc.data();
          // Update dashboard with user info
          userNameElement.textContent = userData.name || user.email;
          
          // Here you would load other user-specific data for the dashboard
          // Such as workout plans, session data, etc.
        } else {
          console.log('No user document found for this user');
        }
      })
      .catch(error => {
        console.error('Error loading user dashboard data:', error);
      });
  } catch (error) {
    console.error('Error in loadUserDashboard:', error);
  }
}

// Sign Up Function
function signUp(email, password, name, phone = null) {
  // Prevent multiple concurrent sign-ups
  if (isAuthenticating) {
    console.log('Another authentication operation is in progress');
    return Promise.reject(new Error('Another authentication operation is in progress'));
  }
  
  let userId;
  isAuthenticating = true;
  safelySetSigningUp(true); // Set flag to prevent redirect
  console.log('Starting signup process');
  
  return auth.createUserWithEmailAndPassword(email, password)
    .then(result => {
      console.log('User created successfully');
      userId = result.user.uid;
      
      // Add user to Firestore
      console.log('Adding user to Firestore');
      return db.collection('users').doc(userId).set({
        name: name,
        email: email,
        phone: phone,
        role: 'client', // Default role
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    })
    .then(() => {
      console.log('User data added to Firestore');
      // No longer signing out the user - keep them signed in
      console.log('Keeping user signed in after successful signup');
      
      // Signal success on the current page instead of redirecting
      console.log('Triggering signup success event');
      
// We'll use a custom event to trigger the UI change
      const signupSuccessEvent = new CustomEvent('signupSuccess', {
        detail: { 
          email: email,
          name: name,
          autoLogin: true // Indicate that the user is already logged in
        }
      });
      
      // NOTE: For the React-based signup flow, we'll let the React components
      // dispatch the signupSuccess event at the right time (after payment)
      // Only dispatch this event for non-React flows
      if (!document.querySelector('.signup-form-container')) {
        console.log('Non-React signup flow, dispatching success event');
        document.dispatchEvent(signupSuccessEvent);
      } else {
        console.log('React signup flow detected, letting components handle event dispatch');
      }
      
      // Reset authentication flags after success
      isAuthenticating = false;
      
      // For React flow, we keep isSigningUp true until payment is complete
      // The React components will call safelySetSigningUp(false) when done
      if (!document.querySelector('.signup-form-container')) {
        // Keep the isSigningUp flag active a bit longer to prevent redirects
        console.log('Scheduling signup flag reset');
        setTimeout(() => { 
          safelySetSigningUp(false);
          console.log('Signup flag reset');
        }, 1000);
      }
    })
    .catch(error => {
      console.error('Error during signup process:', error);
      isAuthenticating = false;
      safelySetSigningUp(false); // Reset flag on error too
      throw error; // Re-throw to be caught by calling code
    });
}

// Login Function
function login(email, password, rememberMe) {
  const persistence = rememberMe 
    ? firebase.auth.Auth.Persistence.LOCAL  // Remember user
    : firebase.auth.Auth.Persistence.SESSION; // Until browser closes
    
  return auth.setPersistence(persistence)
    .then(() => {
      return auth.signInWithEmailAndPassword(email, password);
    })
    .then(() => {
      // Don't redirect, just stay on the same page
      console.log('User logged in successfully');
    });
}

// Logout Function
function logout() {
  auth.signOut().then(() => {
    window.location.href = 'account.html';
  });
}

// Password Reset Function
function resetPassword(email) {
  return auth.sendPasswordResetEmail(email);
}

// Google Sign In Function
function signInWithGoogle() {
  // Prevent multiple concurrent sign-ins
  if (isAuthenticating) {
    console.log('Another authentication operation is in progress');
    return Promise.reject(new Error('Another authentication operation is in progress'));
  }
  
  const provider = new firebase.auth.GoogleAuthProvider();
  let isNewUser = false;
  let userEmail = '';
  let userName = '';
  
  isAuthenticating = true;
  safelySetSigningUp(true); // Set flag to prevent redirect
  console.log('Starting Google sign-in process');
  
  return auth.signInWithPopup(provider)
    .then(result => {
      // Store if this is a new user
      isNewUser = result.additionalUserInfo.isNewUser;
      userEmail = result.user.email;
      userName = result.user.displayName;
      
      console.log('Google sign-in successful, isNewUser:', isNewUser);
      
      // Check if this is a new user
      if (isNewUser) {
        // Add user to Firestore
        console.log('Adding new Google user to Firestore');
        return db.collection('users').doc(result.user.uid).set({
          name: userName,
          email: userEmail,
          photo: result.user.photoURL,
          role: 'client', // Default role
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
          console.log('User data added to Firestore');
          // No longer signing out the user - keep them signed in
          console.log('Keeping user signed in after successful Google signup');
          
          // Check if we're on the signup page
          const currentPage = window.location.pathname.split('/').pop();
          console.log('Current page:', currentPage);
          
          if (currentPage === 'signup.html') {
            // Use the same event approach as the regular signup
            console.log('On signup page, triggering success event');
            const signupSuccessEvent = new CustomEvent('signupSuccess', {
              detail: { 
                email: userEmail,
                name: userName,
                autoLogin: true // Indicate that the user is already logged in
              }
            });
            document.dispatchEvent(signupSuccessEvent);
            
            // Reset authentication flag
            isAuthenticating = false;
            
            // Reset signup flag after a delay
            console.log('Scheduling signup flag reset');
            setTimeout(() => { 
              safelySetSigningUp(false);
              console.log('Signup flag reset');
            }, 1000);
          } else {
            // Don't redirect to dashboard
            console.log('Not on signup page, login successful');
            
            // Reset authentication flag
            isAuthenticating = false;
            
            // Reset signup flag after redirection is initiated
            console.log('Scheduling signup flag reset');
            setTimeout(() => { 
              safelySetSigningUp(false);
              console.log('Signup flag reset');
            }, 1000);
          }
          return null; // Return null to end the chain
        });
      } else {
        // Returning user, no redirect to dashboard
        console.log('Returning user, login successful');
        safelySetSigningUp(false); // Reset signup flag
        isAuthenticating = false; // Reset authentication flag
        return null; // Explicit return to end the chain
      }
    })
    .catch(error => {
      console.error('Error during Google sign-in:', error);
      safelySetSigningUp(false); // Reset signup flag
      isAuthenticating = false; // Reset authentication flag
      throw error; // Re-throw to be caught by calling code
    });
}
