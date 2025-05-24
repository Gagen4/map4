using Microsoft.EntityFrameworkCore;
using MapServer.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();

// Configure DbContext
builder.Services.AddDbContext<MapDataContext>(options =>
    options.UseSqlServer("Server=DESKTOP-RF71AEO\\SQLEXPRESS;Database=MapDataDB;Trusted_Connection=True;TrustServerCertificate=True;"));

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.WithOrigins("http://127.0.0.1:5500")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure pipeline
app.UseCors("AllowAll"); // CORS перед всеми middleware
// app.UseHttpsRedirection(); // Временно отключено для тестов
app.UseAuthorization();
app.MapControllers();

app.Run();