namespace UMS.Dtos.Authentication;

public class VerifyRegistrationOtpRequest
{
    public string Email { get; set; }
    public string Otp { get; set; }
}
