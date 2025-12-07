using UMS.Models;

namespace UMS.Dtos;

public class SystemDto
{
    public string Name { get; set; }
    public string Code { get; set; }
    public string ServerIP { get; set; }
    public string Domain { get; set; }
    public string Database { get; set; }
    public DateTime? StartDate { get; set; }
    public LoginMethod LoginMethod { get; set; } = LoginMethod.ActiveDirectory;
}
