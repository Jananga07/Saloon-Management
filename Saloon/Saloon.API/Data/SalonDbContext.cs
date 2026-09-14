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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SalonService>()
            .Property(s => s.Price)
            .HasPrecision(18, 2);
    }
}