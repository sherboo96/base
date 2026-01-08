namespace UMS.Dtos;

public class PublicDto
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty; // JSON string
    public string? Description { get; set; }
}

public class SupportContactDto
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
}

public class SupportInfoDto
{
    public List<SupportContactDto> Contacts { get; set; } = new();
    
    // Legacy properties for backward compatibility (deprecated)
    [Obsolete("Use Contacts instead")]
    public List<string>? Emails { get; set; }
    
    [Obsolete("Use Contacts instead")]
    public List<string>? PhoneNumbers { get; set; }
}

