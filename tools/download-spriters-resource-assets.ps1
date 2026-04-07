param(
  [Parameter(Mandatory = $true)]
  [string]$GameUrl,

  [Parameter(Mandatory = $true)]
  [string]$OutputDir,

  [int]$Limit = 0,

  [int]$DelayMs = 150
)

$ErrorActionPreference = 'Stop'

function Normalize-Url {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Url
  )

  $normalized = $Url -replace '^about:', ''
  if ($normalized -match '^https?://') {
    return $normalized
  }
  if ($normalized.StartsWith('/')) {
    return "https://www.spriters-resource.com$normalized"
  }
  throw "Unsupported URL format: $Url"
}

function Sanitize-FileName {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  $invalid = [IO.Path]::GetInvalidFileNameChars() + [char[]]':'
  $sanitized = $Name.Trim()
  foreach ($char in $invalid) {
    $sanitized = $sanitized.Replace([string]$char, '_')
  }
  $sanitized = [regex]::Replace($sanitized, '\s+', ' ')
  $sanitized = $sanitized.Trim(' ', '.')
  if ([string]::IsNullOrWhiteSpace($sanitized)) {
    return 'unnamed'
  }
  return $sanitized
}

function Get-AssetRecords {
  param(
    [Parameter(Mandatory = $true)]
    $Page
  )

  $records = [System.Collections.Generic.List[object]]::new()

  foreach ($card in $Page.ParsedHtml.getElementsByClassName('icondisplay')) {
    foreach ($anchor in $card.getElementsByTagName('a')) {
      if ($anchor.className -ne 'iconlink') {
        continue
      }

      $href = Normalize-Url $anchor.href
      if ($href -notmatch '/asset/(?<id>\d+)/') {
        continue
      }

      $header = $anchor.getElementsByClassName('iconheader') | Select-Object -First 1
      $title = if ($null -ne $header) { $header.innerText } else { "asset-$($Matches['id'])" }
      $records.Add([pscustomobject]@{
        AssetId = $Matches['id']
        Title = $title
        AssetPageUrl = $href
      })
    }
  }

  $records |
    Group-Object AssetId |
    ForEach-Object { $_.Group | Select-Object -First 1 }
}

function Get-DownloadUrl {
  param(
    [Parameter(Mandatory = $true)]
    [string]$AssetPageUrl
  )

  $assetPage = Invoke-WebRequest $AssetPageUrl
  $downloadLink = $assetPage.Links | Where-Object { $_.id -eq 'download' } | Select-Object -First 1
  if ($null -ne $downloadLink -and $downloadLink.href) {
    return Normalize-Url $downloadLink.href
  }

  $assetDisplay = $assetPage.ParsedHtml.getElementById('assetdisplay')
  if ($null -eq $assetDisplay) {
    throw "No download link found for $AssetPageUrl"
  }

  $image = $assetDisplay.getElementsByTagName('img') | Select-Object -First 1
  if ($null -eq $image -or [string]::IsNullOrWhiteSpace($image.src)) {
    throw "No image found for $AssetPageUrl"
  }

  return Normalize-Url $image.src
}

$resolvedOutput = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputDir)
New-Item -ItemType Directory -Force -Path $resolvedOutput | Out-Null

Write-Host "Fetching game page: $GameUrl"
$page = Invoke-WebRequest $GameUrl
$assets = @(Get-AssetRecords $page)

if ($Limit -gt 0) {
  $assets = @($assets | Select-Object -First $Limit)
}

Write-Host "Assets queued: $($assets.Count)"

$index = 0
foreach ($asset in $assets) {
  $index += 1
  $safeTitle = Sanitize-FileName $asset.Title
  $prefix = '{0:D4}' -f $index

  try {
    $downloadUrl = Get-DownloadUrl $asset.AssetPageUrl
    $uri = [Uri]$downloadUrl
    $ext = [IO.Path]::GetExtension($uri.AbsolutePath)
    if ([string]::IsNullOrWhiteSpace($ext)) {
      $ext = '.bin'
    }

    $target = Join-Path $resolvedOutput "$prefix`__$($asset.AssetId)`__$safeTitle$ext"
    if (Test-Path $target) {
      Write-Host "[$index/$($assets.Count)] skip $safeTitle"
      continue
    }

    Write-Host "[$index/$($assets.Count)] download $safeTitle"
    Invoke-WebRequest $downloadUrl -OutFile $target
  } catch {
    Write-Warning "Failed: $($asset.AssetPageUrl) :: $($_.Exception.Message)"
  }

  if ($DelayMs -gt 0) {
    Start-Sleep -Milliseconds $DelayMs
  }
}

Write-Host "Done. Output: $resolvedOutput"
