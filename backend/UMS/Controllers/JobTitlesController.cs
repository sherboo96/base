using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UMS.Dtos;
using UMS.Dtos.Shared;
using UMS.Models;
using UMS.Services;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]

public class JobTitlesController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly OrganizationAccessService _orgAccessService;

    public JobTitlesController(IUnitOfWork unitOfWork, OrganizationAccessService orgAccessService)
    {
        _unitOfWork = unitOfWork;
        _orgAccessService = orgAccessService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] int? department = null)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 10;

        var skip = (page - 1) * pageSize;

        // Get organization filter based on user's role
        var orgFilter = await _orgAccessService.GetOrganizationFilterAsync();
        
        Expression<Func<JobTitle, bool>> filter = x => 
            !x.IsDeleted && 
            (!department.HasValue || x.DepartmentId == department) &&
            (!orgFilter.HasValue || (x.Department != null && x.Department.OrganizationId == orgFilter.Value));
        var total = await _unitOfWork.JobTitles.CountAsync(filter);
        var data = await _unitOfWork.JobTitles.GetAllAsync(
            pageSize,
            skip,
            filter,
            null,
            null,
            new[] { "Department", "Department.Organization" }
        );

        var response = new BaseResponse<IEnumerable<JobTitle>>
        {
            StatusCode = 200,
            Message = "Job titles retrieved successfully.",
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
        var item = await _unitOfWork.JobTitles.FindAsync(x => x.Id == id && !x.IsDeleted, new[] { "Department", "Department.Organization" });
        return item == null
            ? NotFound(new BaseResponse<JobTitle> { StatusCode = 404, Message = "Job title not found." })
            : Ok(new BaseResponse<JobTitle> { StatusCode = 200, Message = "Job title retrieved successfully.", Result = item });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] JobTitleDto dto)
    {
        var entity = await _unitOfWork.JobTitles.AddAsync(dto);
        await _unitOfWork.CompleteAsync();
        
        // Fetch the created entity with Department relationship
        var createdId = ((JobTitle)entity).Id;
        var result = await _unitOfWork.JobTitles.FindAsync(x => x.Id == createdId && !x.IsDeleted, new[] { "Department", "Department.Organization" });
        return CreatedAtAction(nameof(GetById), new { id = createdId }, new BaseResponse<JobTitle> { StatusCode = 201, Message = "Job title created successfully.", Result = result });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] JobTitleDto dto)
    {
        var existing = await _unitOfWork.JobTitles.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null) return NotFound(new BaseResponse<JobTitle> { StatusCode = 404, Message = "Job title not found." });

        existing.NameEn = dto.NameEn;
        existing.NameAr = dto.NameAr;
        existing.Code = dto.Code;
        existing.Description = dto.Description;
        existing.DepartmentId = dto.DepartmentId;
        existing.UpdatedAt = DateTime.Now;

        var updated = await _unitOfWork.JobTitles.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();
        
        // Fetch the updated entity with Department relationship
        var result = await _unitOfWork.JobTitles.FindAsync(x => x.Id == id && !x.IsDeleted, new[] { "Department", "Department.Organization" });
        return Ok(new BaseResponse<JobTitle> { StatusCode = 200, Message = "Job title updated successfully.", Result = result });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _unitOfWork.JobTitles.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null) return NotFound(new BaseResponse<JobTitle> { StatusCode = 404, Message = "Job title not found." });
        
        existing.IsDeleted = true;
        existing.UpdatedAt = DateTime.Now;
        await _unitOfWork.CompleteAsync();
        return Ok(new BaseResponse<bool> { StatusCode = 200, Message = "Job title deleted successfully.", Result = true });
    }
}
