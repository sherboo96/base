using System.Text.Json.Serialization;

namespace UMS.Models;

public class Organization: BaseModel
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Code { get; set; }

    [JsonIgnore]
    public ICollection<Department> Departments { get; set; }
}
