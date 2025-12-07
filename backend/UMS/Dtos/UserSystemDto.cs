namespace UMS.Dtos;

public class UserSystemDto
{
    public int UserId { get; set; }
    public int SystemId { get; set; }
    public string? AccessLevel { get; set; } // Made nullable/optional
}
