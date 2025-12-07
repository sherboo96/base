using System.Text.Json.Serialization;

namespace UMS.Models;

public class Organization: BaseModel
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string NameAr { get; set; }
    public string Code { get; set; }
    public string Domain { get; set; } // e.g., moo.gov.kw
    public bool IsMain { get; set; } = false; // Only one organization can be main

    [JsonIgnore]
    public ICollection<Department> Departments { get; set; }
    [JsonIgnore]
    public ICollection<User> Users { get; set; }
}
