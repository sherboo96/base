using System.Text.Json.Serialization;

namespace UMS.Models;

public class CourseContact : BaseModel
{
    public int Id { get; set; }
    public int CourseId { get; set; }
    public Course Course { get; set; }
    
    public string Name { get; set; }
    public string PhoneNumber { get; set; }
    public string EmailAddress { get; set; }
}

