# build.ps1 - Windows PowerShell script to build the AutoCAD plugin
# Run this on a Windows machine with .NET Framework 4.8 SDK installed

param(
    [string]$AutoCADPath = "C:\Program Files\Autodesk\AutoCAD 2024"
)

Write-Host "Building ExtractCoords plugin for Design Automation..." -ForegroundColor Cyan

# Set environment variable for AutoCAD path
$env:AUTOCAD_PATH = $AutoCADPath

# Clean previous build
if (Test-Path ".\bin") {
    Remove-Item -Recurse -Force ".\bin"
}
if (Test-Path ".\obj") {
    Remove-Item -Recurse -Force ".\obj"
}

# Build the project
dotnet build ExtractCoords.csproj -c Release

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Create bundle structure for upload
$bundlePath = ".\bundle\ExtractCoords.bundle"
$contentsPath = "$bundlePath\Contents"

if (Test-Path ".\bundle") {
    Remove-Item -Recurse -Force ".\bundle"
}

New-Item -ItemType Directory -Path $contentsPath -Force | Out-Null

# Copy files
Copy-Item ".\bin\Release\ExtractCoords.dll" -Destination $contentsPath
Copy-Item ".\PackageContents.xml" -Destination $bundlePath

# Copy dependencies (System.Text.Json)
$depsPath = ".\bin\Release"
if (Test-Path "$depsPath\System.Text.Json.dll") {
    Copy-Item "$depsPath\System.Text.Json.dll" -Destination $contentsPath
}

# Create ZIP file for upload
$zipPath = ".\ExtractCoords.bundle.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath
}

Compress-Archive -Path "$bundlePath\*" -DestinationPath $zipPath

Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host "Bundle created: $zipPath" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Upload $zipPath to APS Design Automation as an AppBundle" -ForegroundColor White
Write-Host "2. Create an Activity that uses this AppBundle" -ForegroundColor White
Write-Host "3. Submit WorkItems to process DWG files" -ForegroundColor White
