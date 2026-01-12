# Troubleshooting Learning Activities

## Common Issues and Solutions

### Issue: "Cannot create learning activity" or "Table doesn't exist"

**Most Likely Cause:** Database migration hasn't been run yet.

**Solution:**
1. Run the database migration:
   ```bash
   npx prisma migrate dev --name add_learning_activities_and_phases
   ```
   
   OR if using `prisma db push`:
   ```bash
   npx prisma db push
   ```

2. Regenerate Prisma Client:
   ```bash
   npx prisma generate
   ```

3. Restart your development server:
   ```bash
   npm run dev
   ```

### Issue: TypeScript errors about `prisma.learningActivity`

**Cause:** Prisma Client hasn't been regenerated after schema changes.

**Solution:**
```bash
npx prisma generate
```

### Issue: "Unknown arg `learningActivity`" or similar Prisma errors

**Cause:** The database schema doesn't match the Prisma schema.

**Solution:**
1. Check if migration was applied:
   ```bash
   npx prisma migrate status
   ```

2. If migrations are pending, run:
   ```bash
   npx prisma migrate dev
   ```

3. If using Supabase or direct database access, you may need to manually run the SQL migration.

### Issue: Form validation errors

**Check:**
1. Make sure you've selected a module/chapter
2. Fill in the title
3. For Short Answer activities:
   - Fill in the question field
   - Add at least one acceptable answer

### How to Check Browser Console

1. Open your browser's Developer Tools (F12 or Right-click → Inspect)
2. Go to the "Console" tab
3. Try creating a learning activity
4. Look for any red error messages
5. Copy the error message and share it

### How to Check Terminal/Server Logs

1. Look at your terminal where `npm run dev` is running
2. Check for any error messages when you submit the form
3. Look for Prisma errors, validation errors, or database connection errors

### Testing Database Connection

Run this in your terminal to test if the table exists:
```bash
npx prisma studio
```

Then navigate to the `learningActivity` table. If it doesn't exist, you need to run the migration.

### Quick Diagnostic Checklist

- [ ] Database migration has been run (`npx prisma migrate dev`)
- [ ] Prisma Client has been regenerated (`npx prisma generate`)
- [ ] Development server has been restarted
- [ ] Browser console shows no errors
- [ ] Terminal shows no errors
- [ ] All required form fields are filled
- [ ] Module/chapter is selected

### If Still Not Working

1. **Check the exact error message** from:
   - Browser console (F12 → Console tab)
   - Terminal/server logs
   - Toast notification error message

2. **Verify database state:**
   ```bash
   npx prisma studio
   ```
   Check if `learningActivity` table exists

3. **Check Prisma schema is correct:**
   - Open `prisma/schema.prisma`
   - Verify `LearningActivity` model exists
   - Verify `ContentType` enum includes `LEARNING_ACTIVITY`
   - Verify `StudyPhase` enum exists

4. **Try creating a simple test:**
   - Use Prisma Studio to manually create a ContentItem with type LEARNING_ACTIVITY
   - Then try creating a LearningActivity linked to it

### Expected Error Messages

If you see these errors, here's what they mean:

- **"Unknown arg `learningActivity`"** → Migration not run, regenerate Prisma client
- **"Table 'learning_activities' doesn't exist"** → Migration not run
- **"Cannot read property 'create' of undefined"** → Prisma client not regenerated
- **"Validation error"** → Check form fields are filled correctly
- **"Module is required"** → Select a module/chapter from dropdown


