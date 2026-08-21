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
}