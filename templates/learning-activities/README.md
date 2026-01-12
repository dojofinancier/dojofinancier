# Learning Activities CSV Templates

This directory contains CSV templates for uploading learning activities in bulk.

## Usage

1. Download the appropriate template for the activity type you want to create
2. Fill in the template with your data
3. Go to the admin dashboard → Courses → [Your Course] → Activités d'apprentissage
4. Click "Importer CSV" button
5. Select your filled CSV file
6. The activities will be imported automatically

## Template Formats

### 1. SHORT_ANSWER (Réponse courte)

**Columns:**
- `ActivityType`: Must be `SHORT_ANSWER`
- `Module`: Module name (e.g., "Module 1") or exact module title
- `Instructions`: Optional instructions for the student
- `Question`: The question text
- `CorrectAnswer1`: First acceptable answer (required)
- `CorrectAnswer2`: Second acceptable answer (optional)
- `CorrectAnswer3`: Third acceptable answer (optional)

**Example:**
```csv
ActivityType,Module,Instructions,Question,CorrectAnswer1,CorrectAnswer2,CorrectAnswer3
SHORT_ANSWER,Module 1,What is the formula for the future value of an ordinary annuity?,What is the formula for the future value of an ordinary annuity?,FV = PMT × [(1 + r)^n - 1] / r,FV = PMT * [(1 + r)^n - 1] / r,FV=PMT*[(1+r)^n-1]/r
```

### 2. FILL_IN_BLANK (Texte à trous)

**Columns:**
- `ActivityType`: Must be `FILL_IN_BLANK`
- `Module`: Module name
- `Instructions`: Optional instructions
- `Text`: Text with `___` for the blank
- `CorrectAnswer`: The correct answer for the blank

**Example:**
```csv
ActivityType,Module,Instructions,Text,CorrectAnswer
FILL_IN_BLANK,Module 1,Complete the sentence,The guarantee on a segregated fund is usually ___% at maturity if held for the full term.,75
```

### 3. SORTING_RANKING (Tri / Classement)

**Columns:**
- `ActivityType`: Must be `SORTING_RANKING`
- `Module`: Module name
- `Instructions`: Instructions for sorting (e.g., "Order from lowest to highest")
- `Item1`, `Item2`, `Item3`, etc.: Items in the correct order

**Example:**
```csv
ActivityType,Module,Instructions,Item1,Item2,Item3,Item4
SORTING_RANKING,Module 1,Order from lowest to highest volatility,GIC,Bond fund,Equity fund,Options
```

### 4. CLASSIFICATION (Classification)

**Columns:**
- `ActivityType`: Must be `CLASSIFICATION`
- `Module`: Module name
- `Instructions`: Instructions for classification
- `Category1`, `Category2`, etc.: Category names
- `Item1|Category`, `Item2|Category`, etc.: Items in format "Item|Category"

**Example:**
```csv
ActivityType,Module,Instructions,Category1,Category2,Item1|Category,Item2|Category,Item3|Category
CLASSIFICATION,Module 1,Sort into Registered / Non-registered,Registered,Non-registered,"RRSP|Registered","TFSA|Registered","Margin account|Non-registered"
```

### 5. NUMERIC_ENTRY (Calcul numérique)

**Columns:**
- `ActivityType`: Must be `NUMERIC_ENTRY`
- `Module`: Module name
- `Instructions`: Optional instructions
- `Question`: The calculation problem
- `CorrectAnswer`: The correct numeric answer
- `Tolerance`: Optional tolerance (e.g., "0.01" for ±0.01 or "1" for ±1%)

**Example:**
```csv
ActivityType,Module,Instructions,Question,CorrectAnswer,Tolerance
NUMERIC_ENTRY,Module 1,Compute the investment value,Compute the value of $10,000 after 5 years at 5% annual return,12762.82,0.01
```

### 6. TABLE_COMPLETION (Tableau à compléter)

**Columns:**
- `ActivityType`: Must be `TABLE_COMPLETION`
- `Module`: Module name
- `Instructions`: Instructions for filling the table
- `TableJSON`: JSON structure of the table with `headers` and `rows` (use `null` for cells to fill)
- `AnswersJSON`: JSON object mapping cell positions to answers (format: `{"rowIndex_cellIndex": "answer"}`)

**Example:**
```csv
ActivityType,Module,Instructions,TableJSON,AnswersJSON
TABLE_COMPLETION,Module 1,Fill in the missing cells,"{""headers"": [""Product"", ""Risk"", ""Return""], ""rows"": [[""GIC"", ""Low"", null], [""Bond Fund"", null, ""Medium""]]}","{""0_2"": ""Low"", ""1_1"": ""Medium""}"
```

### 7. ERROR_SPOTTING (Détection d'erreur)

**Columns:**
- `ActivityType`: Must be `ERROR_SPOTTING`
- `Module`: Module name
- `Instructions`: Optional instructions
- `IncorrectSolution`: The solution/work that contains errors
- `Question`: The question asking to identify the error
- `CorrectAnswer`: Description of the error

**Example:**
```csv
ActivityType,Module,Instructions,IncorrectSolution,Question,CorrectAnswer
ERROR_SPOTTING,Module 1,Identify the mistake,"A TVM calculation: PV = $10,000, r = 5% annual, n = 10 years, compounded monthly. Using formula: FV = PV × (1 + r)^n = $10,000 × (1 + 0.05)^10 = $16,289",Identify the first mistake in this reasoning,The rate (5% annual) and compounding period (monthly) don't match. Should use monthly rate (5%/12) and monthly periods (10×12).
```

### 8. DEEP_DIVE (Approfondissement)

**Columns:**
- `ActivityType`: Must be `DEEP_DIVE`
- `Module`: Module name
- `Instructions`: Optional instructions
- `Topic`: The topic to explore
- `Question1`, `Question2`, `Question3`: Research questions (at least one required)

**Example:**
```csv
ActivityType,Module,Instructions,Topic,Question1,Question2,Question3
DEEP_DIVE,Module 1,Explore RRSP in detail,RRSP (Registered Retirement Savings Plan),List the pros and cons of RRSP,What is the history/evolution of RRSP in the last 20 years?,What are real life examples of RRSP strategies?
```

## Notes

- All CSV files must have a header row
- Module names can be "Module 1", "Module 2", etc., or the exact module title
- For fields containing commas or quotes, use quotes around the field: `"Field with, comma"`
- Escaped quotes in text will be automatically unescaped (`\'` → `'`, `\"` → `"`)
- Activities are automatically tagged to Phase 2 (Review phase)
- Activities are automatically assigned to the correct module based on the Module column

## Error Handling

If there are errors during import:
- The number of successfully created activities will be shown
- Errors will be logged to the console
- A warning toast will display the number of errors
- Check the browser console for detailed error messages

