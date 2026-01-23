# Exercise Library Seed Script

This script populates your Firestore database with **62 common exercises** across all major muscle groups.

## What's Included

### 📊 Exercise Breakdown:
- **Chest**: 8 exercises (Bench Press variations, Flyes, Dips, Push-ups)
- **Back**: 10 exercises (Rows, Pull-ups, Deadlifts, Face Pulls, Shrugs)
- **Shoulders**: 8 exercises (Presses, Raises, Arnold Press, Upright Rows)
- **Legs**: 12 exercises (Squats, Deadlifts, Lunges, Leg Press, Calf Raises)
- **Arms**: 8 exercises (Curls, Tricep work, Close-Grip Bench)
- **Core**: 6 exercises (Planks, Crunches, Russian Twists, Leg Raises)
- **Cardio**: 6 exercises (Treadmill, Bike, Rowing, Jump Rope, Elliptical)
- **Flexibility**: 4 exercises (Stretches, Cat-Cow, Child's Pose)

### 🎯 Each Exercise Includes:
- Name & common aliases
- Detailed description
- Step-by-step instructions
- Exercise category (strength/cardio/flexibility/core)
- Primary & secondary muscles targeted
- Muscle group classification
- Movement pattern & plane of motion
- Posture & grip type
- Required equipment
- Trainer notes
- Company scope (accessible to all trainers)

## Prerequisites

1. **Firebase Admin SDK Setup**: Ensure `firebase-config.json` is in your project root
2. **Node.js**: Make sure Node.js is installed
3. **User ID**: You need your Firebase user ID (found in Firebase Console under Authentication)

## How to Find Your User ID

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project
3. Click "Authentication" in left sidebar
4. Find your user account
5. Click on the user to see details
6. Copy the "User UID"

## Usage

### Step 1: Navigate to Project Root
```bash
cd c:/Users/shrey/OneDrive/Documents/GitHub/ShreyasFitnessWeb-FirebaseENHANCED
```

### Step 2: Run the Script
```bash
node firebase/scripts/seed-exercises.js YOUR_USER_ID "Your Name"
```

### Example:
```bash
node firebase/scripts/seed-exercises.js abc123def456 "Shreyas Anand"
```

## What Happens

The script will:
1. Connect to your Firestore database
2. Add all 62 exercises one by one
3. Show progress in real-time
4. Report success/failure for each exercise
5. Display a summary at the end

## Expected Output

```
🌱 Starting exercise library seed...

📝 User ID: abc123def456
👤 User Name: Shreyas Anand
📊 Total exercises to add: 62

✅ [1/62] Added: Barbell Bench Press
✅ [2/62] Added: Incline Barbell Bench Press
✅ [3/62] Added: Dumbbell Bench Press
...
✅ [62/62] Added: Shoulder Stretch

🎉 Seed completed!
✅ Successfully added: 62 exercises

📚 Your exercise library is now ready to use!
```

## After Running

1. Go to your trainer dashboard
2. Navigate to "Exercise Library"
3. You should see all 62 exercises
4. Use the filters to explore by category, muscle group, or equipment
5. Start building workouts with your pre-populated library!

## Troubleshooting

### Error: "Missing required arguments"
- Make sure you provide both User ID and Name in quotes
- Example: `node firebase/scripts/seed-exercises.js abc123 "John Doe"`

### Error: "Permission denied"
- Check that `firebase-config.json` exists in project root
- Verify your Firebase service account has Firestore write permissions

### Error: "Already exists"
- The script doesn't check for duplicates
- If you run it twice, you'll have duplicate exercises
- Manually delete duplicates from the Exercise Library page

## Notes

- **Scope**: All exercises are set to "company" scope (accessible by all trainers)
- **Active Status**: All exercises start as active
- **Usage Count**: Starts at 0, increments when used in workouts
- **Timestamps**: CreatedAt and UpdatedAt are set automatically
- **One-Time Use**: Only run this script once to avoid duplicates

## Need Help?

If you encounter any issues:
1. Check the console output for specific error messages
2. Verify your Firebase configuration
3. Ensure you have proper permissions
4. Try with a single exercise first to test connectivity