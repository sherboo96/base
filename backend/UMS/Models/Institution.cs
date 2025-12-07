using UMS.Models.Shared;

namespace UMS.Models;

public class Institution : BaseModel
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string NameAr { get; set; }
}
