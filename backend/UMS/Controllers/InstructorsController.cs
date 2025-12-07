using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UMS.Dtos;
using UMS.Dtos.Shared;
using UMS.Models;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]

public class InstructorsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public InstructorsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] int? institution = null)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 10;

        var skip = (page - 1) * pageSize;

        Expression<Func<Instructor, bool>> filter = x => 
            !x.IsDeleted && 
            (!institution.HasValue || x.InstitutionId == institution);
        var total = await _unitOfWork.Instructors.CountAsync(filter);
        var data = await _unitOfWork.Instructors.GetAllAsync(
            pageSize,
            skip,
            filter,
            null,
            null,
            new[] { "Institution" }
        );

        var response = new BaseResponse<IEnumerable<Instructor>>
        {
            StatusCode = 200,
            Message = "Instructors retrieved successfully.",
            Result = data,
            Total = total,
            Pagination = new Pagination
            {
                CurrentPage = page,
                PageSize = pageSize,
                Total = total
            }
        };

        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await _unitOfWork.Instructors.FindAsync(x => x.Id == id && !x.IsDeleted, new[] { "Institution" });
        return item == null
            ? NotFound(new BaseResponse<Instructor> { StatusCode = 404, Message = "Instructor not found." })
            : Ok(new BaseResponse<Instructor> { StatusCode = 200, Message = "Instructor retrieved successfully.", Result = item });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] InstructorDto dto)
    {
        var entity = await _unitOfWork.Instructors.AddAsync(dto);
        await _unitOfWork.CompleteAsync();
        
        var createdId = ((Instructor)entity).Id;
        var result = await _unitOfWork.Instructors.FindAsync(x => x.Id == createdId && !x.IsDeleted, new[] { "Institution" });
        return CreatedAtAction(nameof(GetById), new { id = createdId }, new BaseResponse<Instructor> { StatusCode = 201, Message = "Instructor created successfully.", Result = result });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] InstructorDto dto)
    {
        var existing = await _unitOfWork.Instructors.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null) return NotFound(new BaseResponse<Instructor> { StatusCode = 404, Message = "Instructor not found." });

        existing.NameEn = dto.NameEn;
        existing.NameAr = dto.NameAr;
        existing.Email = dto.Email;
        existing.Phone = dto.Phone;
        existing.Bio = dto.Bio;
        existing.ProfileImage = dto.ProfileImage;
        existing.InstitutionId = dto.InstitutionId;
        existing.UpdatedAt = DateTime.Now;

        var updated = await _unitOfWork.Instructors.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();
        
        var result = await _unitOfWork.Instructors.FindAsync(x => x.Id == id && !x.IsDeleted, new[] { "Institution" });
        return Ok(new BaseResponse<Instructor> { StatusCode = 200, Message = "Instructor updated successfully.", Result = result });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _unitOfWork.Instructors.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null) return NotFound(new BaseResponse<Instructor> { StatusCode = 404, Message = "Instructor not found." });
        
        existing.IsDeleted = true;
        existing.UpdatedAt = DateTime.Now;
        await _unitOfWork.CompleteAsync();
        return Ok(new BaseResponse<bool> { StatusCode = 200, Message = "Instructor deleted successfully.", Result = true });
    }
}
