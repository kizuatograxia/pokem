param(
  [string]$SourceDir = "C:\users\hedge\onedrive\desktop\pokem\sources\spriters-resource\pokemonblackwhite-full",
  [string]$ProjectRoot = "C:\users\hedge\onedrive\desktop\pokem"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

function Get-ComparableKey {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Value
  )

  $normalized = $Value.ToUpperInvariant()
  $normalized = $normalized.Replace("♀", "FE").Replace("♂", "MA")
  $normalized = $normalized.Replace("É", "E")
  $normalized = [regex]::Replace($normalized, "[^A-Z0-9]", "")
  return $normalized
}

function Get-CanonicalMaps {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FrontDir
  )

  $baseByComparable = @{}
  $femaleByBase = @{}

  foreach ($file in Get-ChildItem $FrontDir -File) {
    $stem = [IO.Path]::GetFileNameWithoutExtension($file.Name)
    if ($stem -match "_\d+$" -or $stem -match "_female$") {
      if ($stem -match "^(.*)_female$") {
        $femaleByBase[$Matches[1]] = $stem
      }
      continue
    }

    $baseByComparable[(Get-ComparableKey $stem)] = $stem
  }

  $baseByComparable["NIDORANFE"] = "NIDORANfE"
  $baseByComparable["NIDORANMA"] = "NIDORANmA"
  $baseByComparable["PRIMAPE"] = "PRIMEAPE"

  return @{
    BaseByComparable = $baseByComparable
    FemaleByBase = $femaleByBase
  }
}

function Get-VariantSuffixMaps {
  return @{
    BASCULIN = @{
      RED = 0
      BLUE = 1
    }
    BURMY = @{
      PLANT = 0
      SANDY = 1
      TRASH = 2
    }
    CASTFORM = @{
      SUNNY = 1
      RAINY = 2
      SNOWY = 3
    }
    CHERRIM = @{
      OVERCAST = 0
      SUNSHINE = 1
    }
    DARMANITAN = @{
      ZENMODE = 1
    }
    DEERLING = @{
      SPRING = 0
      SUMMER = 1
      AUTUMN = 2
      WINTER = 3
    }
    DEOXYS = @{
      ATTACK = 1
      DEFENSE = 2
      SPEED = 3
    }
    GASTRODON = @{
      WEST = 0
      EAST = 1
    }
    GIRATINA = @{
      ALTERED = 0
      ORIGIN = 1
    }
    MELOETTA = @{
      ARIAFORME = 0
      PIROUETTEFORME = 1
    }
    ROTOM = @{
      HEAT = 1
      WASH = 2
      FROST = 3
      FAN = 4
      MOW = 5
    }
    SAWSBUCK = @{
      SPRING = 0
      SUMMER = 1
      AUTUMN = 2
      WINTER = 3
    }
    SHAYMIN = @{
      LAND = 0
      SKY = 1
    }
    SHELLOS = @{
      WEST = 0
      EAST = 1
    }
    WORMADAM = @{
      PLANT = 0
      SANDY = 1
      TRASH = 2
    }
  }
}

function Resolve-CanonicalStem {
  param(
    [Parameter(Mandatory = $true)]
    [string]$DisplaySpecies,
    [string]$Variant,
    [Parameter(Mandatory = $true)]
    [hashtable]$BaseByComparable,
    [Parameter(Mandatory = $true)]
    [hashtable]$FemaleByBase,
    [Parameter(Mandatory = $true)]
    [hashtable]$VariantSuffixMaps
  )

  $baseComparable = Get-ComparableKey $DisplaySpecies
  if ($DisplaySpecies -eq "Nidoran♀") {
    return "NIDORANfE"
  }
  if ($DisplaySpecies -eq "Nidoran♂") {
    return "NIDORANmA"
  }
  if (-not $BaseByComparable.ContainsKey($baseComparable)) {
    throw "No canonical base sprite stem for species '$DisplaySpecies'"
  }

  $baseStem = $BaseByComparable[$baseComparable]
  if ([string]::IsNullOrWhiteSpace($Variant)) {
    return $baseStem
  }

  $variantComparable = Get-ComparableKey $Variant
  if ($variantComparable -eq "MALE") {
    return $baseStem
  }

  if ($variantComparable -eq "FEMALE") {
    if ($FemaleByBase.ContainsKey($baseStem)) {
      return $FemaleByBase[$baseStem]
    }
    return $baseStem
  }

  if (-not $VariantSuffixMaps.ContainsKey($baseStem)) {
    throw "No variant suffix map for '$DisplaySpecies' variant '$Variant'"
  }

  $speciesVariantMap = $VariantSuffixMaps[$baseStem]
  if (-not $speciesVariantMap.ContainsKey($variantComparable)) {
    throw "Unknown variant '$Variant' for '$DisplaySpecies'"
  }

  $suffix = [int]$speciesVariantMap[$variantComparable]
  if ($suffix -eq 0) {
    return $baseStem
  }

  return "${baseStem}_$suffix"
}

