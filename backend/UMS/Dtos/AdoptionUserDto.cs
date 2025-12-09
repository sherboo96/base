using UMS.Models;

namespace UMS.Dtos;

public class AdoptionUserDto
{
    public string Name { get; set; }
    public string NameAr { get; set; }
    public AttendanceType Attendance { get; set; } = AttendanceType.Optional;
    public string Email { get; set; }
    public string? Bio { get; set; }
    public int OrganizationId { get; set; }
}
