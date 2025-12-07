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

        var total = await _unitOfWork.Organizations.CountAsync(x => true);
        var data = await _unitOfWork.Organizations.GetAllAsync(
            take: pageSize,
            skip: skip
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

        var updated = await _unitOfWork.Organizations.UpdateAsync(dto);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<Organization>
        {
            StatusCode = 200,
            Message = "Organization updated successfully.",
            Result = updated
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _unitOfWork.Organizations.DeleteAsync(id);
        if (!deleted)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "Organization not found.",
                Result = false
            });
        }

        await _unitOfWork.CompleteAsync();
        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = "Organization deleted successfully.",
            Result = true
        });
    }
}