function Get-ImageBands {
  param(
    [Parameter(Mandatory = $true)]
    [System.Drawing.Bitmap]$Bitmap
  )

  $bgArgb = $Bitmap.GetPixel(0, 0).ToArgb()
  $bands = [System.Collections.Generic.List[object]]::new()
  $current = $null

  for ($y = 0; $y -lt $Bitmap.Height; $y++) {
    $active = 0
    $minX = $Bitmap.Width
    $maxX = -1

    for ($x = 0; $x -lt $Bitmap.Width; $x++) {
      if ($Bitmap.GetPixel($x, $y).ToArgb() -ne $bgArgb) {
        $active++
        if ($x -lt $minX) { $minX = $x }
        if ($x -gt $maxX) { $maxX = $x }
      }
    }

    if ($active -gt 0) {
      if ($null -eq $current) {
        $current = [ordered]@{
          StartY = $y
          EndY = $y
          MinX = $minX
          MaxX = $maxX
          Pixels = $active
        }
      } else {
        $current.EndY = $y
        if ($minX -lt $current.MinX) { $current.MinX = $minX }
        if ($maxX -gt $current.MaxX) { $current.MaxX = $maxX }
        $current.Pixels += $active
      }
    } elseif ($null -ne $current) {
      $bands.Add([pscustomobject]$current)
      $current = $null
    }
  }

  if ($null -ne $current) {
    $bands.Add([pscustomobject]$current)
  }

  $bands |
    Where-Object {
      ($_.EndY - $_.StartY + 1) -ge 18 -and
      ($_.MaxX - $_.MinX + 1) -ge 120 -and
      $_.StartY -ge 35
    } |
    Sort-Object StartY
}

function Get-ImageBandsInRange {
  param(
    [Parameter(Mandatory = $true)]
    [System.Drawing.Bitmap]$Bitmap,
    [Parameter(Mandatory = $true)]
    [int]$Top,
    [Parameter(Mandatory = $true)]
    [int]$Bottom
  )

  $bgArgb = $Bitmap.GetPixel(0, 0).ToArgb()
  $bands = [System.Collections.Generic.List[object]]::new()
  $current = $null

  for ($y = $Top; $y -le $Bottom; $y++) {
    $active = 0
    $minX = $Bitmap.Width
    $maxX = -1

    for ($x = 0; $x -lt $Bitmap.Width; $x++) {
      if ($Bitmap.GetPixel($x, $y).ToArgb() -ne $bgArgb) {
        $active++
        if ($x -lt $minX) { $minX = $x }
        if ($x -gt $maxX) { $maxX = $x }
      }
    }

    if ($active -gt 0) {
      if ($null -eq $current) {
        $current = [ordered]@{
          StartY = $y
          EndY = $y
          MinX = $minX
          MaxX = $maxX
          Pixels = $active
        }
      } else {
        $current.EndY = $y
        if ($minX -lt $current.MinX) { $current.MinX = $minX }
        if ($maxX -gt $current.MaxX) { $current.MaxX = $maxX }
        $current.Pixels += $active
      }
    } elseif ($null -ne $current) {
      $bands.Add([pscustomobject]$current)
      $current = $null
    }
  }

  if ($null -ne $current) {
    $bands.Add([pscustomobject]$current)
  }

  return $bands |
    Where-Object {
      ($_.EndY - $_.StartY + 1) -ge 8 -and
      ($_.MaxX - $_.MinX + 1) -ge 20
    } |
    Sort-Object StartY
}

