namespace UMS.Dtos;

public class InstructorDto
{
    public int? Id { get; set; }
    public string NameEn { get; set; }
    public string NameAr { get; set; }
    public string Email { get; set; }
    public string? Phone { get; set; }
    public string? Bio { get; set; }
    public string? ProfileImage { get; set; }
    public int InstitutionId { get; set; }
}
