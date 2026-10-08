Add-Type -AssemblyName System.Drawing

$reviewDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$ink = [System.Drawing.Color]::FromArgb(9, 17, 25)

foreach ($screen in @('perfil', 'mensajes', 'guardados')) {
  $before = [System.Drawing.Image]::FromFile((Join-Path $reviewDirectory "$screen-antes.png"))
  $after = [System.Drawing.Image]::FromFile((Join-Path $reviewDirectory "$screen-despues.png"))
  $canvas = [System.Drawing.Bitmap]::new(820, 900)
  $graphics = [System.Drawing.Graphics]::FromImage($canvas)
  $font = [System.Drawing.Font]::new('Segoe UI', 17, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  try {
    $graphics.Clear($ink)
    $graphics.DrawString('ANTES', $font, [System.Drawing.Brushes]::White, 10, 10)
    $graphics.DrawString('DESPUÉS', $font, [System.Drawing.Brushes]::White, 420, 10)
    $graphics.DrawImage($before, 10, 44, 390, 844)
    $graphics.DrawImage($after, 420, 44, 390, 844)
    $canvas.Save((Join-Path $reviewDirectory "$screen-comparativa.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $font.Dispose()
    $graphics.Dispose()
    $canvas.Dispose()
    $before.Dispose()
    $after.Dispose()
  }
}
