namespace MapServer.Models;

public class MapObject
{
    public int Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string GeoJsonData { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}