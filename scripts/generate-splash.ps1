Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$images = Join-Path $projectRoot 'assets/images'
$logo = [System.Drawing.Image]::FromFile((Join-Path $images 'splash-icon.png'))
$fontFile = Join-Path $projectRoot 'node_modules/@expo-google-fonts/inter/800ExtraBold/Inter_800ExtraBold.ttf'
$fonts = [System.Drawing.Text.PrivateFontCollection]::new()
$fonts.AddFontFile($fontFile)

try {
  foreach ($variant in @(
    @{ Name = 'splash-brand-light.png'; Color = '#0D2E49' },
    @{ Name = 'splash-brand-dark.png'; Color = '#F2F6F9' }
  )) {
    $bitmap = [System.Drawing.Bitmap]::new(800, 200, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $font = [System.Drawing.Font]::new($fonts.Families[0], 96, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
    $brush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($variant.Color))
    $format = [System.Drawing.StringFormat]::new()

    try {
      $graphics.Clear([System.Drawing.Color]::Transparent)
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
      $graphics.DrawImage($logo, [System.Drawing.Rectangle]::new(72, 33, 160, 134))
      $format.Alignment = [System.Drawing.StringAlignment]::Near
      $format.LineAlignment = [System.Drawing.StringAlignment]::Center
      $format.FormatFlags = [System.Drawing.StringFormatFlags]::NoWrap
      $graphics.DrawString('CASASEG', $font, $brush, [System.Drawing.RectangleF]::new(256, 0, 544, 200), $format)
      $bitmap.Save((Join-Path $images $variant.Name), [System.Drawing.Imaging.ImageFormat]::Png)
      Write-Output "Generated $($variant.Name)"
    } finally {
      $format.Dispose()
      $brush.Dispose()
      $font.Dispose()
      $graphics.Dispose()
      $bitmap.Dispose()
    }
  }
} finally {
  $logo.Dispose()
  $fonts.Dispose()
}