function Get-NonBackgroundRows {
  param(
    [Parameter(Mandatory = $true)]
    [System.Drawing.Bitmap]$Bitmap
  )

  $bgArgb = $Bitmap.GetPixel(0, 0).ToArgb()
  $rows = [System.Collections.Generic.List[object]]::new()

  for ($y = 0; $y -lt $Bitmap.Height; $y++) {
    $active = 0
    for ($x = 0; $x -lt $Bitmap.Width; $x++) {
      if ($Bitmap.GetPixel($x, $y).ToArgb() -ne $bgArgb) {
        $active++
      }
    }

    $rows.Add([pscustomobject]@{
      Y = $y
      Active = $active
    })
  }

  return $rows
}

function Get-WidestActiveColumnGroup {
  param(
    [Parameter(Mandatory = $true)]
    [System.Drawing.Bitmap]$Bitmap,
    [Parameter(Mandatory = $true)]
    [int]$Top,
    [Parameter(Mandatory = $true)]
    [int]$Bottom
  )

  $bgArgb = $Bitmap.GetPixel(0, 0).ToArgb()
  $columnCounts = [System.Collections.Generic.List[object]]::new()
  for ($x = 0; $x -lt $Bitmap.Width; $x++) {
    $active = 0
    for ($y = $Top; $y -le $Bottom; $y++) {
      if ($Bitmap.GetPixel($x, $y).ToArgb() -ne $bgArgb) {
        $active++
      }
    }

    $columnCounts.Add([pscustomobject]@{
      X = $x
      Active = $active
    })
  }

  $threshold = [Math]::Max(2, [Math]::Floor(($Bottom - $Top + 1) * 0.06))
  $groups = [System.Collections.Generic.List[object]]::new()
  $current = $null
  $lastActiveX = -9999
  $mergeGap = 12

  foreach ($column in $columnCounts) {
    if ($column.Active -ge $threshold) {
      if ($null -eq $current -or ($column.X - $lastActiveX) -gt $mergeGap) {
        if ($null -ne $current) {
          $groups.Add([pscustomobject]$current)
        }
        $current = [ordered]@{
          StartX = $column.X
          EndX = $column.X
          Sum = $column.Active
        }
      } else {
        $current.EndX = $column.X
        $current.Sum += $column.Active
      }
      $lastActiveX = $column.X
    } elseif ($null -ne $current) {
      continue
    }
  }

  if ($null -ne $current) {
    $groups.Add([pscustomobject]$current)
  }

  if ($groups.Count -eq 0) {
    return $null
  }

  return $groups |
    Sort-Object @{ Expression = { $_.EndX - $_.StartX } ; Descending = $true }, @{ Expression = { $_.Sum } ; Descending = $true } |
    Select-Object -First 1
}

