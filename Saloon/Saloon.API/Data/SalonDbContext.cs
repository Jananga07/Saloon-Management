using Microsoft.EntityFrameworkCore;
using Saloon.API.Models;

namespace Saloon.API.Data;

public class SalonDbContext : DbContext
{
    public SalonDbContext(DbContextOptions<SalonDbContext> options)
        : base(options)
    {
    }

    public DbSet<SalonService> SalonServices { get; set; }
    public DbSet<AdminUser> AdminUsers { get; set; }
    public DbSet<Booking> Bookings { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Booking>().Property(booking => booking.Price).HasPrecision(18, 2);
        modelBuilder.Entity<Booking>().HasIndex(booking => booking.Reference).IsUnique();
        modelBuilder.Entity<Booking>().HasIndex(booking => booking.RequestKey).IsUnique();
        modelBuilder.Entity<Booking>().HasIndex(booking => new { booking.Status, booking.StartsAt });
        modelBuilder.Entity<Booking>().HasOne<SalonService>().WithMany()
            .HasForeignKey(booking => booking.SalonServiceId).OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<SalonService>()
            .Property(s => s.Category)
            .HasMaxLength(20)
            .HasDefaultValue("Unisex");

        modelBuilder.Entity<SalonService>()
            .Property(s => s.Price)
            .HasPrecision(18, 2);
    }
}
