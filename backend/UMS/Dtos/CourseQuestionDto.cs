using UMS.Models;

namespace UMS.Dtos;

public class CourseQuestionDto
{
    public int? Id { get; set; }
    public int CourseId { get; set; }
    public string Question { get; set; } = string.Empty;
    public string? QuestionAr { get; set; }
    public string? Description { get; set; }
    public string? DescriptionAr { get; set; }
    public QuestionType Type { get; set; } = QuestionType.ShortAnswer;
    public bool IsRequired { get; set; } = false;
    public int Order { get; set; } = 0;
}

