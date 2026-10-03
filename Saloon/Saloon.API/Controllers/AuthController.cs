using System.ComponentModel.DataAnnotations;
using System.Net;
using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Saloon.API.Data;
using Saloon.API.Models;

namespace Saloon.API.Controllers;

[ApiController]
[Route("api/auth")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class AuthController(SalonDbContext db, IPasswordHasher<AdminUser> hasher,
    IAntiforgery antiforgery, IWebHostEnvironment environment) : ControllerBase
{
    private bool CanSetup => environment.IsDevelopment()
        && HttpContext.Connection.RemoteIpAddress is { } address && IPAddress.IsLoopback(address)
        && (Request.Host.Host == "localhost" || Request.Host.Host == "127.0.0.1" || Request.Host.Host == "[::1]");

    [HttpGet("csrf")]
    public IActionResult Csrf() => Ok(new { token = antiforgery.GetAndStoreTokens(HttpContext).RequestToken });

    [HttpGet("status")]
    public async Task<IActionResult> Status() => Ok(new
    {
        setupRequired = !await db.AdminUsers.AnyAsync(),
        setupAllowed = CanSetup,
        user = User.IsInRole("Admin") ? new { username = User.Identity!.Name, role = "Admin" } : null
    });

    [HttpPost("setup")]
    [ValidateAntiForgeryToken]
    [EnableRateLimiting("admin-login")]
    public async Task<IActionResult> Setup(SetupRequest request)
    {
        if (!CanSetup) return StatusCode(403, new { message = "Owner setup is only available on this computer in development mode." });
        if (await db.AdminUsers.AnyAsync()) return Conflict(new { message = "The owner account already exists. Please sign in." });
        var admin = new AdminUser { Username = request.Username.Trim() };
        admin.PasswordHash = hasher.HashPassword(admin, request.Password);
        db.AdminUsers.Add(admin);
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException)
        {
            if (await db.AdminUsers.AsNoTracking().AnyAsync())
                return Conflict(new { message = "The owner account already exists. Please sign in." });
            throw;
        }
        await SignIn(admin);
        return Ok(new { username = admin.Username, role = "Admin" });
    }

    [HttpPost("login")]
    [ValidateAntiForgeryToken]
    [EnableRateLimiting("admin-login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var admin = await db.AdminUsers.FindAsync(1);
        // Always run the password hasher, including for unknown usernames.
        var candidate = admin ?? new AdminUser();
        var hash = admin?.PasswordHash ?? hasher.HashPassword(candidate, "unused-placeholder-password");
        var result = hasher.VerifyHashedPassword(candidate, hash, request.Password);
        if (admin == null || !string.Equals(admin.Username, request.Username.Trim(), StringComparison.OrdinalIgnoreCase)
            || result == PasswordVerificationResult.Failed)
            return Unauthorized(new { message = "Incorrect username or password." });
        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            admin.PasswordHash = hasher.HashPassword(admin, request.Password);
            await db.SaveChangesAsync();
        }
        await SignIn(admin);
        return Ok(new { username = admin.Username, role = "Admin" });
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("logout")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    private Task SignIn(AdminUser admin) => HttpContext.SignInAsync(
        CookieAuthenticationDefaults.AuthenticationScheme,
        new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, admin.Id.ToString()),
            new Claim(ClaimTypes.Name, admin.Username),
            new Claim(ClaimTypes.Role, "Admin")
        }, CookieAuthenticationDefaults.AuthenticationScheme)),
        new AuthenticationProperties { IsPersistent = false });
}

public class LoginRequest
{
    [Required, StringLength(100), RegularExpression(@"\S(?:.*\S)?")]
    public string Username { get; set; } = string.Empty;
    [Required, StringLength(128)]
    public string Password { get; set; } = string.Empty;
}

public class SetupRequest
{
    [Required, StringLength(100), RegularExpression(@"\S(?:.*\S)?")]
    public string Username { get; set; } = string.Empty;
    [Required, StringLength(128, MinimumLength = 12)]
    public string Password { get; set; } = string.Empty;
}
