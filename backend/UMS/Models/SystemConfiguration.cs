namespace UMS.Models;

public class SystemConfiguration : BaseModel
{
    public int Id { get; set; }
    public string Key { get; set; }
    public string Value { get; set; }
    public string? Description { get; set; }
}

