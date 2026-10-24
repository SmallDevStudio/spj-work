$ErrorActionPreference = "Stop"

$root = (Get-Location).Path
$src = Join-Path $root "src"

if (-not (Test-Path -LiteralPath (Join-Path $src "app"))) {
  throw "Run this script from the spj-work project root."
}

$componentMoves = [ordered]@{
  "CompanyWorkScheduleClient.jsx" = "company"
  "EmployeeDirectoryClient.jsx" = "employee"
  "EmployeeTable.jsx" = "employee"
  "LeaveCalendarSettingsClient.jsx" = "leave"
  "LeaveTemplateAssignmentClient.jsx" = "leave"
  "LeaveTemplateClient.jsx" = "leave"
  "LeaveTypeCreate.jsx" = "leave"
  "LeaveTypeEditor.jsx" = "leave"
  "LeaveTypeSettingsClient.jsx" = "leave"
  "OrganizationStructureClient.jsx" = "department"
}

$oldComponents = Join-Path $src "components\hr"

foreach ($name in $componentMoves.Keys) {
  $source = Join-Path $oldComponents $name
  $targetDir = Join-Path $src "components\$($componentMoves[$name])"
  $target = Join-Path $targetDir $name

  if ((Test-Path -LiteralPath $source) -and
      (Test-Path -LiteralPath $target)) {
    throw "Both source and target exist: $name"
  }
}

$apiPaths = [ordered]@{
  "/hr/company-work-schedules" = "/company/work-schedules"
  "/hr/employee-company-migration" = "/employee/company-migration"
  "/hr/leave-template-assignments" = "/leave/template-assignments"
  "/hr/leave-entitlement-overrides" = "/leave/entitlement-overrides"
  "/hr/leave-opening-balances" = "/leave/opening-balances"
  "/hr/leave-templates" = "/leave/templates"
  "/hr/leave-types" = "/leave/types"
  "/hr/leave-calendar" = "/leave/calendar"
  "/hr/departments" = "/department"
  "/hr/employees" = "/employee"
}

$utf8 = New-Object System.Text.UTF8Encoding $false

# Update client API files only. Do not rewrite page navigation URLs.
Get-ChildItem -LiteralPath (Join-Path $src "services") `
  -Recurse -File -Filter "*.api.js" |
  ForEach-Object {
    $original = [System.IO.File]::ReadAllText($_.FullName)
    $updated = $original

    foreach ($oldPath in $apiPaths.Keys) {
      $updated = $updated.Replace($oldPath, $apiPaths[$oldPath])
    }

    if ($_.Name -eq "company.api.js") {
      $updated = $updated.Replace('"/companies"', '"/company"')
    }

    if ($updated -cne $original) {
      [System.IO.File]::WriteAllText($_.FullName, $updated, $utf8)
      Write-Host "Updated API client: $($_.FullName)"
    }
  }

# Update explicit versioned API URLs and component imports in source files.
Get-ChildItem -LiteralPath $src -Recurse -File |
  Where-Object {
    $_.Extension -in @(".js", ".jsx", ".mjs", ".ts", ".tsx")
  } |
  ForEach-Object {
    $original = [System.IO.File]::ReadAllText($_.FullName)
    $updated = $original

    foreach ($oldPath in $apiPaths.Keys) {
      $updated = $updated.Replace(
        "/api/v1$oldPath",
        "/api/v1$($apiPaths[$oldPath])"
      )
    }

    $updated = $updated.Replace(
      "/api/v1/companies",
      "/api/v1/company"
    )

    foreach ($name in $componentMoves.Keys) {
      $folder = $componentMoves[$name]

      $updated = $updated.Replace(
        "@/components/hr/$name",
        "@/components/$folder/$name"
      )
    }

    if ($updated -cne $original) {
      [System.IO.File]::WriteAllText($_.FullName, $updated, $utf8)
      Write-Host "Updated source: $($_.FullName)"
    }
  }

foreach ($name in $componentMoves.Keys) {
  $source = Join-Path $oldComponents $name

  if (-not (Test-Path -LiteralPath $source)) {
    continue
  }

  $targetDir = Join-Path $src "components\$($componentMoves[$name])"

  New-Item -ItemType Directory -Path $targetDir -Force |
    Out-Null

  Move-Item -LiteralPath $source -Destination (Join-Path $targetDir $name)

  Write-Host "Moved component: $name"
}

$oldDirs = @(
  "src\components\hr",
  "src\services\hr",
  "src\repositories\hr",
  "src\lib\hr"
)

foreach ($relativePath in $oldDirs) {
  $directory = Join-Path $root $relativePath

  if (-not (Test-Path -LiteralPath $directory)) {
    continue
  }

  $remaining = @(
    Get-ChildItem -LiteralPath $directory -Recurse -File
  )

  if ($remaining.Count -eq 0) {
    Remove-Item -LiteralPath $directory -Recurse -Force
    Write-Host "Removed empty directory: $relativePath"
  } else {
    Write-Warning "Directory contains files and was not removed: $relativePath"

    foreach ($file in $remaining) {
      Write-Warning $file.FullName
    }
  }
}

Write-Host "Migration complete."