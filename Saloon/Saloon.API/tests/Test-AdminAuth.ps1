param([string]$Configuration = 'BookingUpdate')
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
    & dotnet ef database update --no-build --configuration $Configuration --project $project --connection $connection
    if ($LASTEXITCODE -ne 0) { throw 'Test database migration failed.' }
    $env:ConnectionStrings__DefaultConnection = $connection
    $env:ASPNETCORE_ENVIRONMENT = 'Development'
    $dll = Join-Path $projectRoot "bin\$Configuration\net10.0\Salon.API.dll"
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
    $photoBytes = [Convert]::FromBase64String('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aT1sAAAAASUVORK5CYII=')
    function Send-Photo($httpClient, $bytes, $useCsrf = $true) {
        $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Post, "$baseUrl/salonservices/$($created.id)/photo")
        $multipart = [System.Net.Http.MultipartFormDataContent]::new()
        $content = [System.Net.Http.ByteArrayContent]::new($bytes)
        $content.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::new('image/png')
        $multipart.Add($content, 'photo', 'test.png')
        $request.Content = $multipart
        if ($useCsrf) {
            $token = ($httpClient.GetAsync("$baseUrl/auth/csrf").Result.Content.ReadAsStringAsync().Result | ConvertFrom-Json).token
            $request.Headers.Add('X-CSRF-Token', $token)
        }
        return $httpClient.SendAsync($request).Result
    }
    Assert-Status (Send-Photo $anonymous $photoBytes $false) 401 'Anonymous photo upload denied'
    Assert-Status (Send-Photo $client $photoBytes $false) 400 'Photo upload requires CSRF token'
    Assert-Status (Send-Photo $client ([Text.Encoding]::UTF8.GetBytes('fake photo'))) 400 'Invalid photo contents rejected'
    Assert-Status (Send-Photo $client ([byte[]]::new(5 * 1024 * 1024 + 1))) 400 'Oversized photo rejected'
    Assert-Status (Send-Photo $client $photoBytes) 200 'Admin uploads service photo'
    $response = Send-Request $anonymous 'GET' "/salonservices/$($created.id)/photo" $null
    Assert-Status $response 200 'Public service photo display'
    if ($response.Content.Headers.ContentType.MediaType -ne 'image/png') { throw 'Wrong photo content type.' }
    if ([Convert]::ToBase64String($response.Content.ReadAsByteArrayAsync().Result) -ne [Convert]::ToBase64String($photoBytes)) { throw 'Photo bytes changed.' }
    $service.id = $created.id
    $service.category = 'Ladies'
    Assert-Status (Send-Request $client 'PUT' "/salonservices/$($created.id)" $service) 204 'Admin updates service'
    Assert-Status (Send-Request $anonymous 'GET' "/salonservices/$($created.id)/photo" $null) 200 'Editing service preserves photo'
    $response = Send-Request $anonymous 'GET' "/salonservices/$($created.id)" $null
    $summary = $response.Content.ReadAsStringAsync().Result | ConvertFrom-Json
    if (!$summary.imageUrl -or $summary.PSObject.Properties.Name -contains 'photo') { throw 'Service summary must include image URL without photo bytes.' }
    Assert-Status (Send-Request $anonymous 'DELETE' "/salonservices/$($created.id)/photo" $null $false) 401 'Anonymous photo removal denied'
    Assert-Status (Send-Request $client 'DELETE' "/salonservices/$($created.id)/photo" $null) 204 'Admin removes photo'
    Assert-Status (Send-Request $anonymous 'GET' "/salonservices/$($created.id)/photo" $null) 404 'Removed photo unavailable'
    # Customer booking and admin appointment management.
    $service.durationMinutes = 60
    Assert-Status (Send-Request $client 'PUT' "/salonservices/$($created.id)" $service) 204 'Set booking service duration'
    $date = [DateTimeOffset]::UtcNow.ToOffset([TimeSpan]::FromMinutes(330)).AddDays(2).ToString('yyyy-MM-dd')
    $response = Send-Request $anonymous 'GET' "/bookings/availability?serviceId=$($created.id)&date=$date" $null
    Assert-Status $response 200 'Customer sees available appointment times'
    $availability = $response.Content.ReadAsStringAsync().Result | ConvertFrom-Json
    if (!$availability.times -or $availability.timeZone -ne 'Asia/Colombo') { throw 'Expected Sri Lankan appointment times.' }
    $booking = @{ serviceId=$created.id; date=$date; time=$availability.times[0]; customerName='Booking Test'; phone='077 123 4567'; email='test@example.com'; notes='Integration test'; requestKey=[Guid]::NewGuid().ToString() }
    Assert-Status (Send-Request $anonymous 'POST' '/bookings' $booking $false) 400 'Booking requires CSRF token'
    $invalid = $booking.Clone(); $invalid.phone='abc'
    Assert-Status (Send-Request $anonymous 'POST' '/bookings' $invalid) 400 'Invalid customer phone rejected'
    $invalid = $booking.Clone(); $invalid.date='2020-01-01'
    Assert-Status (Send-Request $anonymous 'POST' '/bookings' $invalid) 400 'Past booking rejected'
    $invalid = $booking.Clone(); $invalid.time='23:00'
    Assert-Status (Send-Request $anonymous 'POST' '/bookings' $invalid) 400 'Booking outside opening hours rejected'
    $invalid = $booking.Clone(); $invalid.time='09:15'
    Assert-Status (Send-Request $anonymous 'POST' '/bookings' $invalid) 400 'Off-grid appointment time rejected'
    $response = Send-Request $anonymous 'POST' '/bookings' $booking
    Assert-Status $response 201 'Customer books without login'
    $receipt = $response.Content.ReadAsStringAsync().Result | ConvertFrom-Json
    if ($receipt.status -ne 'Pending' -or $receipt.price -ne 10 -or $receipt.durationMinutes -ne 60) { throw 'Wrong booking snapshot or initial status.' }
    $response = Send-Request $anonymous 'POST' '/bookings' $booking
    Assert-Status $response 200 'Retry does not create duplicate booking'
    if (($response.Content.ReadAsStringAsync().Result | ConvertFrom-Json).reference -ne $receipt.reference) { throw 'Retry produced a different reference.' }
    $overlap = $booking.Clone(); $overlap.requestKey=[Guid]::NewGuid().ToString()
    $overlap.time = ([DateTime]::ParseExact($booking.time, 'HH:mm', $null)).AddMinutes(30).ToString('HH:mm')
    Assert-Status (Send-Request $anonymous 'POST' '/bookings' $overlap) 409 'Overlapping duration blocked'
    $response = Send-Request $anonymous 'GET' "/bookings/availability?serviceId=$($created.id)&date=$date" $null
    $remaining = $response.Content.ReadAsStringAsync().Result | ConvertFrom-Json
    if ($remaining.times -contains $booking.time -or $remaining.times -contains $overlap.time) { throw 'Occupied appointment times still visible.' }
    Write-Output 'PASS: Occupied times hidden from availability'
    Assert-Status (Send-Request $anonymous 'GET' '/bookings' $null) 401 'Customer contact details are admin-only'
    $response = Send-Request $client 'GET' "/bookings?date=$date&status=Pending" $null
    Assert-Status $response 200 'Admin lists pending bookings'
    $entries = @($response.Content.ReadAsStringAsync().Result | ConvertFrom-Json)
    if ($entries.Count -ne 1 -or $entries[0].phone -ne $booking.phone) { throw 'Expected exactly one booking with contact details.' }
    $bookingId = $entries[0].id
    Assert-Status (Send-Request $anonymous 'PATCH' "/bookings/$bookingId/status" @{status='Confirmed'}) 401 'Anonymous appointment confirmation denied'
    Assert-Status (Send-Request $client 'PATCH' "/bookings/$bookingId/status" @{status='Confirmed'} $false) 400 'Admin appointment changes require CSRF token'
    Assert-Status (Send-Request $client 'PATCH' "/bookings/$bookingId/status" @{status='Confirmed'}) 200 'Admin confirms booking'
    Assert-Status (Send-Request $client 'PATCH' "/bookings/$bookingId/status" @{status='Cancelled'}) 200 'Admin cancels booking'
    Assert-Status (Send-Request $client 'PATCH' "/bookings/$bookingId/status" @{status='Confirmed'}) 409 'Cancelled booking cannot be reopened'
    $response = Send-Request $anonymous 'GET' "/bookings/availability?serviceId=$($created.id)&date=$date" $null
    if (($response.Content.ReadAsStringAsync().Result | ConvertFrom-Json).times -notcontains $booking.time) { throw 'Cancellation did not free the time slot.' }
    Write-Output 'PASS: Cancellation releases appointment time'
    # Two independent requests for the same time must not both succeed.
    $csrf = ($anonymous.GetAsync("$baseUrl/auth/csrf").Result.Content.ReadAsStringAsync().Result | ConvertFrom-Json).token
    $tasks = @()
    foreach ($attempt in 1..2) {
        $concurrent = $booking.Clone(); $concurrent.requestKey=[Guid]::NewGuid().ToString()
        $httpRequest = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Post, "$baseUrl/bookings")
        $httpRequest.Headers.Add('X-CSRF-Token', $csrf)
        $httpRequest.Content = [System.Net.Http.StringContent]::new(($concurrent | ConvertTo-Json -Compress), [Text.Encoding]::UTF8, 'application/json')
        $tasks += $anonymous.SendAsync($httpRequest)
    }
    [System.Threading.Tasks.Task]::WaitAll([System.Threading.Tasks.Task[]]$tasks)
    $codes = @($tasks | ForEach-Object { [int]$_.Result.StatusCode } | Sort-Object)
    if ($codes.Count -ne 2 -or $codes[0] -ne 201 -or $codes[1] -ne 409) { throw "Concurrent booking protection failed: $codes" }
    Write-Output 'PASS: Simultaneous booking requests cannot double-book'
    $service.isActive=$false
    Assert-Status (Send-Request $client 'PUT' "/salonservices/$($created.id)" $service) 204 'Deactivate booking service'
    $inactive = $booking.Clone(); $inactive.requestKey=[Guid]::NewGuid().ToString(); $inactive.time=$remaining.times[-1]
    Assert-Status (Send-Request $anonymous 'POST' '/bookings' $inactive) 400 'Inactive service cannot be booked'
    Assert-Status (Send-Request $client 'DELETE' "/salonservices/$($created.id)" $null) 204 'Admin deletes service'
    $response = Send-Request $client 'GET' "/bookings?date=$date" $null
    Assert-Status $response 200 'Admin can read appointment history after service deletion'
    $history = $response.Content.ReadAsStringAsync().Result | ConvertFrom-Json
    if ($history.Count -ne 2 -or $history[0].serviceName -ne 'Auth Test') { throw "Appointment history assertion failed: expected 2 Auth Test entries, found $($history.Count)." }
    Write-Output 'PASS: Service deletion preserves appointment history'
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