function Save-Crop {
  param(
    [Parameter(Mandatory = $true)]
    [System.Drawing.Bitmap]$Bitmap,
    [Parameter(Mandatory = $true)]
    [System.Drawing.Rectangle]$Rect,
    [Parameter(Mandatory = $true)]
    [string]$TargetPath
  )

  $clone = $Bitmap.Clone($Rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $clone.MakeTransparent($Bitmap.GetPixel(0, 0))
  $clone.Save($TargetPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $clone.Dispose()
}

function Export-BattlerSheets {
  param(
    [Parameter(Mandatory = $true)]
    [string]$SourcePath,
    [Parameter(Mandatory = $true)]
    [string]$CanonicalStem,
    [Parameter(Mandatory = $true)]
    [string]$RawDir,
    [Parameter(Mandatory = $true)]
    [string]$FrontDir,
    [Parameter(Mandatory = $true)]
    [string]$BackDir
  )

  $rawTarget = Join-Path $RawDir "$CanonicalStem.png"
  Copy-Item $SourcePath $rawTarget -Force

  $bitmap = [System.Drawing.Bitmap]::FromFile($SourcePath)
  try {
    $rows = @(Get-NonBackgroundRows $bitmap | Where-Object { $_.Y -ge 35 -and $_.Active -gt 0 })
    if ($rows.Count -eq 0) {
      throw "No non-background rows after header"
    }

    $minY = ($rows | Measure-Object Y -Minimum).Minimum
    $maxY = ($rows | Measure-Object Y -Maximum).Maximum
    $height = $maxY - $minY + 1
    $searchStart = $minY + [Math]::Floor($height * 0.35)
    $searchEnd = $minY + [Math]::Floor($height * 0.7)
    $candidateRows = $rows | Where-Object { $_.Y -ge $searchStart -and $_.Y -le $searchEnd }
    if ($candidateRows.Count -eq 0) {
      throw "No midpoint rows found"
    }

    $splitY = ($candidateRows | Sort-Object Active, Y | Select-Object -First 1).Y
    $frontTop = $minY
    $frontBottom = $splitY
    $backTop = $splitY + 1
    $backBottom = $maxY

    if ($frontBottom -le $frontTop -or $backBottom -le $backTop) {
      throw "Invalid front/back split at row $splitY"
    }

    $frontBands = @(Get-ImageBandsInRange $bitmap $frontTop $frontBottom)
    $backBands = @(Get-ImageBandsInRange $bitmap $backTop $backBottom)
    if ($frontBands.Count -eq 0 -or $backBands.Count -eq 0) {
      throw "Unable to detect front/back animation rows"
    }

    $preferredFrontBands = @(
      $frontBands | Where-Object {
        ($_.EndY - $_.StartY + 1) -ge 16 -and
        ($_.MaxX - $_.MinX + 1) -ge 48 -and
        $_.Pixels -ge 300
      }
    )
    $preferredBackBands = @(
      $backBands | Where-Object {
        ($_.EndY - $_.StartY + 1) -ge 16 -and
        ($_.MaxX - $_.MinX + 1) -ge 48 -and
        $_.Pixels -ge 300
      }
    )

    $frontBand = if ($preferredFrontBands.Count -gt 0) {
      $preferredFrontBands | Sort-Object StartY | Select-Object -First 1
    } else {
      $frontBands | Sort-Object @{ Expression = { $_.Pixels } ; Descending = $true }, StartY | Select-Object -First 1
    }

    $backBand = if ($preferredBackBands.Count -gt 0) {
      $preferredBackBands | Sort-Object StartY | Select-Object -First 1
    } else {
      $backBands | Sort-Object @{ Expression = { $_.Pixels } ; Descending = $true }, StartY | Select-Object -First 1
    }

    $frontRect = [System.Drawing.Rectangle]::FromLTRB($frontBand.MinX, $frontBand.StartY, $frontBand.MaxX + 1, $frontBand.EndY + 1)
    $backRect = [System.Drawing.Rectangle]::FromLTRB($backBand.MinX, $backBand.StartY, $backBand.MaxX + 1, $backBand.EndY + 1)

    Save-Crop $bitmap $frontRect (Join-Path $FrontDir "$CanonicalStem.png")
    Save-Crop $bitmap $backRect (Join-Path $BackDir "$CanonicalStem.png")
  } finally {
    $bitmap.Dispose()
  }
}

$frontDir = Join-Path $ProjectRoot "client\web\public\assets\sprites\pokemon\front"
$canonicalMaps = Get-CanonicalMaps $frontDir
$variantSuffixMaps = Get-VariantSuffixMaps

$pokemonRoot = Join-Path $ProjectRoot "sources\spriters-resource\pokemonblackwhite-pokemon"
$battlerRawDir = Join-Path $pokemonRoot "battlers-raw"
$atlasDir = Join-Path $pokemonRoot "atlases"
$partsDir = Join-Path $pokemonRoot "parts"
$animatedFrontDir = Join-Path $ProjectRoot "client\web\public\assets\sprites\pokemon\animated\front"
$animatedBackDir = Join-Path $ProjectRoot "client\web\public\assets\sprites\pokemon\animated\back"
$reportJson = Join-Path $pokemonRoot "manifest.json"
$reportMd = Join-Path $pokemonRoot "README.md"

foreach ($dir in @($pokemonRoot, $battlerRawDir, $atlasDir, $partsDir, $animatedFrontDir, $animatedBackDir)) {
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

$manifest = [ordered]@{
  sourceDir = $SourceDir
  generatedAt = (Get-Date).ToString("s")
  counts = [ordered]@{
    totalFiles = 0
    battlerSheets = 0
    battleAtlases = 0
    battleParts = 0
    animatedFront = 0
    animatedBack = 0
    unresolved = 0
  }
  unresolved = @()
  battlers = @()
  atlases = @()
  parts = @()
}

foreach ($file in Get-ChildItem $SourceDir -File | Sort-Object Name) {
  $manifest.counts.totalFiles++
  $stem = [IO.Path]::GetFileNameWithoutExtension($file.Name)

  if ($stem -match "^\d+__\d+__#\d+\s+(?<species>.+?)(?:\s+\((?<variant>[^)]+)\))?$") {
    try {
      $species = $Matches["species"].Trim()
      $variant = $Matches["variant"]
      $canonicalStem = Resolve-CanonicalStem $species $variant $canonicalMaps.BaseByComparable $canonicalMaps.FemaleByBase $variantSuffixMaps

      Export-BattlerSheets $file.FullName $canonicalStem $battlerRawDir $animatedFrontDir $animatedBackDir

      $manifest.counts.battlerSheets++
      $manifest.counts.animatedFront++
      $manifest.counts.animatedBack++
      $manifest.battlers += [ordered]@{
        source = $file.Name
        species = $species
        variant = $variant
        canonical = "$canonicalStem.png"
      }
    } catch {
      $manifest.counts.unresolved++
      $manifest.unresolved += [ordered]@{
        source = $file.Name
        reason = $_.Exception.Message
      }
    }
    continue
  }

  if ($stem -match "Generation" -or $stem -match "Parts") {
    if ($stem -match "Parts") {
      Copy-Item $file.FullName (Join-Path $partsDir $file.Name) -Force
      $manifest.counts.battleParts++
      $manifest.parts += $file.Name
    } else {
      Copy-Item $file.FullName (Join-Path $atlasDir $file.Name) -Force
      $manifest.counts.battleAtlases++
      $manifest.atlases += $file.Name
    }
  }
}

$json = $manifest | ConvertTo-Json -Depth 6
Set-Content -Path $reportJson -Value $json -Encoding UTF8

$summary = @(
  "# Spriters Resource Pokemon Black/White Import"
  ""
  "Counts"
  "- Total files scanned: $($manifest.counts.totalFiles)"
  "- Battler sheets copied: $($manifest.counts.battlerSheets)"
  "- Battle atlases copied: $($manifest.counts.battleAtlases)"
  "- Battle parts sheets copied: $($manifest.counts.battleParts)"
  "- Animated front sheets exported: $($manifest.counts.animatedFront)"
  "- Animated back sheets exported: $($manifest.counts.animatedBack)"
  "- Unresolved battlers: $($manifest.counts.unresolved)"
  ""
  "Folders"
  "- Raw battler sheets: $battlerRawDir"
  "- Atlas sheets: $atlasDir"
  "- Parts sheets: $partsDir"
  "- Animated front sheets: $animatedFrontDir"
  "- Animated back sheets: $animatedBackDir"
  "- Manifest: $reportJson"
)

if ($manifest.counts.unresolved -gt 0) {
  $summary += ""
  $summary += "Unresolved"
  foreach ($entry in $manifest.unresolved) {
    $summary += "- $($entry.source): $($entry.reason)"
  }
}

Set-Content -Path $reportMd -Value $summary -Encoding UTF8
Write-Host "Done. Report: $reportMd"
