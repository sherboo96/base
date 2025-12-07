namespace UMS.Dtos.Authentication;

public class UserPermissionsResponseDto
{
    public List<UserPermissionsDto> permissions { get; set; }
    public List<SideMenuPermissionDto> sideMenu { get; set; }
}

public class SideMenuPermissionDto
{
    public string code { get; set; }
    public string route { get; set; }
    public string label { get; set; }
    public string icon { get; set; }
    public string section { get; set; }
    public bool hasAccess { get; set; }
}

