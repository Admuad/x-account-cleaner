Add-Type -AssemblyName System.Drawing

$srcPath = Resolve-Path "web\public\og-image.jpg"
$destPath = "$srcPath"

$img = [System.Drawing.Image]::FromFile($srcPath)
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }

# Encode at 70% quality (under 200 KB)
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]70)

$ms = New-Object System.IO.MemoryStream
$img.Save($ms, $codec, $encoderParams)
$img.Dispose()

[System.IO.File]::WriteAllBytes($destPath, $ms.ToArray())
$ms.Dispose()

# Create a square 600x600 avatar version for WhatsApp fallback
$img2 = [System.Drawing.Image]::FromFile($srcPath)
$thumb = New-Object System.Drawing.Bitmap(600, 600)
$g = [System.Drawing.Graphics]::FromImage($thumb)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img2, 0, 0, 600, 600)
$pubDir = (Resolve-Path "web\public").Path
$squarePath = [System.IO.Path]::Combine($pubDir, "og-square.jpg")
$thumb.Save($squarePath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
$thumb.Dispose()
$g.Dispose()
$img2.Dispose()

Write-Host "Compressed successfully:"
Get-Item "web\public\og-image.jpg" | Select-Object Name, Length
Get-Item "web\public\og-square.jpg" | Select-Object Name, Length
