namespace UMS.Dtos;

public class EventOrganizationDto
{
    public int? Id { get; set; }
    public string Name { get; set; }
    public string? NameAr { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
}

