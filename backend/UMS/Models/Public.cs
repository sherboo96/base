using UMS.Models.Shared;

namespace UMS.Models;

public class Public : BaseModel
{
    public int Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty; // JSON string
    public string? Description { get; set; }
}

