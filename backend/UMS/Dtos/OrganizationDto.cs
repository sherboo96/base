namespace UMS.Dtos;

public class OrganizationDto
{
    public string Name { get; set; }
    public string NameAr { get; set; }
    public string Code { get; set; }
    public string Domain { get; set; } // e.g., moo.gov.kw
    public bool IsMain { get; set; }
}
