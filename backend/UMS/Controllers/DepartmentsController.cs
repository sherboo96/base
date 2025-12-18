using System.Linq.Expressions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UMS.Dtos.Shared;
using UMS.Dtos;
using Microsoft.AspNetCore.Authorization;
using UMS.Models;
using AutoMapper;
using UMS.Const;
using UMS.Services;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class DepartmentsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;
    private readonly OrganizationAccessService _orgAccessService;

    public DepartmentsController(IUnitOfWork unitOfWork, IMapper mapper, OrganizationAccessService orgAccessService)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
        _orgAccessService = orgAccessService;
    }

    private static List<int>? _cachedMainOrgIds;
    private static DateTime _cacheExpiry = DateTime.MinValue;
    private const int CacheDurationMinutes = 5;

    private async Task<List<int>> GetMainOrganizationIdsAsync()
    {
        if (_cachedMainOrgIds != null && DateTime.UtcNow < _cacheExpiry)
        {
            return _cachedMainOrgIds;
        }

        var mainOrganizations = await _unitOfWork.Organizations.GetAllAsync(o => o.IsMain && !o.IsDeleted);
        _cachedMainOrgIds = mainOrganizations.Select(o => o.Id).ToList();
        _cacheExpiry = DateTime.UtcNow.AddMinutes(CacheDurationMinutes);
        return _cachedMainOrgIds;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] int? organization = null)
    {
        page = page <= 0 ? 1 : page;
        pageSize = pageSize <= 0 ? 10 : pageSize;

        var skip = (page - 1) * pageSize;
        
        // Get organization filter based on user's role
        var orgFilter = await _orgAccessService.GetOrganizationFilterAsync();
        var effectiveOrgFilter = organization ?? orgFilter;
        
        // Get cached main organization IDs
        var mainOrgIds = await GetMainOrganizationIdsAsync();
        
        // Only show departments for main organizations, and apply user's organization restriction
        Expression<Func<Department, bool>> filter = dept =>
            !dept.IsDeleted &&
            mainOrgIds.Contains(dept.OrganizationId) && // Only departments from main organizations
            (!effectiveOrgFilter.HasValue || dept.OrganizationId == effectiveOrgFilter.Value);

        // Run sequentially to avoid DbContext concurrency issues
        var total = await _unitOfWork.Departments.CountAsync(filter);
        var data = await _unitOfWork.Departments.GetAllAsync(
            pageSize,
            skip,
            filter,
            (Expression<Func<Department, object>>?)null,
            OrderBy.Ascending,
            new[] { "Organization", "ParentDepartment" });

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
        var item = await _unitOfWork.Departments.FindAsync(x => x.Id == id && !x.IsDeleted, new[] { "Organization", "ParentDepartment" });
        if (item == null)
            return NotFound(new BaseResponse<Department> { StatusCode = 404, Message = "Department not found." });

        return Ok(new BaseResponse<Department>
        {
            StatusCode = 200,
            Message = "Department retrieved successfully.",
            Result = item
        });
    }

    [HttpGet("all")]
    public async Task<IActionResult> GetAllDepartments([FromQuery] int? organizationId = null)
    {
        // Get organization filter based on user's role
        var orgFilter = await _orgAccessService.GetOrganizationFilterAsync();
        var effectiveOrgFilter = organizationId ?? orgFilter;
        
        // Get cached main organization IDs
        var mainOrgIds = await GetMainOrganizationIdsAsync();
        
        Expression<Func<Department, bool>> filter = dept =>
            !dept.IsDeleted &&
            mainOrgIds.Contains(dept.OrganizationId) &&
            (!effectiveOrgFilter.HasValue || dept.OrganizationId == effectiveOrgFilter.Value);

        var data = await _unitOfWork.Departments.GetAllAsync(match: filter, includes: new[] { "Organization", "ParentDepartment" });
        
        return Ok(new BaseResponse<IEnumerable<Department>>
        {
            StatusCode = 200,
            Message = "All departments retrieved successfully.",
            Result = data
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] DepartmentDto dto)
    {
        // Verify that the organization is a main organization
        var organization = await _unitOfWork.Organizations.FindAsync(o => o.Id == dto.OrganizationId);
        if (organization == null)
        {
            return NotFound(new BaseResponse<Department>
            {
                StatusCode = 404,
                Message = "Organization not found."
            });
        }

        if (!organization.IsMain)
        {
            return BadRequest(new BaseResponse<Department>
            {
                StatusCode = 400,
                Message = "Departments can only be created for main organizations."
            });
        }

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

        // Verify that the organization is a main organization if organization is being changed
        if (dto.OrganizationId != existing.OrganizationId)
        {
            var organization = await _unitOfWork.Organizations.FindAsync(o => o.Id == dto.OrganizationId);
            if (organization == null)
            {
                return NotFound(new BaseResponse<Department>
                {
                    StatusCode = 404,
                    Message = "Organization not found."
                });
            }

            if (!organization.IsMain)
            {
                return BadRequest(new BaseResponse<Department>
                {
                    StatusCode = 400,
                    Message = "Departments can only be assigned to main organizations."
                });
            }
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

        var result = await _unitOfWork.Departments.FindAsync(x => x.Id == id, new[] { "Organization", "ParentDepartment" });
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

    [HttpPost("upload")]
    public async Task<IActionResult> UploadDepartments([FromBody] BulkDepartmentUploadRequest request)
    {
        if (request.Departments == null || request.Departments.Count == 0)
        {
            return BadRequest(new BaseResponse<bool>
            {
                StatusCode = 400,
                Message = "No departments provided for upload.",
                Result = false
            });
        }

        var results = new List<BulkDepartmentUploadResult>();
        int successCount = 0;
        int failureCount = 0;
        
        // Dictionary to map original IDs to new IDs
        var idMapping = new Dictionary<int, int>();
        
        // Verify organization is main organization
        var organizationId = request.Departments.First().OrganizationId;
        var organization = await _unitOfWork.Organizations.FindAsync(o => o.Id == organizationId);
        if (organization == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "Organization not found.",
                Result = false
            });
        }

        if (!organization.IsMain)
        {
            return BadRequest(new BaseResponse<bool>
            {
                StatusCode = 400,
                Message = "Departments can only be created for main organizations.",
                Result = false
            });
        }

        // Get all existing departments for this organization to check for duplicates and parent mapping
        var existingDepartments = await _unitOfWork.Departments.GetAllAsync(
            match: d => d.OrganizationId == organizationId && !d.IsDeleted,
            includes: new[] { "ParentDepartment" }
        );
        var existingDepartmentsDict = existingDepartments.ToDictionary(d => d.Id, d => d);

        // First pass: Create departments without parent relationships (or with existing parents)
        foreach (var deptDto in request.Departments)
        {
            var result = new BulkDepartmentUploadResult
            {
                NameEn = deptDto.NameEn,
                NameAr = deptDto.NameAr,
                Success = false
            };

            try
            {
                // Check for duplicate by name
                var duplicate = existingDepartments.FirstOrDefault(d => 
                    d.NameEn.ToLower() == deptDto.NameEn.ToLower() || 
                    d.NameAr == deptDto.NameAr);

                if (duplicate != null)
                {
                    result.Message = $"Department with name '{deptDto.NameEn}' already exists.";
                    results.Add(result);
                    failureCount++;
                    continue;
                }

                // Check if parent exists (either in existing departments or will be created in this batch)
                int? parentDepartmentId = null;
                if (deptDto.ParentDepartmentId.HasValue)
                {
                    // First check if parent exists in existing departments
                    if (existingDepartmentsDict.ContainsKey(deptDto.ParentDepartmentId.Value))
                    {
                        parentDepartmentId = deptDto.ParentDepartmentId.Value;
                    }
                    // Then check if parent will be created in this batch (by checking if ParentDepartmentId is in the list)
                    else if (request.Departments.Any(d => d.OriginalId == deptDto.ParentDepartmentId.Value))
                    {
                        // Parent will be created in this batch, handle in second pass
                        parentDepartmentId = null; // Will be set in second pass
                    }
                    else
                    {
                        result.Message = $"Parent department with ID {deptDto.ParentDepartmentId.Value} not found.";
                        results.Add(result);
                        failureCount++;
                        continue;
                    }
                }

                // Create department
                var newDepartment = new Department
                {
                    NameEn = deptDto.NameEn,
                    NameAr = deptDto.NameAr,
                    Code = !string.IsNullOrWhiteSpace(deptDto.Code) ? deptDto.Code : GenerateCodeFromName(deptDto.NameEn),
                    Type = !string.IsNullOrWhiteSpace(deptDto.Type) ? deptDto.Type : "Department",
                    Level = !string.IsNullOrWhiteSpace(deptDto.Level) ? deptDto.Level : "DepartmentHead",
                    OrganizationId = deptDto.OrganizationId,
                    ParentDepartmentId = parentDepartmentId,
                    IsActive = true,
                    CreatedOn = DateTime.UtcNow,
                    CreatedBy = User.Identity?.Name ?? "System"
                };

                var created = await _unitOfWork.Departments.AddAsync(newDepartment);
                await _unitOfWork.CompleteAsync();

                // Map original ID to new ID if provided
                if (deptDto.OriginalId.HasValue)
                {
                    idMapping[deptDto.OriginalId.Value] = ((Department)created).Id;
                }

                result.Success = true;
                result.Message = "Department created successfully.";
                result.NewId = ((Department)created).Id;
                results.Add(result);
                successCount++;
            }
            catch (Exception ex)
            {
                result.Message = $"Error: {ex.Message}";
                results.Add(result);
                failureCount++;
            }
        }

        // Second pass: Update parent relationships for departments that reference other departments in the batch
        foreach (var deptDto in request.Departments)
        {
            if (!deptDto.ParentDepartmentId.HasValue || !deptDto.OriginalId.HasValue)
                continue;

            // Check if parent was created in this batch (by checking if ParentDepartmentId maps to a new ID)
            if (idMapping.ContainsKey(deptDto.ParentDepartmentId.Value))
            {
                // Find the department we just created by matching the original ID
                var createdDept = results.FirstOrDefault(r => 
                    r.NameEn == deptDto.NameEn && 
                    r.NameAr == deptDto.NameAr &&
                    r.Success && 
                    r.NewId.HasValue);

                if (createdDept != null && createdDept.NewId.HasValue)
                {
                    var department = await _unitOfWork.Departments.FindAsync(d => d.Id == createdDept.NewId.Value);
                    if (department != null)
                    {
                        // Update parent relationship (only if it's null, meaning parent was in the batch)
                        if (department.ParentDepartmentId == null)
                        {
                            department.ParentDepartmentId = idMapping[deptDto.ParentDepartmentId.Value];
                            department.UpdatedAt = DateTime.UtcNow;
                            department.UpdatedBy = User.Identity?.Name ?? "System";
                            await _unitOfWork.Departments.UpdateAsync(department);
                            await _unitOfWork.CompleteAsync();
                        }
                    }
                }
            }
        }

        return Ok(new BaseResponse<BulkDepartmentUploadResponse>
        {
            StatusCode = 200,
            Message = $"Upload completed. {successCount} succeeded, {failureCount} failed.",
            Result = new BulkDepartmentUploadResponse
            {
                Total = request.Departments.Count,
                SuccessCount = successCount,
                FailureCount = failureCount,
                Results = results
            }
        });
    }

    private string GenerateCodeFromName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            return $"DEPT_{DateTime.UtcNow.Ticks}";

        var code = name.ToUpper()
            .Replace(" ", "_")
            .Replace("-", "_")
            .Replace(".", "_")
            .Replace(",", "_")
            .Replace("'", "")
            .Replace("\"", "");

        // Remove special characters, keep only letters, numbers, and underscores
        code = new string(code.Where(c => char.IsLetterOrDigit(c) || c == '_').ToArray());

        // Limit length
        if (code.Length > 50)
            code = code.Substring(0, 50);

        return code;
    }

    [HttpPatch("{id}/move")]
    public async Task<IActionResult> MoveDepartment(int id, [FromBody] MoveDepartmentDto dto)
    {
        var department = await _unitOfWork.Departments.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (department == null)
        {
            return NotFound(new BaseResponse<Department> { StatusCode = 404, Message = "Department not found." });
        }

        // Prevent moving department to itself or creating circular references
        if (dto.NewParentDepartmentId.HasValue && dto.NewParentDepartmentId.Value == id)
        {
            return BadRequest(new BaseResponse<Department>
            {
                StatusCode = 400,
                Message = "A department cannot be its own parent."
            });
        }

        // Check for circular reference: ensure new parent is not a descendant
        if (dto.NewParentDepartmentId.HasValue)
        {
            var newParent = await _unitOfWork.Departments.FindAsync(x => x.Id == dto.NewParentDepartmentId.Value && !x.IsDeleted);
            if (newParent == null)
            {
                return NotFound(new BaseResponse<Department>
                {
                    StatusCode = 404,
                    Message = "Parent department not found."
                });
            }

            // Check if new parent is a descendant of the department being moved
            var isDescendant = await IsDescendantOf(dto.NewParentDepartmentId.Value, id);
            if (isDescendant)
            {
                return BadRequest(new BaseResponse<Department>
                {
                    StatusCode = 400,
                    Message = "Cannot move department: would create circular reference."
                });
            }
        }

        var oldParentId = department.ParentDepartmentId;
        department.ParentDepartmentId = dto.NewParentDepartmentId;
        department.UpdatedAt = DateTime.UtcNow;

        // If parent changed or order index specified, update order
        if (dto.NewParentDepartmentId != oldParentId || dto.NewOrderIndex.HasValue)
        {
            var targetParentId = dto.NewParentDepartmentId;
            
            // Get all siblings including the current department (for reordering within same parent)
            var allSiblings = await _unitOfWork.Departments.GetAllAsync(
                d => !d.IsDeleted && d.ParentDepartmentId == targetParentId
            );
            
            var siblingList = allSiblings.Where(s => s.Id != id).ToList();
            var currentOrder = department.OrderIndex ?? int.MaxValue;
            
            // If order index is specified, insert at that position
            if (dto.NewOrderIndex.HasValue)
            {
                var newOrder = dto.NewOrderIndex.Value;
                
                // If moving within the same parent, handle reordering
                if (dto.NewParentDepartmentId == oldParentId)
                {
                    // Moving within same parent - adjust positions
                    if (newOrder < currentOrder)
                    {
                        // Moving forward (to lower index) - shift items between newOrder and currentOrder forward
                        foreach (var sibling in siblingList)
                        {
                            var siblingOrder = sibling.OrderIndex ?? int.MaxValue;
                            if (siblingOrder >= newOrder && siblingOrder < currentOrder)
                            {
                                sibling.OrderIndex = siblingOrder + 1;
                                await _unitOfWork.Departments.UpdateAsync(sibling);
                            }
                        }
                    }
                    else if (newOrder > currentOrder)
                    {
                        // Moving backward (to higher index) - shift items between currentOrder and newOrder backward
                        foreach (var sibling in siblingList)
                        {
                            var siblingOrder = sibling.OrderIndex ?? int.MaxValue;
                            if (siblingOrder > currentOrder && siblingOrder <= newOrder)
                            {
                                sibling.OrderIndex = siblingOrder - 1;
                                await _unitOfWork.Departments.UpdateAsync(sibling);
                            }
                        }
                    }
                }
                else
                {
                    // Moving to different parent - shift siblings at target position
                    foreach (var sibling in siblingList)
                    {
                        var siblingOrder = sibling.OrderIndex ?? int.MaxValue;
                        if (siblingOrder >= newOrder)
                        {
                            sibling.OrderIndex = siblingOrder + 1;
                            await _unitOfWork.Departments.UpdateAsync(sibling);
                        }
                    }
                }
                
                department.OrderIndex = newOrder;
            }
            else
            {
                // If no order specified, place at the end
                var maxOrder = siblingList.Any() 
                    ? siblingList.Max(s => s.OrderIndex ?? int.MaxValue)
                    : -1;
                if (maxOrder == int.MaxValue) maxOrder = -1; // Handle null values
                department.OrderIndex = maxOrder + 1;
            }
        }

        await _unitOfWork.Departments.UpdateAsync(department);
        await _unitOfWork.CompleteAsync();

        var result = await _unitOfWork.Departments.FindAsync(x => x.Id == id, new[] { "Organization", "ParentDepartment" });
        return Ok(new BaseResponse<Department>
        {
            StatusCode = 200,
            Message = "Department moved successfully.",
            Result = result
        });
    }

    private async Task<bool> IsDescendantOf(int potentialDescendantId, int ancestorId)
    {
        // Load all departments once to avoid N+1 queries
        var allDepartments = await _unitOfWork.Departments.GetAllAsync(
            d => !d.IsDeleted && (d.Id == potentialDescendantId || d.ParentDepartmentId.HasValue),
            includes: new[] { "ParentDepartment" }
        );
        
        var departmentMap = allDepartments.ToDictionary(d => d.Id);
        
        if (!departmentMap.ContainsKey(potentialDescendantId))
            return false;

        var current = departmentMap[potentialDescendantId];
        int depth = 0;
        const int maxDepth = 100; // Prevent infinite loops

        while (current.ParentDepartmentId.HasValue && depth < maxDepth)
        {
            if (current.ParentDepartmentId.Value == ancestorId)
                return true;

            if (!departmentMap.ContainsKey(current.ParentDepartmentId.Value))
                break;

            current = departmentMap[current.ParentDepartmentId.Value];
            depth++;
        }

        return false;
    }

}

public class MoveDepartmentDto
{
    public int? NewParentDepartmentId { get; set; }
    public int? NewOrderIndex { get; set; }
}
