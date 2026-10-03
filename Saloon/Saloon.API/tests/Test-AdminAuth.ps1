$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
$projectRoot = Split-Path -Parent $PSScriptRoot
$project = Join-Path $projectRoot 'Salon.API.csproj'
$database = 'SalonAuthTest_' + [Guid]::NewGuid().ToString('N')
$connection = "Server=localhost;Database=$database;Trusted_Connection=True;TrustServerCertificate=True;"
$baseUrl = 'http://localhost:5098/api'
$originalConnection = $env:ConnectionStrings__DefaultConnection
$originalEnvironment = $env:ASPNETCORE_ENVIRONMENT
$apiProcess = $null
$client = $null
$anonymous = $null

function Assert-Status($response, $expected, $label) {
    if ([int]$response.StatusCode -ne $expected) {
        throw "$label failed: expected $expected, got $([int]$response.StatusCode): $($response.Content.ReadAsStringAsync().Result)"
    }
    Write-Output "PASS: $label"
}

function Send-Request($httpClient, $method, $path, $data, $useCsrf = $true) {
    $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::new($method), "$baseUrl$path")
    if ($method -ne 'GET' -and $useCsrf) {
        $csrf = $httpClient.GetAsync("$baseUrl/auth/csrf").Result
        $token = ($csrf.Content.ReadAsStringAsync().Result | ConvertFrom-Json).token
        $request.Headers.Add('X-CSRF-Token', $token)
    }
    if ($null -ne $data) {
        $request.Content = [System.Net.Http.StringContent]::new(($data | ConvertTo-Json -Compress), [Text.Encoding]::UTF8, 'application/json')
    }
    return $httpClient.SendAsync($request).Result
}

try {
    & dotnet ef database update --no-build --configuration AdminUpdate --project $project --connection $connection
    if ($LASTEXITCODE -ne 0) { throw 'Test database migration failed.' }
    $env:ConnectionStrings__DefaultConnection = $connection
    $env:ASPNETCORE_ENVIRONMENT = 'Development'
    $dll = Join-Path $projectRoot 'bin\AdminUpdate\net10.0\Salon.API.dll'
    $apiProcess = Start-Process -FilePath 'dotnet' -ArgumentList @($dll, '--urls', 'http://localhost:5098') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru
    $handler = [System.Net.Http.HttpClientHandler]::new()
    $handler.CookieContainer = [System.Net.CookieContainer]::new()
    $client = [System.Net.Http.HttpClient]::new($handler)
    $anonymous = [System.Net.Http.HttpClient]::new()
    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        try {
            $response = $client.GetAsync("$baseUrl/auth/status").Result
            if ($response.IsSuccessStatusCode) { $ready = $true; break }
        } catch { }
        Start-Sleep -Milliseconds 500
    }
    if (!$ready) { throw 'Test API did not start on port 5098.' }
    $status = $response.Content.ReadAsStringAsync().Result | ConvertFrom-Json
    if (!$status.setupRequired -or !$status.setupAllowed) { throw 'Expected local first-run setup.' }
    Write-Output 'PASS: Local first-run setup available'
    Assert-Status (Send-Request $anonymous 'GET' '/salonservices' $null) 200 'Public service browsing'
    $service = @{ name = 'Auth Test'; description = 'Temporary integration test'; category = 'Gents'; price = 10; durationMinutes = 30; isActive = $true }
    foreach ($method in @('POST', 'PUT', 'DELETE')) {
        $path = if ($method -eq 'POST') { '/salonservices' } else { '/salonservices/1' }
        Assert-Status (Send-Request $anonymous $method $path $service $false) 401 "Anonymous $method denied"
    }
    $credentials = @{ username = 'test-owner'; password = [Guid]::NewGuid().ToString('N') }
    Assert-Status (Send-Request $client 'POST' '/auth/setup' $credentials $false) 400 'Setup requires CSRF token'
    Assert-Status (Send-Request $client 'POST' '/auth/setup' @{ username='test-owner'; password='short' }) 400 'Weak setup password rejected'
    $response = Send-Request $client 'POST' '/auth/setup' $credentials
    Assert-Status $response 200 'Owner account creation'
    $cookie = $handler.CookieContainer.GetCookies([Uri]$baseUrl) | Where-Object Name -eq 'Salon.Admin'
    if (!$cookie.HttpOnly) { throw 'Admin cookie must be HttpOnly.' }
    $user = ($response.Content.ReadAsStringAsync().Result | ConvertFrom-Json)
    if ($user.role -ne 'Admin') { throw 'Admin role missing.' }
    Assert-Status (Send-Request $client 'POST' '/auth/setup' $credentials) 409 'Repeated setup denied'
    Assert-Status (Send-Request $client 'POST' '/salonservices' $service $false) 400 'Authenticated write requires CSRF token'
    $response = Send-Request $client 'POST' '/salonservices' $service
    Assert-Status $response 201 'Admin creates service'
    $created = $response.Content.ReadAsStringAsync().Result | ConvertFrom-Json
    $service.id = $created.id
    $service.category = 'Ladies'
    Assert-Status (Send-Request $client 'PUT' "/salonservices/$($created.id)" $service) 204 'Admin updates service'
    Assert-Status (Send-Request $client 'DELETE' "/salonservices/$($created.id)" $null) 204 'Admin deletes service'
    Assert-Status (Send-Request $client 'POST' '/auth/logout' $null) 204 'Logout'
    Assert-Status (Send-Request $client 'POST' '/salonservices' $service) 401 'Writes denied after logout'
    # Restart only the test API to reset its in-memory rate limiter.
    Stop-Process -Id $apiProcess.Id -Force
    $apiProcess.WaitForExit()
    $apiProcess = Start-Process -FilePath 'dotnet' -ArgumentList @($dll, '--urls', 'http://localhost:5098') -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru
    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        try { if ($client.GetAsync("$baseUrl/auth/status").Result.IsSuccessStatusCode) { $ready = $true; break } } catch { }
        Start-Sleep -Milliseconds 500
    }
    if (!$ready) { throw 'Test API did not restart.' }
    Assert-Status (Send-Request $client 'POST' '/auth/login' @{username='test-owner'; password='wrong-password'}) 401 'Invalid credentials rejected'
    Assert-Status (Send-Request $client 'POST' '/auth/login' $credentials) 200 'Existing owner login'
    foreach ($attempt in 1..3) { Assert-Status (Send-Request $client 'POST' '/auth/login' $credentials) 200 "Login within limit $attempt" }
    Assert-Status (Send-Request $client 'POST' '/auth/login' $credentials) 429 'Login rate limit enforced'
    Write-Output 'All admin authentication integration checks passed.'
} finally {
    if ($client) { $client.Dispose() }
    if ($anonymous) { $anonymous.Dispose() }
    if ($apiProcess -and !$apiProcess.HasExited) { Stop-Process -Id $apiProcess.Id -Force }
    $env:ConnectionStrings__DefaultConnection = $originalConnection
    $env:ASPNETCORE_ENVIRONMENT = $originalEnvironment
    if ($database -notmatch '^SalonAuthTest_[a-f0-9]{32}$') { throw 'Unsafe test database name.' }
    & sqlcmd -S localhost -E -C -Q "IF DB_ID('$database') IS NOT NULL BEGIN ALTER DATABASE [$database] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$database]; END"
}
