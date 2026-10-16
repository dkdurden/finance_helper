[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string]$Destination
)

$ErrorActionPreference = "Stop"

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$unresolvedDestination = if ([System.IO.Path]::IsPathRooted($Destination)) {
    $Destination
} else {
    Join-Path (Get-Location).Path $Destination
}
$destinationPath = [System.IO.Path]::GetFullPath($unresolvedDestination)
$repositoryPrefix = $repositoryRoot.TrimEnd(
    [System.IO.Path]::DirectorySeparatorChar,
    [System.IO.Path]::AltDirectorySeparatorChar
) + [System.IO.Path]::DirectorySeparatorChar

if (
    $destinationPath.Equals(
        $repositoryRoot,
        [System.StringComparison]::OrdinalIgnoreCase
    ) -or
    $destinationPath.StartsWith(
        $repositoryPrefix,
        [System.StringComparison]::OrdinalIgnoreCase
    )
) {
    throw "Backup destination must be outside the repository: $repositoryRoot"
}

$composeFile = Join-Path $repositoryRoot "docker-compose.production.yml"
$environmentFile = Join-Path $repositoryRoot ".env.production"

if (-not (Test-Path -LiteralPath $composeFile -PathType Leaf)) {
    throw "Production Compose file not found: $composeFile"
}

if (-not (Test-Path -LiteralPath $environmentFile -PathType Leaf)) {
    throw "Production environment file not found: $environmentFile"
}

New-Item -ItemType Directory -Path $destinationPath -Force | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupName = "finance-helper-$timestamp.dump"
$containerBackupPath = "/tmp/$backupName"
$hostBackupPath = Join-Path $destinationPath $backupName
$partialBackupPath = "$hostBackupPath.partial"
$composeArguments = @(
    "--env-file", $environmentFile,
    "-f", $composeFile
)
$backupAttemptedInContainer = $false

try {
    $dumpArguments = @("compose") + $composeArguments + @(
        "exec", "-T", "db", "sh", "-c",
        'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "$1"',
        "_", $containerBackupPath
    )
    $backupAttemptedInContainer = $true
    & docker @dumpArguments
    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed with exit code $LASTEXITCODE."
    }

    $verifyArguments = @("compose") + $composeArguments + @(
        "exec", "-T", "db", "sh", "-c",
        'pg_restore --list "$1" > /dev/null',
        "_", $containerBackupPath
    )
    & docker @verifyArguments
    if ($LASTEXITCODE -ne 0) {
        throw "pg_restore could not read the backup archive."
    }

    $copyArguments = @("compose") + $composeArguments + @(
        "cp", "db:$containerBackupPath", $partialBackupPath
    )
    & docker @copyArguments
    if ($LASTEXITCODE -ne 0) {
        throw "Copying the database backup failed with exit code $LASTEXITCODE."
    }

    $backupFile = Get-Item -LiteralPath $partialBackupPath
    if ($backupFile.Length -eq 0) {
        throw "The copied database backup is empty: $partialBackupPath"
    }

    Move-Item -LiteralPath $partialBackupPath -Destination $hostBackupPath
    Write-Output "Backup created: $hostBackupPath"
}
catch {
    Remove-Item -LiteralPath $partialBackupPath -Force -ErrorAction SilentlyContinue
    throw
}
finally {
    if ($backupAttemptedInContainer) {
        $cleanupArguments = @("compose") + $composeArguments + @(
            "exec", "-T", "db", "sh", "-c", 'rm -f -- "$1"',
            "_", $containerBackupPath
        )
        & docker @cleanupArguments
        if ($LASTEXITCODE -ne 0) {
            Write-Warning (
                "Could not remove the temporary container backup: " +
                $containerBackupPath
            )
        }
    }
}
