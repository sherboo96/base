using UMS.Models.Shared;

namespace UMS.Models;

public class Instructor : BaseModel
{
    public int Id { get; set; }
    public string NameEn { get; set; }
    public string NameAr { get; set; }
    public string Email { get; set; }
    public string? Phone { get; set; }
    public string? Bio { get; set; }
    public string? ProfileImage { get; set; }
    public int InstitutionId { get; set; }
    public Institution Institution { get; set; }
}
