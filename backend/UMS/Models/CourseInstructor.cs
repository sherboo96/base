using System.Text.Json.Serialization;
using UMS.Models.Shared;

namespace UMS.Models;

public class CourseInstructor : BaseModel
{
    public int CourseId { get; set; }
    public Course Course { get; set; }
    
    public int InstructorId { get; set; }
    public Instructor Instructor { get; set; }
}
