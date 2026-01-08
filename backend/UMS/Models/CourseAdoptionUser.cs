using System.Text.Json.Serialization;
using UMS.Models.Shared;

namespace UMS.Models;

public class CourseAdoptionUser : BaseModel
{
    public int CourseId { get; set; }
    public Course Course { get; set; }
    
    public int AdoptionUserId { get; set; }
    public AdoptionUser AdoptionUser { get; set; }
    
    public AdoptionType AdoptionType { get; set; } = AdoptionType.Other;
    public AttendanceType AttendanceType { get; set; } = AttendanceType.Optional;
}

