using System.Text.Json.Serialization;

namespace UMS.Models;

public class Position : BaseModel
{
    public int Id { get; set; }
    public string NameEn { get; set; }
    public string NameAr { get; set; }
    public string? Code { get; set; }
    
    [JsonIgnore]
    public ICollection<User> Users { get; set; }
}
