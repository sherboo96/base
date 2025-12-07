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

public class PositionsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public PositionsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 10;

        var skip = (page - 1) * pageSize;

        Expression<Func<Position, bool>> filter = x => !x.IsDeleted;
        var total = await _unitOfWork.Positions.CountAsync(filter);
        var data = await _unitOfWork.Positions.GetAllAsync(
            pageSize,
            skip,
            filter,
            null,
            null,
            null
        );

        var response = new BaseResponse<IEnumerable<Position>>
        {
            StatusCode = 200,
            Message = "Positions retrieved successfully.",
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
        var item = await _unitOfWork.Positions.FindAsync(x => x.Id == id && !x.IsDeleted);
        return item == null
            ? NotFound(new BaseResponse<Position> { StatusCode = 404, Message = "Position not found." })
            : Ok(new BaseResponse<Position> { StatusCode = 200, Message = "Position retrieved successfully.", Result = item });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PositionDto dto)
    {
        var entity = await _unitOfWork.Positions.AddAsync(dto);
        await _unitOfWork.CompleteAsync();
        
        // Fetch the created entity
        var createdId = ((Position)entity).Id;
        var result = await _unitOfWork.Positions.FindAsync(x => x.Id == createdId && !x.IsDeleted);
        return CreatedAtAction(nameof(GetById), new { id = createdId }, new BaseResponse<Position> { StatusCode = 201, Message = "Position created successfully.", Result = result });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] PositionDto dto)
    {
        var existing = await _unitOfWork.Positions.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null) return NotFound(new BaseResponse<Position> { StatusCode = 404, Message = "Position not found." });

        existing.NameEn = dto.NameEn;
        existing.NameAr = dto.NameAr;
        existing.Code = dto.Code;
        existing.UpdatedAt = DateTime.Now;

        var updated = await _unitOfWork.Positions.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();
        
        // Fetch the updated entity
        var result = await _unitOfWork.Positions.FindAsync(x => x.Id == id && !x.IsDeleted);
        return Ok(new BaseResponse<Position> { StatusCode = 200, Message = "Position updated successfully.", Result = result });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _unitOfWork.Positions.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null) return NotFound(new BaseResponse<Position> { StatusCode = 404, Message = "Position not found." });
        
        existing.IsDeleted = true;
        existing.UpdatedAt = DateTime.Now;
        await _unitOfWork.CompleteAsync();
        return Ok(new BaseResponse<bool> { StatusCode = 200, Message = "Position deleted successfully.", Result = true });
    }
}
