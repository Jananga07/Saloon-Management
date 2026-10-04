using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Saloon.API.Data;
using Saloon.API.Models;

namespace Saloon.API.Controllers;

[ApiController]
[Route("api/bookings")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class BookingsController(SalonDbContext db) : ControllerBase
{
    private static readonly TimeSpan ColomboOffset = TimeSpan.FromMinutes(330);
    private static DateTimeOffset LocalNow => DateTimeOffset.UtcNow.ToOffset(ColomboOffset);
    private static (TimeOnly Open, TimeOnly Close) Hours(DateOnly date) => date.DayOfWeek == DayOfWeek.Sunday
        ? (new TimeOnly(10, 0), new TimeOnly(18, 0)) : (new TimeOnly(9, 0), new TimeOnly(20, 0));
    private static DateTimeOffset At(DateOnly date, TimeOnly time) => new(date.ToDateTime(time), ColomboOffset);
    private static bool ValidDate(DateOnly date) => date >= DateOnly.FromDateTime(LocalNow.DateTime)
        && date <= DateOnly.FromDateTime(LocalNow.DateTime).AddDays(90);
    private static bool ValidSlot(DateOnly date, TimeOnly time, int duration)
    {
        var (open, close) = Hours(date);
        return ValidDate(date) && duration > 0 && duration <= 660 && time.Second == 0 && time.Millisecond == 0
            && time.Ticks % TimeSpan.TicksPerMinute == 0 && time.Minute % 30 == 0 && time >= open
            && At(date, time).AddMinutes(duration) <= At(date, close) && At(date, time) >= DateTimeOffset.UtcNow.AddMinutes(30);
    }
    private static object Receipt(Booking booking) => new
    {
        booking.Reference, booking.ServiceName, booking.Category, booking.Price,
        booking.DurationMinutes, booking.StartsAt, booking.EndsAt, booking.Status
    };

    [HttpGet("availability")]
    public async Task<IActionResult> Availability([FromQuery] int serviceId, [FromQuery] DateOnly date)
    {
        if (!ValidDate(date)) return BadRequest(new { message = "Choose a date between today and 90 days from today." });
        var service = await db.SalonServices.AsNoTracking().Where(s => s.Id == serviceId && s.IsActive)
            .Select(s => new { s.DurationMinutes }).FirstOrDefaultAsync();
        if (service == null) return NotFound(new { message = "This service is no longer available." });
        var dayStart = At(date, TimeOnly.MinValue).ToUniversalTime();
        var dayEnd = dayStart.AddDays(1);
        var occupied = await db.Bookings.AsNoTracking().Where(b => b.Status != "Cancelled" && b.StartsAt < dayEnd && b.EndsAt > dayStart)
            .Select(b => new { b.StartsAt, b.EndsAt }).ToListAsync();
        var (open, close) = Hours(date);
        var times = new List<string>();
        for (var candidate = date.ToDateTime(open); candidate < date.ToDateTime(close); candidate = candidate.AddMinutes(30))
        {
            var time = TimeOnly.FromDateTime(candidate);
            if (!ValidSlot(date, time, service.DurationMinutes)) continue;
            var start = At(date, time);
            var end = start.AddMinutes(service.DurationMinutes);
            if (!occupied.Any(b => b.StartsAt < end && b.EndsAt > start)) times.Add(time.ToString("HH:mm"));
        }
        return Ok(new { date, timeZone = "Asia/Colombo", times });
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    [EnableRateLimiting("booking-create")]
    public async Task<IActionResult> Create(CreateBookingRequest request)
    {
        if (request.RequestKey == Guid.Empty) return BadRequest(new { message = "A booking request key is required." });
        if (!ValidDate(request.Date)) return BadRequest(new { message = "Choose a date between today and 90 days from today." });
        await using var transaction = await db.Database.BeginTransactionAsync();
        // All booking mutations share this database lock, including across multiple API instances.
        await LockSchedule();
        var previous = await db.Bookings.AsNoTracking().FirstOrDefaultAsync(b => b.RequestKey == request.RequestKey);
        if (previous != null)
        {
            if (previous.SalonServiceId != request.ServiceId || previous.StartsAt != At(request.Date, request.Time)
                || previous.CustomerName != request.CustomerName.Trim() || previous.Phone != request.Phone.Trim()
                || previous.Email != request.Email?.Trim() || previous.Notes != request.Notes?.Trim())
                return Conflict(new { message = "This request was already used. Please start a new booking." });
            return Ok(Receipt(previous));
        }
        var service = await db.SalonServices.AsNoTracking().Where(s => s.Id == request.ServiceId && s.IsActive)
            .Select(s => new { s.Id, s.Name, s.Category, s.Price, s.DurationMinutes }).FirstOrDefaultAsync();
        if (service == null) return BadRequest(new { message = "This service is no longer available. Choose another service." });
        if (service.Name.Length > 300) return BadRequest(new { message = "This service cannot be booked. Please contact the salon." });
        if (!ValidSlot(request.Date, request.Time, service.DurationMinutes))
            return BadRequest(new { message = "Choose an available time during opening hours, at least 30 minutes from now and within the next 90 days." });
        var start = At(request.Date, request.Time).ToUniversalTime();
        var end = start.AddMinutes(service.DurationMinutes);
        if (await db.Bookings.AnyAsync(b => b.Status != "Cancelled" && b.StartsAt < end && b.EndsAt > start))
            return Conflict(new { message = "That time was just booked. Please choose another available time." });
        var booking = new Booking
        {
            Reference = "SLN-" + Guid.NewGuid().ToString("N"), RequestKey = request.RequestKey,
            SalonServiceId = service.Id, ServiceName = service.Name, Category = service.Category,
            Price = service.Price, DurationMinutes = service.DurationMinutes,
            CustomerName = request.CustomerName.Trim(), Phone = request.Phone.Trim(),
            Email = request.Email?.Trim(), Notes = request.Notes?.Trim(), StartsAt = start, EndsAt = end
        };
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return StatusCode(201, Receipt(booking));
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> List([FromQuery] DateOnly? date, [FromQuery] string? status)
    {
        if (status != null && !new[] { "Pending", "Confirmed", "Cancelled" }.Contains(status))
            return BadRequest(new { message = "Unknown booking status." });
        var query = db.Bookings.AsNoTracking().AsQueryable();
        if (date.HasValue)
        {
            var start = At(date.Value, TimeOnly.MinValue).ToUniversalTime();
            var end = start.AddDays(1);
            query = query.Where(b => b.StartsAt >= start && b.StartsAt < end);
        }
        if (status != null) query = query.Where(b => b.Status == status);
        return Ok(await query.OrderByDescending(b => b.StartsAt).ThenBy(b => b.Id)
            .Select(b => new { b.Id, b.Reference, b.ServiceName, b.Category, b.Price, b.DurationMinutes,
                b.CustomerName, b.Phone, b.Email, b.Notes, b.StartsAt, b.EndsAt, b.Status, b.CreatedAt }).ToListAsync());
    }

    [HttpPatch("{id}/status")]
    [Authorize(Roles = "Admin")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> UpdateStatus(int id, BookingStatusRequest request)
    {
        await using var transaction = await db.Database.BeginTransactionAsync();
        await LockSchedule();
        var booking = await db.Bookings.FindAsync(id);
        if (booking == null) return NotFound();
        if (booking.Status == request.Status) return Ok(new { booking.Status });
        if (booking.Status == "Cancelled") return Conflict(new { message = "Cancelled bookings cannot be reopened. Create a new booking instead." });
        if (request.Status == "Confirmed" && booking.StartsAt <= DateTimeOffset.UtcNow)
            return Conflict(new { message = "Past appointments cannot be confirmed." });
        booking.Status = request.Status;
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
        return Ok(new { booking.Status });
    }

    private Task<int> LockSchedule() => db.Database.ExecuteSqlRawAsync("""
        DECLARE @result int;
        EXEC @result = sp_getapplock @Resource = 'SalonBookingSchedule',
            @LockOwner = 'Transaction', @LockMode = 'Exclusive', @LockTimeout = 10000;
        IF @result < 0 THROW 51000, 'The booking schedule is busy. Please try again.', 1;
        """);
}

public class CreateBookingRequest
{
    [Range(1, int.MaxValue)] public int ServiceId { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly Time { get; set; }
    public Guid RequestKey { get; set; }
    [Required, StringLength(100), RegularExpression(@"\S(?:.*\S)?")]
    public string CustomerName { get; set; } = string.Empty;
    [Required, StringLength(25), RegularExpression(@"\+?[0-9][0-9 ()-]{5,23}[0-9]", ErrorMessage = "Enter a valid contact phone number.")]
    public string Phone { get; set; } = string.Empty;
    [EmailAddress, StringLength(254)] public string? Email { get; set; }
    [StringLength(1000)] public string? Notes { get; set; }
}

public class BookingStatusRequest
{
    [Required, RegularExpression("^(Confirmed|Cancelled)$")]
    public string Status { get; set; } = string.Empty;
}
