using System.ComponentModel.DataAnnotations;

namespace Saloon.API.Models;

public class Booking
{
    public int Id { get; set; }
    [MaxLength(36)] public string Reference { get; set; } = string.Empty;
    public Guid RequestKey { get; set; }
    public int? SalonServiceId { get; set; }
    [MaxLength(300)] public string ServiceName { get; set; } = string.Empty;
    [MaxLength(20)] public string Category { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int DurationMinutes { get; set; }
    [MaxLength(100)] public string CustomerName { get; set; } = string.Empty;
    [MaxLength(25)] public string Phone { get; set; } = string.Empty;
    [MaxLength(254)] public string? Email { get; set; }
    [MaxLength(1000)] public string? Notes { get; set; }
    public DateTimeOffset StartsAt { get; set; }
    public DateTimeOffset EndsAt { get; set; }
    [MaxLength(20)] public string Status { get; set; } = "Pending";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
