# Workout Template Library Seed Script

This script populates your Firestore database with **7 foundational muscle-specific workout templates** that use exercises from your exercise library.

## What's Included

### 📊 Workout Template Breakdown:
1. **Chest Development** (6 exercises, ~50 mins)
   - Barbell & Dumbbell pressing variations
   - Isolation flyes for complete chest development

2. **Arms (Biceps & Triceps)** (7 exercises, ~45 mins)
   - Multiple curl variations for biceps
   - Compound and isolation tricep work

3. **Shoulder Development** (7 exercises, ~50 mins)
   - All 3 deltoid heads (front, side, rear)
   - Overhead pressing + isolation raises

4. **Back - Lats & Width** (6 exercises, ~55 mins)
   - Lat-focused with vertical pulling emphasis
   - Builds V-taper and back width

5. **Back - Upper & Thickness** (6 exercises, ~50 mins)
   - Horizontal pulling focus
   - Rhomboids, traps, back density

6. **Lower Body Development** (8 exercises, ~60 mins)
   - Complete leg workout
   - Quads, hamstrings, glutes, calves

7. **Core & Abs** (6 exercises, ~30 mins)
   - Comprehensive core workout
   - Dynamic movements + isometric holds

### 🎯 Each Workout Template Includes:
- Name & detailed description
- Exercise references (linked to your exercise library)
- Estimated duration
- Difficulty level (intermediate)
- Category (strength)
- Target muscle groups
- Required equipment list
- Tags for filtering and organization
- Company scope (accessible to all trainers)

## Prerequisites

1. **Exercise Library Must Exist First**
   - Run `seed-exercises.js` BEFORE running this script
   - This script looks up exercises by name to get their IDs
   - Missing exercises will be skipped with warnings

2. **Firebase Admin SDK Setup**
   - Ensure `service-account-key.json` is in your project root

3. **Node.js**
   - Make sure Node.js is installed

4. **User ID**
   - You need your Firebase user ID (found in Firebase Console → Authentication)

## Usage

### Step 1: Navigate to Project Root
```bash
cd c:/Users/shrey/OneDrive/Documents/GitHub/ShreyasFitnessWeb-FirebaseENHANCED
```

### Step 2: Run the Script
```bash
node firebase/scripts/seed-workouts.js YOUR_USER_ID
```

### Example:
```bash
node firebase/scripts/seed-workouts.js uWdwR622tkOiShVzLBjFqvsOqPZ2
```

## What Happens

The script will:
1. Connect to your Firestore database
2. Fetch your trainer name from Firestore
3. Look up each exercise by name to get exercise IDs
4. Create 7 workout templates with exercise references
5. Show detailed progress for each workout
6. Report success/failure with summary

## Expected Output

```
🏋️ Starting workout template library seed...

📝 User ID: abc123def456
🔍 Fetching trainer name from Firestore...
✅ Found in admins collection: Shreyas Anand
👤 User Name: Shreyas Anand
📊 Total workout templates to create: 7

🔍 Fetching exercise IDs from Firestore...

📋 Processing workout 1/7: Chest Development
   Fetching 6 exercises...
   ✓ Found: Barbell Bench Press
   ✓ Found: Incline Barbell Bench Press
   ✓ Found: Dumbbell Bench Press
   ✓ Found: Incline Dumbbell Press
   ✓ Found: Dumbbell Chest Flyes
   ✓ Found: Cable Chest Flyes
✅ [1/7] Created: Chest Development (6 exercises)

...

✅ [7/7] Created: Core & Abs (6 exercises)

🎉 Seed completed!
✅ Successfully created: 7 workout templates

📚 Your workout template library is now ready to use!
💡 Next step: Go to your trainer dashboard → Workouts tab to view and assign workouts
```

## After Running

1. Go to your trainer dashboard
2. Navigate to "Workouts" tab
3. You should see all 7 workout templates
4. Each template shows:
   - Exercise count
   - Estimated duration
   - Difficulty level
   - Target muscle groups
5. Click "Assign to Client" to configure sets/reps/weight per client
6. Or use "Edit" to customize the workout template

## Important Notes

### Templates are Blueprints Only
- **Templates don't include sets/reps/weight** - just exercise references
- You configure those when assigning to specific clients
- This allows the same template to be customized per client's level

### Exercise Lookup Process
- Script queries exercises by exact name match
- If an exercise name doesn't match exactly, it will be skipped
- Check console output for any missing exercises
- Workout will still be created with found exercises

### Scope & Visibility
- All workouts set to "company" scope (visible to all trainers)
- Active by default
- Usage count starts at 0, increments when assigned to clients

## Troubleshooting

### Error: "No exercises found - cannot create workout template"
- This means NONE of the exercises for that workout were found
- Run `seed-exercises.js` first to populate the exercise library
- Check that exercise names match exactly (case-sensitive)

### Warning: "Only found X/Y exercises"
- Some exercises were found, some weren't
- Workout will still be created with found exercises
- Check exercise library for missing exercises
- May need to manually add missing exercises

### Error: "Exercise not found: [Exercise Name]"
- Specific exercise wasn't found in library
- Check spelling and capitalization
- Verify exercise was added by seed-exercises.js
- Manually add the exercise if needed

### Error: "Missing required argument"
- Make sure you provide User ID
- Example: `node firebase/scripts/seed-workouts.js abc123`

### Error: "Could not find trainer with ID"
- Check that user exists in admins or trainers collection
- Verify User ID is correct
- Ensure Firebase configuration is correct

## Customization

Want to add more workouts? Edit the `workoutTemplates` array in `seed-workouts.js`:

```javascript
{
  name: 'Your Workout Name',
  description: 'Detailed description...',
  exercises: [
    'Exercise Name 1',  // Must match exact name in exercises collection
    'Exercise Name 2',
    // ...
  ],
  estimatedDuration: 45,  // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  category: 'strength' | 'cardio' | 'hiit' | 'flexibility' | 'mixed',
  targetMuscleGroups: ['Muscle 1', 'Muscle 2'],
  equipment: ['Equipment 1', 'Equipment 2'],
  tags: ['tag1', 'tag2', 'tag3']
}
```

## Running Multiple Times

- Script doesn't check for duplicates
- Running twice will create duplicate workout templates
- Manually delete duplicates from Workouts tab if needed
- Consider this a one-time setup script

## Next Steps

After seeding workouts:
1. **Review** each template in your dashboard
2. **Customize** if needed (edit from Workouts tab)
3. **Assign** to clients with specific sets/reps/weight
4. **Build more** templates as you need them for specific programs

## Need Help?

If you encounter issues:
1. Check console output for specific error messages
2. Verify exercises collection is populated (run seed-exercises.js first)
3. Ensure proper Firebase permissions
4. Check that exercise names match exactly

---

**Pro Tip:** These 7 workouts give you a solid foundation for most training programs. You can create variations and more specific workouts through the UI as needed!