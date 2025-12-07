using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UMS.Dtos.Shared;
using UMS.Dtos;
using Microsoft.AspNetCore.Authorization;
using UMS.Models;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]

public class RolesController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    public RolesController(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var skip = (page - 1) * pageSize;
        var total = await _unitOfWork.Roles.CountAsync(x => !x.IsDeleted);
        var data = await _unitOfWork.Roles.GetAllAsync(pageSize, skip, null);
        return Ok(new BaseResponse<IEnumerable<Role>> { StatusCode = 200, Message = "Roles retrieved successfully.", Result = data, Total = total, Pagination = new Pagination { CurrentPage = page, PageSize = pageSize, Total = total } });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await _unitOfWork.Roles.FindAsync(x => x.Id == id);
        return item == null ? NotFound(new BaseResponse<Role> { StatusCode = 404, Message = "Role not found." }) : Ok(new BaseResponse<Role> { StatusCode = 200, Message = "Role retrieved successfully.", Result = item });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] RoleDto dto)
    {
        var entity = await _unitOfWork.Roles.AddAsync(dto);
        await _unitOfWork.CompleteAsync();
        return CreatedAtAction(nameof(GetById), new { id = ((Role)entity).Id }, new BaseResponse<Role> { StatusCode = 201, Message = "Role created successfully.", Result = (Role)entity });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] RoleDto dto)
    {
        var existing = await _unitOfWork.Roles.FindAsync(x => x.Id == id);
        if (existing == null) return NotFound(new BaseResponse<Role> { StatusCode = 404, Message = "Role not found." });

        existing.Name = dto.Name;

        var updated = await _unitOfWork.Roles.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();
        return Ok(new BaseResponse<Role> { StatusCode = 200, Message = "Role updated successfully.", Result = updated });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _unitOfWork.Roles.DeleteAsync(id);
        if (!deleted) return NotFound(new BaseResponse<bool> { StatusCode = 404, Message = "Role not found.", Result = false });
        await _unitOfWork.CompleteAsync();
        return Ok(new BaseResponse<bool> { StatusCode = 200, Message = "Role deleted successfully.", Result = true });
    }
}
