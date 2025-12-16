namespace UMS.Dtos;

public class CourseContactDto
{
    public int? Id { get; set; }
    public int CourseId { get; set; }
    public string Name { get; set; }
    public string PhoneNumber { get; set; }
    public string EmailAddress { get; set; }
}

