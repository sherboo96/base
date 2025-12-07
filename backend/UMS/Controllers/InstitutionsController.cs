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

public class InstitutionsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public InstitutionsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 10;

        var skip = (page - 1) * pageSize;

        Expression<Func<Institution, bool>> filter = x => !x.IsDeleted;
        var total = await _unitOfWork.Institutions.CountAsync(filter);
        var data = await _unitOfWork.Institutions.GetAllAsync(
            pageSize,
            skip,
            filter,
            null,
            null,
            null
        );

        var response = new BaseResponse<IEnumerable<Institution>>
        {
            StatusCode = 200,
            Message = "Institutions retrieved successfully.",
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
        var item = await _unitOfWork.Institutions.FindAsync(x => x.Id == id && !x.IsDeleted);
        return item == null
            ? NotFound(new BaseResponse<Institution> { StatusCode = 404, Message = "Institution not found." })
            : Ok(new BaseResponse<Institution> { StatusCode = 200, Message = "Institution retrieved successfully.", Result = item });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] InstitutionDto dto)
    {
        var entity = await _unitOfWork.Institutions.AddAsync(dto);
        await _unitOfWork.CompleteAsync();
        
        var createdId = ((Institution)entity).Id;
        var result = await _unitOfWork.Institutions.FindAsync(x => x.Id == createdId && !x.IsDeleted);
        return CreatedAtAction(nameof(GetById), new { id = createdId }, new BaseResponse<Institution> { StatusCode = 201, Message = "Institution created successfully.", Result = result });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] InstitutionDto dto)
    {
        var existing = await _unitOfWork.Institutions.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null) return NotFound(new BaseResponse<Institution> { StatusCode = 404, Message = "Institution not found." });

        existing.Name = dto.Name;
        existing.NameAr = dto.NameAr;
        existing.UpdatedAt = DateTime.Now;

        var updated = await _unitOfWork.Institutions.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();
        
        var result = await _unitOfWork.Institutions.FindAsync(x => x.Id == id && !x.IsDeleted);
        return Ok(new BaseResponse<Institution> { StatusCode = 200, Message = "Institution updated successfully.", Result = result });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _unitOfWork.Institutions.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null) return NotFound(new BaseResponse<Institution> { StatusCode = 404, Message = "Institution not found." });
        
        existing.IsDeleted = true;
        existing.UpdatedAt = DateTime.Now;
        await _unitOfWork.CompleteAsync();
        return Ok(new BaseResponse<bool> { StatusCode = 200, Message = "Institution deleted successfully.", Result = true });
    }
}
