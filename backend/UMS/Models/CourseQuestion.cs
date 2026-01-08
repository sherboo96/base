using UMS.Models.Shared;

namespace UMS.Models;

public class CourseQuestion : BaseModel
{
    public int Id { get; set; }
    public int CourseId { get; set; }
    public Course Course { get; set; }
    public string Question { get; set; } = string.Empty;
    public string? QuestionAr { get; set; }
    public string? Description { get; set; }
    public string? DescriptionAr { get; set; }
    public QuestionType Type { get; set; } = QuestionType.ShortAnswer;
    public bool IsRequired { get; set; } = false;
    public int Order { get; set; } = 0; // Order of the question in the list
}

public enum QuestionType
{
    YesNo = 1,
    ShortAnswer = 2
}

