using System.Text.Json.Serialization;

namespace UMS.Models;

public class JobTitle : BaseModel
{
    public int Id { get; set; }
    public string NameEn { get; set; }
    public string NameAr { get; set; }
    public string? Code { get; set; }
    public string? Description { get; set; }
    public int? DepartmentId { get; set; }
    public Department? Department { get; set; }
    
    [JsonIgnore]
    public ICollection<User> Users { get; set; }
}
