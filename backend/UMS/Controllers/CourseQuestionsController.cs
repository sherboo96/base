using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using UMS.Dtos;
using UMS.Dtos.Shared;
using UMS.Interfaces;
using UMS.Models;

namespace UMS.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CourseQuestionsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<CourseQuestionsController> _logger;

    public CourseQuestionsController(IUnitOfWork unitOfWork, ILogger<CourseQuestionsController> logger)
    {
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    /// <summary>
    /// Get all questions for a specific course
    /// </summary>
    [HttpGet("course/{courseId}")]
    [Authorize]
    public async Task<IActionResult> GetByCourseId(int courseId)
    {
        var questions = await _unitOfWork.CourseQuestions.GetAllAsync(
            match: x => x.CourseId == courseId && !x.IsDeleted
        );
        var orderedQuestions = questions.OrderBy(q => q.Order).ToList();

        var questionDtos = orderedQuestions.Select(q => new CourseQuestionDto
        {
            Id = q.Id,
            CourseId = q.CourseId,
            Question = q.Question,
            QuestionAr = q.QuestionAr,
            Description = q.Description,
            DescriptionAr = q.DescriptionAr,
            Type = q.Type,
            IsRequired = q.IsRequired,
            Order = q.Order
        }).ToList();

        return Ok(new BaseResponse<List<CourseQuestionDto>>
        {
            StatusCode = 200,
            Message = "Questions retrieved successfully.",
            Result = questionDtos
        });
    }

    /// <summary>
    /// Get a specific question by ID
    /// </summary>
    [HttpGet("{id}")]
    [Authorize]
    public async Task<IActionResult> Get(int id)
    {
        var question = await _unitOfWork.CourseQuestions.FindAsync(
            x => x.Id == id && !x.IsDeleted
        );

        if (question == null)
        {
            return NotFound(new BaseResponse<CourseQuestionDto>
            {
                StatusCode = 404,
                Message = "Question not found.",
                Result = null
            });
        }

        var questionDto = new CourseQuestionDto
        {
            Id = question.Id,
            CourseId = question.CourseId,
            Question = question.Question,
            QuestionAr = question.QuestionAr,
            Description = question.Description,
            DescriptionAr = question.DescriptionAr,
            Type = question.Type,
            IsRequired = question.IsRequired,
            Order = question.Order
        };

        return Ok(new BaseResponse<CourseQuestionDto>
        {
            StatusCode = 200,
            Message = "Question retrieved successfully.",
            Result = questionDto
        });
    }

    /// <summary>
    /// Create a new question for a course
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] CourseQuestionDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new BaseResponse<CourseQuestionDto>
            {
                StatusCode = 400,
                Message = "Invalid request data.",
                Result = null
            });
        }

        // Verify course exists
        var course = await _unitOfWork.Courses.FindAsync(x => x.Id == dto.CourseId && !x.IsDeleted);
        if (course == null)
        {
            return NotFound(new BaseResponse<CourseQuestionDto>
            {
                StatusCode = 404,
                Message = "Course not found.",
                Result = null
            });
        }

        var currentUser = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";

        // If Order is 0, set it to the next available order
        if (dto.Order == 0)
        {
            var existingQuestions = await _unitOfWork.CourseQuestions.GetAllAsync(
                match: x => x.CourseId == dto.CourseId && !x.IsDeleted
            );
            dto.Order = existingQuestions.Any() ? existingQuestions.Max(q => q.Order) + 1 : 1;
        }

        var question = new CourseQuestion
        {
            CourseId = dto.CourseId,
            Question = dto.Question,
            QuestionAr = dto.QuestionAr,
            Description = dto.Description,
            DescriptionAr = dto.DescriptionAr,
            Type = dto.Type,
            IsRequired = dto.IsRequired,
            Order = dto.Order,
            CreatedBy = currentUser
        };

        var createdQuestion = await _unitOfWork.CourseQuestions.AddAsync(question);
        await _unitOfWork.CompleteAsync();

        var createdDto = new CourseQuestionDto
        {
            Id = createdQuestion.Id,
            CourseId = createdQuestion.CourseId,
            Question = createdQuestion.Question,
            QuestionAr = createdQuestion.QuestionAr,
            Description = createdQuestion.Description,
            DescriptionAr = createdQuestion.DescriptionAr,
            Type = createdQuestion.Type,
            IsRequired = createdQuestion.IsRequired,
            Order = createdQuestion.Order
        };

        return Ok(new BaseResponse<CourseQuestionDto>
        {
            StatusCode = 200,
            Message = "Question created successfully.",
            Result = createdDto
        });
    }

    /// <summary>
    /// Update an existing question
    /// </summary>
    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> Update(int id, [FromBody] CourseQuestionDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new BaseResponse<CourseQuestionDto>
            {
                StatusCode = 400,
                Message = "Invalid request data.",
                Result = null
            });
        }

        var existing = await _unitOfWork.CourseQuestions.FindAsync(
            x => x.Id == id && !x.IsDeleted
        );

        if (existing == null)
        {
            return NotFound(new BaseResponse<CourseQuestionDto>
            {
                StatusCode = 404,
                Message = "Question not found.",
                Result = null
            });
        }

        var currentUser = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";

        existing.Question = dto.Question;
        existing.QuestionAr = dto.QuestionAr;
        existing.Description = dto.Description;
        existing.DescriptionAr = dto.DescriptionAr;
        existing.Type = dto.Type;
        existing.IsRequired = dto.IsRequired;
        existing.Order = dto.Order;
        existing.UpdatedAt = DateTime.UtcNow;
        existing.UpdatedBy = currentUser;

        await _unitOfWork.CourseQuestions.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();

        var updatedDto = new CourseQuestionDto
        {
            Id = existing.Id,
            CourseId = existing.CourseId,
            Question = existing.Question,
            QuestionAr = existing.QuestionAr,
            Description = existing.Description,
            DescriptionAr = existing.DescriptionAr,
            Type = existing.Type,
            IsRequired = existing.IsRequired,
            Order = existing.Order
        };

        return Ok(new BaseResponse<CourseQuestionDto>
        {
            StatusCode = 200,
            Message = "Question updated successfully.",
            Result = updatedDto
        });
    }

    /// <summary>
    /// Delete a question (soft delete)
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> Delete(int id)
    {
        var question = await _unitOfWork.CourseQuestions.FindAsync(
            x => x.Id == id && !x.IsDeleted
        );

        if (question == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "Question not found.",
                Result = false
            });
        }

        var currentUser = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";

        question.IsDeleted = true;
        question.UpdatedAt = DateTime.UtcNow;
        question.UpdatedBy = currentUser;

        await _unitOfWork.CourseQuestions.UpdateAsync(question);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = "Question deleted successfully.",
            Result = true
        });
    }

    /// <summary>
    /// Reorder questions for a course
    /// </summary>
    [HttpPost("reorder")]
    [Authorize]
    public async Task<IActionResult> Reorder([FromBody] ReorderQuestionsDto dto)
    {
        if (dto.QuestionIds == null || !dto.QuestionIds.Any())
        {
            return BadRequest(new BaseResponse<bool>
            {
                StatusCode = 400,
                Message = "Question IDs are required.",
                Result = false
            });
        }

        var questions = await _unitOfWork.CourseQuestions.GetAllAsync(
            match: x => dto.QuestionIds.Contains(x.Id) && !x.IsDeleted
        );

        if (questions.Count() != dto.QuestionIds.Count())
        {
            return BadRequest(new BaseResponse<bool>
            {
                StatusCode = 400,
                Message = "Some questions were not found.",
                Result = false
            });
        }

        var currentUser = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";

        for (int i = 0; i < dto.QuestionIds.Count(); i++)
        {
            var question = questions.FirstOrDefault(q => q.Id == dto.QuestionIds[i]);
            if (question != null)
            {
                question.Order = i + 1;
                question.UpdatedAt = DateTime.UtcNow;
                question.UpdatedBy = currentUser;
                await _unitOfWork.CourseQuestions.UpdateAsync(question);
            }
        }

        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = "Questions reordered successfully.",
            Result = true
        });
    }
}

public class ReorderQuestionsDto
{
    public List<int> QuestionIds { get; set; } = new List<int>();
}

