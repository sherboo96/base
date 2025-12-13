namespace UMS.Dtos;

public class InstitutionDto
{
    public int? Id { get; set; }
    public string Name { get; set; }
    public string NameAr { get; set; }
    public string? CertificatePdf { get; set; } // Path to certificate PDF file
}
