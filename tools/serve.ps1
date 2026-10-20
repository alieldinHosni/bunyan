# Bunyan — static server for local testing.
# ES modules will not load over file://, and this machine has no node or python.
# Usage: powershell -File tools/serve.ps1 [-Port 8777]
# Serves the project root on localhost only. Never serves source/.
param([int]$Port = 8777)
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$types = @{ ".html"="text/html"; ".js"="text/javascript"; ".mjs"="text/javascript"; ".json"="application/json";
  ".css"="text/css"; ".svg"="image/svg+xml"; ".png"="image/png"; ".jpg"="image/jpeg"; ".webmanifest"="application/manifest+json";
  ".woff2"="font/woff2"; ".ttf"="font/ttf"; ".md"="text/plain" }
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$Port/")
$l.Start()
Write-Host "Serving $root on http://localhost:$Port/"
while ($l.IsListening) {
  $ctx = $l.GetContext()
  $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart("/"))
  if ($rel -eq "") { $rel = "index.html" }
  $path = [IO.Path]::GetFullPath((Join-Path $root $rel))
  $res = $ctx.Response
  $blocked = (-not $path.StartsWith($root)) -or ($rel -match '^(source|\.claude)([/\\]|$)')
  if ($blocked -or -not (Test-Path $path -PathType Leaf)) {
    $res.StatusCode = if ($blocked) { 403 } else { 404 }
  } else {
    $ext = [IO.Path]::GetExtension($path).ToLower()
    $res.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { "application/octet-stream" }
    $bytes = [IO.File]::ReadAllBytes($path)
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
  }
  $res.Close()
}
