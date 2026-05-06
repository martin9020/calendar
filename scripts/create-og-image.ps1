Add-Type -AssemblyName System.Drawing

$outPath = Join-Path (Split-Path -Parent $PSScriptRoot) "public\og-calendar.png"
$width = 1200
$height = 630

$bmp = New-Object System.Drawing.Bitmap $width, $height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

function Brush($hex) {
  return New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($hex))
}

function Pen($hex, $size = 1) {
  return New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml($hex)), $size
}

function RoundRectPath($x, $y, $w, $h, $r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function FillRoundRect($x, $y, $w, $h, $r, $brush) {
  $path = RoundRectPath $x $y $w $h $r
  $g.FillPath($brush, $path)
  $path.Dispose()
}

function StrokeRoundRect($x, $y, $w, $h, $r, $pen) {
  $path = RoundRectPath $x $y $w $h $r
  $g.DrawPath($pen, $path)
  $path.Dispose()
}

$bg = Brush "#f6f2ec"
$green = Brush "#1f5634"
$green2 = Brush "#2f7046"
$white = Brush "#ffffff"
$cream = Brush "#fbfaf7"
$muted = Brush "#dfe8df"
$text = Brush "#14321f"
$subtle = Brush "#62705f"
$red = Brush "#e8604c"
$yellow = Brush "#e8a820"
$gray = Brush "#6b7280"

$g.FillRectangle($bg, 0, 0, $width, $height)

FillRoundRect 42 42 1116 546 34 $white
FillRoundRect 42 42 1116 150 34 $green
$g.FillRectangle($green, 42, 126, 1116, 66)

$titleFont = New-Object System.Drawing.Font "Segoe UI", 42, ([System.Drawing.FontStyle]::Bold)
$subtitleFont = New-Object System.Drawing.Font "Segoe UI", 21, ([System.Drawing.FontStyle]::Regular)
$smallFont = New-Object System.Drawing.Font "Segoe UI", 18, ([System.Drawing.FontStyle]::Regular)
$monthFont = New-Object System.Drawing.Font "Segoe UI", 28, ([System.Drawing.FontStyle]::Bold)
$dayFont = New-Object System.Drawing.Font "Segoe UI", 16, ([System.Drawing.FontStyle]::Bold)
$chipFont = New-Object System.Drawing.Font "Segoe UI", 14, ([System.Drawing.FontStyle]::Bold)

FillRoundRect 88 82 46 46 8 (Brush "#b8d7ff")
$g.FillRectangle((Brush "#7a5ee8"), 88, 82, 46, 14)
FillRoundRect 96 100 8 8 2 (Brush "#ffffff")
FillRoundRect 111 100 8 8 2 (Brush "#ffffff")
FillRoundRect 96 113 8 8 2 (Brush "#ffffff")
FillRoundRect 111 113 8 8 2 (Brush "#ffffff")
$g.DrawString("Резервации", $titleFont, $white, 150, 64)
$g.DrawString("Споделен календар за резервации", $subtitleFont, $white, 94, 124)
$g.DrawString("избор на няколко дати • обща база • CSV импорт/експорт", $smallFont, (Brush "#cfe0d3"), 94, 156)

FillRoundRect 860 76 230 56 14 $green2
$g.DrawString("Отворен достъп", $smallFont, $white, 884, 91)

FillRoundRect 82 222 1036 306 18 $cream
StrokeRoundRect 82 222 1036 306 18 (New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#eadfce"), 2))

$g.DrawString("Май 2026", $monthFont, $text, 530, 244)

$days = @("Пон","Вт","Ср","Чет","Пет","Съб","Нед")
$gridX = 122
$gridY = 308
$cellW = 136
$cellH = 72
for ($i = 0; $i -lt 7; $i++) {
  $g.DrawString($days[$i], $dayFont, $green, $gridX + $i*$cellW + 46, 282)
}

for ($row = 0; $row -lt 3; $row++) {
  for ($col = 0; $col -lt 7; $col++) {
    $x = $gridX + $col*$cellW
    $y = $gridY + $row*$cellH
    FillRoundRect $x $y 124 60 10 $white
    StrokeRoundRect $x $y 124 60 10 (New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#eadfce"), 1))
  }
}

$reservationDays = @(
  @{ day="7"; col=3; row=1; name="Иван"; phone="088 123 4567"; color=$red },
  @{ day="8"; col=4; row=1; name="Мария"; phone="089 555 0011"; color=$red },
  @{ day="9"; col=5; row=1; name="Георги"; phone="087 777 1212"; color=$red }
)

foreach ($item in $reservationDays) {
  $x = $gridX + [int]$item.col*$cellW
  $y = $gridY + [int]$item.row*$cellH
  FillRoundRect $x $y 124 60 10 (Brush "#fff7d7")
  StrokeRoundRect $x $y 124 60 10 (New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml("#e8a820"), 3))
  $g.DrawString($item.day, $smallFont, $text, $x + 8, $y + 4)
  FillRoundRect ($x + 8) ($y + 26) 108 26 6 $item.color
  $g.DrawString($item.name, $chipFont, $white, $x + 13, $y + 28)
}

FillRoundRect 128 466 190 38 10 $red
$g.DrawString("Потвърдена", $smallFont, $white, 158, 473)
FillRoundRect 344 466 150 38 10 $yellow
$g.DrawString("Чакаща", $smallFont, $white, 376, 473)
FillRoundRect 518 466 160 38 10 $gray
$g.DrawString("Отменена", $smallFont, $white, 548, 473)

$g.DrawString("martin9020.github.io/calendar", $smallFont, $subtle, 788, 474)

$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()

Write-Output $outPath


