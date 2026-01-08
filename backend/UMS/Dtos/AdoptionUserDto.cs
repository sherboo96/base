using UMS.Models;

namespace UMS.Dtos;

public class AdoptionUserDto
{
    public int? Id { get; set; }
    public string Name { get; set; }
    public string NameAr { get; set; }
    public string Email { get; set; }
    public string? Bio { get; set; }
    public int OrganizationId { get; set; }
}
