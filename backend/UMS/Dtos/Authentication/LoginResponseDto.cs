namespace UMS.Dtos.Authentication;

public class LoginResponseDto
{
    public string token { get; set; }
    public LoginUserDto user { get; set; }
    public List<LoginRoleDto> roles { get; set; }
}

public class LoginMethodDto
{
    public int id { get; set; }
    public string name { get; set; }
}

public class LoginUserDto
{
    public string id { get; set; }
    public string fullName { get; set; }
    public DateTime? lastLogin { get; set; }
    public LoginMethodDto loginMethod { get; set; }
    public LoginOrganizationDto? organization { get; set; }
    public DateTime createdOn { get; set; }
    public string? createdBy { get; set; }
    public DateTime? updatedAt { get; set; }
    public string? updatedBy { get; set; }
    public string userName { get; set; }
    public string email { get; set; }
    public bool emailConfirmed { get; set; }
}

public class LoginRoleDto
{
    public int id { get; set; }
    public string name { get; set; }
    public bool isActive { get; set; }
    public bool isDeleted { get; set; }
    public DateTime createdOn { get; set; }
    public string? createdBy { get; set; }
}

public class LoginOrganizationDto
{
    public int id { get; set; }
    public string name { get; set; }
    public string code { get; set; }
    public bool isMain { get; set; }
    public bool isActive { get; set; }
}

