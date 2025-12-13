using System.Text.Json.Serialization;
using UMS.Models.Shared;

namespace UMS.Models;

public class CourseContent : BaseModel
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string? NameAr { get; set; }
    public int CourseId { get; set; }
    
    [JsonIgnore]
    public Course Course { get; set; }
}
