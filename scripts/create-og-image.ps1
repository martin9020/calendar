Add-Type -AssemblyName System.Drawing

$outPath = Join-Path (Split-Path -Parent $PSScriptRoot) "public\og-beach-calendar.png"
$width = 1200
$height = 630

$bmp = New-Object System.Drawing.Bitmap $width, $height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

function Color($hex, [int]$alpha = 255) {
  $color = [System.Drawing.ColorTranslator]::FromHtml($hex)
  return [System.Drawing.Color]::FromArgb($alpha, $color)
}

function Brush($hex, [int]$alpha = 255) {
  return [System.Drawing.SolidBrush]::new((Color $hex $alpha))
}

function Pen($hex, [int]$size = 1, [int]$alpha = 255) {
  return [System.Drawing.Pen]::new((Color $hex $alpha), $size)
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

function DrawCentered($textValue, $font, $brush, $x, $y, $w) {
  $size = $g.MeasureString($textValue, $font)
  $g.DrawString($textValue, $font, $brush, $x + (($w - $size.Width) / 2), $y)
}

$canvas = [System.Drawing.Rectangle]::new(0, 0, $width, $height)
$background = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
  $canvas,
  (Color "#86d8f1"),
  (Color "#f5cf86"),
  [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
)
$blend = [System.Drawing.Drawing2D.ColorBlend]::new()
$blend.Positions = [single[]]@(0.0, 0.34, 0.35, 0.63, 0.64, 1.0)
$blend.Colors = [System.Drawing.Color[]]@(
  (Color "#8adcf5"),
  (Color "#d7f4ff"),
  (Color "#2bb7c8"),
  (Color "#178f9f"),
  (Color "#f3d18a"),
  (Color "#e9b56f")
)
$background.InterpolationColors = $blend
$g.FillRectangle($background, $canvas)

$green = Brush "#1f5634"
$white = Brush "#ffffff"
$text = Brush "#14321f"
$muted = Brush "#59705f"
$red = Brush "#e8604c"
$yellow = Brush "#e8a820"
$gray = Brush "#6b7280"

$titleFont = [System.Drawing.Font]::new("Segoe UI", 52, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$subtitleFont = [System.Drawing.Font]::new("Segoe UI", 25, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$smallFont = [System.Drawing.Font]::new("Segoe UI", 19, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$smallBoldFont = [System.Drawing.Font]::new("Segoe UI", 19, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$monthFont = [System.Drawing.Font]::new("Segoe UI", 31, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$dayFont = [System.Drawing.Font]::new("Segoe UI", 15, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$dateFont = [System.Drawing.Font]::new("Segoe UI", 16, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$chipFont = [System.Drawing.Font]::new("Segoe UI", 11, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$microFont = [System.Drawing.Font]::new("Segoe UI", 9, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)

$g.FillEllipse((Brush "#ffe49b" 235), 94, 62, 118, 118)
$g.FillEllipse((Brush "#fff4c7" 115), 69, 37, 168, 168)

for ($y = 276; $y -le 390; $y += 38) {
  $wavePen = Pen "#ffffff" 4 125
  for ($x = -80; $x -lt ($width + 80); $x += 132) {
    $g.DrawArc($wavePen, $x, $y, 124, 34, 0, 180)
  }
  $wavePen.Dispose()
}

$shorePen = Pen "#ffffff" 14 170
$g.DrawBezier($shorePen, -40, 412, 230, 382, 470, 454, 760, 418)
$g.DrawBezier($shorePen, 690, 420, 830, 402, 1000, 446, 1240, 412)
$shorePen.Dispose()

$sandShade = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
  [System.Drawing.Rectangle]::new(0, 430, $width, 200),
  (Color "#f6dca5" 120),
  (Color "#c98753" 130),
  [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
)
$g.FillRectangle($sandShade, 0, 430, $width, 200)

$umbrellaPole = Pen "#8b5e3c" 8 220
$g.DrawLine($umbrellaPole, 214, 408, 254, 570)
$umbrellaPole.Dispose()
$g.FillPie((Brush "#f25f5c" 235), 112, 352, 220, 122, 198, 144)
$g.FillPie((Brush "#f6bd2f" 230), 158, 352, 128, 122, 208, 124)
$g.FillPie((Brush "#2ec4b6" 225), 204, 352, 128, 122, 212, 126)

FillRoundRect 56 54 420 224 30 (Brush "#082418" 165)
FillRoundRect 88 86 58 58 10 (Brush "#b8d7ff")
$g.FillRectangle((Brush "#7a5ee8"), 88, 86, 58, 17)
for ($iconRow = 0; $iconRow -lt 2; $iconRow++) {
  for ($iconCol = 0; $iconCol -lt 3; $iconCol++) {
    FillRoundRect (99 + $iconCol * 14) (112 + $iconRow * 15) 8 8 2 (Brush "#ffffff")
  }
}
$g.DrawString("Резервации", $titleFont, $white, 164, 78)
$g.DrawString("Споделен календар за резервации", $subtitleFont, $white, 88, 154)
$g.DrawString("избор на няколко дати  •  обща база", $smallFont, (Brush "#d8ecdf"), 88, 190)
FillRoundRect 88 226 162 34 11 (Brush "#e8604c")
$g.DrawString("Потвърдена", $smallBoldFont, $white, 112, 232)
FillRoundRect 266 226 132 34 11 (Brush "#e8a820")
$g.DrawString("Чакаща", $smallBoldFont, $white, 293, 232)

FillRoundRect 552 88 592 466 30 (Brush "#092116" 55)
FillRoundRect 530 66 592 466 30 (Brush "#ffffff" 242)
FillRoundRect 530 66 592 94 30 (Brush "#1f5634" 246)
$g.FillRectangle((Brush "#1f5634" 246), 530, 112, 592, 48)
$g.DrawString("Май 2026", $monthFont, $white, 748, 96)

$days = @("Пон", "Вт", "Ср", "Чет", "Пет", "Съб", "Нед")
$gridX = 584
$labelY = 178
$gridY = 206
$cellW = 70
$cellH = 52
for ($i = 0; $i -lt 7; $i++) {
  DrawCentered $days[$i] $dayFont $green ($gridX + $i * $cellW) $labelY 64
}

$reservations = @{}
$reservations[7] = @{ name = "Иван"; phone = "088 123 4567" }
$reservations[8] = @{ name = "Мария"; phone = "089 555 0011" }
$reservations[9] = @{ name = "Георги"; phone = "087 777 1212" }
$offset = 4

for ($day = 1; $day -le 31; $day++) {
  $index = $day + $offset - 1
  $row = [math]::Floor($index / 7)
  $col = $index % 7
  $x = $gridX + $col * $cellW
  $y = $gridY + $row * $cellH
  $isReservation = $reservations.ContainsKey($day)

  if ($isReservation) {
    FillRoundRect $x $y 64 46 9 (Brush "#ffe8e4")
    StrokeRoundRect $x $y 64 46 9 (Pen "#e8604c" 3)
  } else {
    FillRoundRect $x $y 64 46 9 (Brush "#ffffff")
    StrokeRoundRect $x $y 64 46 9 (Pen "#e5d8c5" 1)
  }

  $g.DrawString([string]$day, $dateFont, $text, $x + 7, $y + 4)

  if ($isReservation) {
    $info = $reservations[$day]
    FillRoundRect ($x + 6) ($y + 20) 52 20 5 $red
    $g.DrawString($info.name, $chipFont, $white, $x + 10, $y + 20)
    $g.DrawString($info.phone, $microFont, $white, $x + 10, $y + 34)
  }
}

FillRoundRect 586 488 132 30 9 $red
$g.DrawString("Потвърдена", $dayFont, $white, 608, 494)
FillRoundRect 736 488 104 30 9 $yellow
$g.DrawString("Чакаща", $dayFont, $white, 759, 494)
FillRoundRect 858 488 116 30 9 $gray
$g.DrawString("Отменена", $dayFont, $white, 879, 494)

$g.DrawString("martin9020.github.io/calendar", $smallFont, $muted, 62, 564)

$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()

Write-Output $outPath

