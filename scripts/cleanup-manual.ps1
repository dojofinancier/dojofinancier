# Manual Cleanup Script
# Run this script when files are not open in your editor
# This will archive all markdown files except the 3 specified

$ErrorActionPreference = "Stop"

$base = "c:\Users\User\Desktop\Dojo_Financier_App"
$docsDir = Join-Path $base ".cursor\Documents"
$archiveBase = Join-Path $docsDir "archive"

# Create archive structure
$folders = @("performance", "study-plan", "routes", "features", "chats")
foreach ($folder in $folders) {
    $path = Join-Path $archiveBase $folder
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
    }
}
Write-Host "✓ Archive folders ready"

# Files to keep
$keepFiles = @("CONTENT_QUICKSTART_CHECKLIST.md", "CONTENT_GENERATION_STRATEGY.md", "CLEANUP_COMPLETED.md", "CLEANUP_SUMMARY.md")

# Get all markdown files in Documents
$files = Get-ChildItem -Path $docsDir -Filter "*.md" -File | Where-Object { $keepFiles -notcontains $_.Name }

Write-Host "`nMoving $($files.Count) files from Documents..."

$moved = 0
$failed = 0

foreach ($file in $files) {
    $name = $file.Name
    $destFolder = if ($name -match "PERFORMANCE|OPTIMIZATION|PHASE|OPTIMISTIC|REACT_QUERY|TAB_CACHING|BROWSER|FINAL|ADDITIONAL") {
        "performance"
    } elseif ($name -match "STUDY_PLAN|TODAYS_PLAN|ANALYTICS_PROGRESS|SMART_REVIEW") {
        "study-plan"
    } elseif ($name -match "ROUTE|REDIRECT|ENGLISH|COURSE_SLUG") {
        "routes"
    } else {
        "features"
    }
    
    $destPath = Join-Path $archiveBase $destFolder
    $destFile = Join-Path $destPath $name
    
    try {
        # Check if destination already exists
        if (Test-Path $destFile) {
            Write-Host "  ⚠ Skipping $name (already in archive)"
            Remove-Item $file.FullName -Force
            continue
        }
        
        Move-Item -Path $file.FullName -Destination $destFile -Force -ErrorAction Stop
        $moved++
        Write-Host "  ✓ Moved: $name"
    } catch {
        $failed++
        Write-Host "  ✗ Failed: $name - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Move root files
Write-Host "`nMoving root-level files..."
$rootFiles = @(
    "WEBHOOK_IMPLEMENTATION_SUMMARY.md",
    "WEBHOOK_ARCHITECTURE_ANALYSIS.md",
    "WEBHOOKS_SETUP.md",
    "IMPLEMENTATION_SUMMARY.md",
    "AVAILABILITY_SYSTEM_CHANGES.md",
    "LEARNING_ACTIVITIES_IMPLEMENTATION.md",
    "STUDENT_LEARNING_ACTIVITIES_IMPLEMENTATION.md",
    "TROUBLESHOOTING_LEARNING_ACTIVITIES.md",
    "README_GOOGLE_ANALYTICS.md",
    "about.md",
    "prompts.md"
)

foreach ($f in $rootFiles) {
    $src = Join-Path $base $f
    if (Test-Path $src) {
        $dest = Join-Path $archiveBase "features"
        $destFile = Join-Path $dest $f
        try {
            if (Test-Path $destFile) {
                Write-Host "  ⚠ Skipping $f (already in archive)"
                Remove-Item $src -Force
                continue
            }
            Move-Item -Path $src -Destination $destFile -Force -ErrorAction Stop
            $moved++
            Write-Host "  ✓ Moved root: $f"
        } catch {
            $failed++
            Write-Host "  ✗ Failed root $f - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# Move chats folder
Write-Host "`nMoving chats folder..."
$chatsSrc = Join-Path $base "chats"
if (Test-Path $chatsSrc) {
    $chatsDest = Join-Path $archiveBase "chats"
    try {
        if (Test-Path $chatsDest) {
            Write-Host "  ⚠ Chats folder already in archive, removing original"
            Remove-Item $chatsSrc -Recurse -Force
        } else {
            Move-Item -Path $chatsSrc -Destination $chatsDest -Force -ErrorAction Stop
            Write-Host "  ✓ Moved chats folder"
        }
    } catch {
        Write-Host "  ✗ Failed chats - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n" + "="*50
Write-Host "Summary:"
Write-Host "  Files moved: $moved"
Write-Host "  Files failed: $failed"
Write-Host "="*50

if ($failed -eq 0) {
    Write-Host "`n✓ Cleanup completed successfully!" -ForegroundColor Green
} else {
    Write-Host "`n⚠ Some files failed to move. Close any open editors and run again." -ForegroundColor Yellow
}
