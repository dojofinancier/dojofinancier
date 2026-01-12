# PowerShell script to run Next.js dev server and filter source map warnings
$env:NODE_OPTIONS = "--no-warnings"

# Start Next.js dev server
& npx next dev 2>&1 | Where-Object {
    $_ -notmatch "Invalid source map" -and 
    $_ -notmatch "sourceMapURL could not be parsed" -and
    $_ -notmatch "Only conformant source maps"
}

