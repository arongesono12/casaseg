Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$images = Join-Path $projectRoot 'assets/images'
$logo = [System.Drawing.Image]::FromFile((Join-Path $images 'splash-icon.png'))
$fontFile = Join-Path $projectRoot 'node_modules/@expo-google-fonts/inter/800ExtraBold/Inter_800ExtraBold.ttf'
$fonts = [System.Drawing.Text.PrivateFontCollection]::new()
$fonts.AddFontFile($fontFile)

try {
  foreach ($variant in @(
    @{ Name = 'splash-brand-light.png'; Color = '#0D2E49'; SloganColor = '#526579' },
    @{ Name = 'splash-brand-dark.png'; Color = '#F2F6F9'; SloganColor = '#BACBD7' }
  )) {
    $bitmap = [System.Drawing.Bitmap]::new(600, 310, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $font = [System.Drawing.Font]::new($fonts.Families[0], 96, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
    $sloganFont = [System.Drawing.Font]::new($fonts.Families[0], 35, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
    $brush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($variant.Color))
    $sloganBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($variant.SloganColor))
    $format = [System.Drawing.StringFormat]::new()

    try {
      $graphics.Clear([System.Drawing.Color]::Transparent)
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
      $graphics.DrawImage($logo, [System.Drawing.Rectangle]::new(220, 16, 160, 134))
      $format.Alignment = [System.Drawing.StringAlignment]::Center
      $format.LineAlignment = [System.Drawing.StringAlignment]::Center
      $format.FormatFlags = [System.Drawing.StringFormatFlags]::NoWrap
      $graphics.DrawString('CasasEG', $font, $brush, [System.Drawing.RectangleF]::new(0, 132, 600, 140), $format)
      $graphics.DrawString('Líderes en conectar hogares', $sloganFont, $sloganBrush, [System.Drawing.RectangleF]::new(0, 230, 600, 65), $format)
      $bitmap.Save((Join-Path $images $variant.Name), [System.Drawing.Imaging.ImageFormat]::Png)
      Write-Output "Generated $($variant.Name)"
    } finally {
      $format.Dispose()
      $sloganBrush.Dispose()
      $brush.Dispose()
      $sloganFont.Dispose()
      $font.Dispose()
      $graphics.Dispose()
      $bitmap.Dispose()
    }
  }
} finally {
  $logo.Dispose()
  $fonts.Dispose()
}
