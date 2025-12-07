using System.Linq.Expressions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UMS.Dtos.Shared;
using UMS.Dtos;
using Microsoft.AspNetCore.Authorization;
using UMS.Models;
using AutoMapper;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class DepartmentsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;

    public DepartmentsController(IUnitOfWork unitOfWork, IMapper mapper)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] int? organization = null)
    {
        Expression<Func<Department, bool>> filter = org =>
            !org.IsDeleted &&
            (!organization.HasValue || org.OrganizationId == organization);

        page = page <= 0 ? 1 : page;
        pageSize = pageSize <= 0 ? 10 : pageSize;

        var skip = (page - 1) * pageSize;
        var total = await _unitOfWork.Departments.CountAsync(filter);
        var data = await _unitOfWork.Departments.GetAllAsync(take: pageSize, skip: skip, filter, null, null, new[] { "Organization" });

        return Ok(new BaseResponse<IEnumerable<Department>>
        {
            StatusCode = 200,
            Message = "Departments retrieved successfully.",
            Result = data,
            Total = total,
            Pagination = new Pagination { CurrentPage = page, PageSize = pageSize, Total = total }
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await _unitOfWork.Departments.FindAsync(x => x.Id == id && !x.IsDeleted, new[] { "Organization" });
        if (item == null)
            return NotFound(new BaseResponse<Department> { StatusCode = 404, Message = "Department not found." });

        return Ok(new BaseResponse<Department>
        {
            StatusCode = 200,
            Message = "Department retrieved successfully.",
            Result = item
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] DepartmentDto dto)
    {
        var entity = await _unitOfWork.Departments.AddAsync(dto);
        await _unitOfWork.CompleteAsync();

        return CreatedAtAction(nameof(GetById), new { id = ((Department)entity).Id }, new BaseResponse<Department>
        {
            StatusCode = 201,
            Message = "Department created successfully.",
            Result = (Department)entity
        });
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] DepartmentDto dto)
    {
        var existing = await _unitOfWork.Departments.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null)
        {
            return NotFound(new BaseResponse<Department> { StatusCode = 404, Message = "Department not found." });
        }

        existing.NameEn = dto.NameEn;
        existing.NameAr = dto.NameAr;
        existing.Code = dto.Code ?? string.Empty;
        existing.Type = dto.Type;
        existing.Level = dto.Level;
        existing.OrganizationId = dto.OrganizationId;
        existing.ParentDepartmentId = dto.ParentDepartmentId;
        existing.UpdatedAt = DateTime.UtcNow;

        var updated = await _unitOfWork.Departments.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();

        var result = await _unitOfWork.Departments.FindAsync(x => x.Id == id, new[] { "Organization" });
        return Ok(new BaseResponse<Department>
        {
            StatusCode = 200,
            Message = "Department updated successfully.",
            Result = result
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _unitOfWork.Departments.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null)
        {
            return NotFound(new BaseResponse<bool> { StatusCode = 404, Message = "Department not found.", Result = false });
        }

        existing.IsDeleted = true;
        existing.IsActive = false;
        existing.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.Departments.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();
        
        return Ok(new BaseResponse<bool> { StatusCode = 200, Message = "Department deleted successfully.", Result = true });
    }

}
