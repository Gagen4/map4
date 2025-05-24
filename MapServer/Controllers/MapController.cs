using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MapServer.Data;
using MapServer.Models;
using System.Text.Json;

namespace MapServer.Controllers;

[ApiController]
[Route("api")]
public class MapController : ControllerBase
{
    private readonly MapDataContext _context;

    public MapController(MapDataContext context)
    {
        _context = context;
    }

    [HttpPost("save")]
    public async Task<IActionResult> Save([FromBody] SaveRequest request)
    {
        if (string.IsNullOrEmpty(request.FileName) || request.GeoJsonData == null)
        {
            return BadRequest(new { error = "Имя файла и данные обязательны" });
        }

        try
        {
            var existing = await _context.MapObjects
                .FirstOrDefaultAsync(m => m.FileName == request.FileName);

            if (existing != null)
            {
                existing.GeoJsonData = JsonSerializer.Serialize(request.GeoJsonData);
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                _context.MapObjects.Add(new MapObject
                {
                    FileName = request.FileName,
                    GeoJsonData = JsonSerializer.Serialize(request.GeoJsonData),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Сохранено успешно" });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Ошибка в Save: {ex.Message}\n{ex.StackTrace}");
            return StatusCode(500, new { error = "Ошибка сервера" });
        }
    }

    [HttpGet("load/{fileName}")]
    public async Task<IActionResult> Load(string fileName)
    {
        try
        {
            var mapObject = await _context.MapObjects
                .FirstOrDefaultAsync(m => m.FileName == fileName);

            if (mapObject == null)
            {
                return NotFound(new { error = "Файл не найден" });
            }

            var geoJsonData = JsonSerializer.Deserialize<object>(mapObject.GeoJsonData);
            return Ok(geoJsonData);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Ошибка в Load: {ex.Message}\n{ex.StackTrace}");
            return StatusCode(500, new { error = "Ошибка сервера" });
        }
    }

    [HttpGet("files")]
    public async Task<IActionResult> GetFiles()
    {
        try
        {
            Console.WriteLine("Запрос к /api/files");
            var fileNames = await _context.MapObjects
                .OrderByDescending(m => m.CreatedAt)
                .Select(m => m.FileName)
                .ToListAsync();
            Console.WriteLine($"Найдено файлов: {fileNames.Count}");
            return Ok(fileNames);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Ошибка в GetFiles: {ex.Message}\n{ex.StackTrace}");
            return StatusCode(500, new { error = "Ошибка сервера" });
        }
    }
}

public class SaveRequest
{
    public string? FileName { get; set; }
    public object? GeoJsonData { get; set; }
}