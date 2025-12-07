using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UMS.Dtos;
using UMS.Dtos.Shared;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]

public class OrganizationsController : ControllerBase
{

    private readonly IUnitOfWork _unitOfWork;

    public OrganizationsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 10;

        var skip = (page - 1) * pageSize;

        var total = await _unitOfWork.Organizations.CountAsync(x => x.IsActive && !x.IsDeleted);
        var data = await _unitOfWork.Organizations.GetAllAsync(
            take: pageSize,
            skip: skip,
            match: x => x.IsActive && !x.IsDeleted
        );

        var response = new BaseResponse<IEnumerable<Organization>>
        {
            StatusCode = 200,
            Message = "Organizations retrieved successfully.",
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

    [HttpGet("main")]
    public async Task<IActionResult> GetMain()
    {
        var organization = await _unitOfWork.Organizations.FindAsync(x => x.IsMain && !x.IsDeleted);
        if (organization == null)
        {
            return NotFound(new BaseResponse<Organization>
            {
                StatusCode = 404,
                Message = "Main organization not found."
            });
        }

        return Ok(new BaseResponse<Organization>
        {
            StatusCode = 200,
            Message = "Main organization retrieved successfully.",
            Result = organization
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var organization = await _unitOfWork.Organizations.FindAsync(x => x.Id == id);
        if (organization == null)
        {
            return NotFound(new BaseResponse<Organization>
            {
                StatusCode = 404,
                Message = "Organization not found."
            });
        }

        return Ok(new BaseResponse<Organization>
        {
            StatusCode = 200,
            Message = "Organization retrieved successfully.",
            Result = organization
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] OrganizationDto dto)
    {
        var entity = await _unitOfWork.Organizations.AddAsync(dto);
        await _unitOfWork.CompleteAsync();

        return CreatedAtAction(nameof(GetById), new { id = ((Organization)entity).Id }, new BaseResponse<Organization>
        {
            StatusCode = 201,
            Message = "Organization created successfully.",
            Result = (Organization)entity
        });
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] OrganizationDto dto)
    {
        var existing = await _unitOfWork.Organizations.FindAsync(x => x.Id == id);
        if (existing == null)
        {
            return NotFound(new BaseResponse<Organization>
            {
                StatusCode = 404,
                Message = "Organization not found."
            });
        }

        existing.Name = dto.Name;
        existing.NameAr = dto.NameAr;
        existing.Code = dto.Code;
        existing.Domain = dto.Domain;
        existing.IsMain = dto.IsMain;
        existing.UpdatedAt = DateTime.Now;

        var updated = await _unitOfWork.Organizations.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<Organization>
        {
            StatusCode = 200,
            Message = "Organization updated successfully.",
            Result = updated
        });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _unitOfWork.Organizations.FindAsync(x => x.Id == id);
        if (existing == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "Organization not found.",
                Result = false
            });
        }

        existing.IsDeleted = true;
        existing.UpdatedAt = DateTime.Now;

        await _unitOfWork.Organizations.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();
        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = "Organization deleted successfully.",
            Result = true
        });
    }
}