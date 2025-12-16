using UMS.Models.Shared;

namespace UMS.Dtos;

public class CourseAdoptionUserDto
{
    public int? Id { get; set; }
    public int CourseId { get; set; }
    public int AdoptionUserId { get; set; }
    public AdoptionUserDto? AdoptionUser { get; set; }
    public AdoptionType AdoptionType { get; set; } = AdoptionType.Other;
}

