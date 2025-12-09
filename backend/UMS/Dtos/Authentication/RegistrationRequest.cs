namespace UMS.Dtos.Authentication;

public class RegistrationRequest
{
    public string Email { get; set; }
    public string FullName { get; set; } // English name
    public string? FullNameAr { get; set; } // Arabic name (optional)
    public string? CivilNo { get; set; } // Civil number (optional)
    public string Username { get; set; }
}
