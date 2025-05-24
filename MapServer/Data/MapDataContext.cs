using Microsoft.EntityFrameworkCore;
using MapServer.Models;

namespace MapServer.Data;

public class MapDataContext : DbContext
{
    public MapDataContext(DbContextOptions<MapDataContext> options) : base(options)
    {
    }

    public DbSet<MapObject> MapObjects { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<MapObject>()
            .HasKey(m => m.Id);
        modelBuilder.Entity<MapObject>()
            .HasIndex(m => m.FileName)
            .IsUnique();
    }
}