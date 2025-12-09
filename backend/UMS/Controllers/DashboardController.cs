using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UMS.Dtos;
using UMS.Dtos.Shared;
using UMS.Models;
using UMS.Services;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]

public class DashboardController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly OrganizationAccessService _orgAccessService;

    public DashboardController(IUnitOfWork unitOfWork, OrganizationAccessService orgAccessService)
    {
        _unitOfWork = unitOfWork;
        _orgAccessService = orgAccessService;
    }

    [HttpGet("statistics")]
    public async Task<IActionResult> GetStatistics()
    {
        try
        {
            // Get organization filter based on user's role
            var orgFilter = await _orgAccessService.GetOrganizationFilterAsync();
            var canAccessAll = await _orgAccessService.CanAccessAllOrganizationsAsync();

            // Build user filter
            Expression<Func<User, bool>> userFilter = u => !u.IsDeleted;
            if (!canAccessAll && orgFilter.HasValue)
            {
                userFilter = u => !u.IsDeleted && u.OrganizationId == orgFilter.Value;
            }

            // Get user statistics
            var allUsers = await _unitOfWork.Users.GetAllAsync(10000, 0, userFilter, null, null, null);
            var usersList = allUsers.ToList();
            
            var totalUsers = usersList.Count;
            var activeUsers = usersList.Count(u => u.IsActive);
            var inactiveUsers = usersList.Count(u => !u.IsActive);
            var lockedUsers = usersList.Count(u => u.IsLocked);
            var usersWithTemporaryPassword = usersList.Count(u => u.IsTemporaryPassword);

            // Users by login method
            var usersByLoginMethod = usersList
                .GroupBy(u => u.LoginMethod.ToString())
                .ToDictionary(g => g.Key, g => g.Count());

            // Users by organization (only if user can access all)
            var usersByOrganization = new Dictionary<string, int>();
            if (canAccessAll)
            {
                var organizations = await _unitOfWork.Organizations.GetAllAsync(1000, 0, o => !o.IsDeleted, null, null, null);
                var orgsList = organizations.ToList();
                
                foreach (var org in orgsList)
                {
                    var userCount = usersList.Count(u => u.OrganizationId == org.Id);
                    if (userCount > 0)
                    {
                        usersByOrganization[org.Name] = userCount;
                    }
                }
            }
            else if (orgFilter.HasValue)
            {
                var org = await _unitOfWork.Organizations.FindAsync(o => o.Id == orgFilter.Value && !o.IsDeleted);
                if (org != null)
                {
                    usersByOrganization[org.Name] = totalUsers;
                }
            }

            // Build organization filter
            Expression<Func<Organization, bool>> orgFilterExpr = o => !o.IsDeleted;
            if (!canAccessAll && orgFilter.HasValue)
            {
                orgFilterExpr = o => !o.IsDeleted && o.Id == orgFilter.Value;
            }

            // Get other statistics
            var totalOrganizations = await _unitOfWork.Organizations.CountAsync(orgFilterExpr);

            Expression<Func<Department, bool>> deptFilter = d => !d.IsDeleted;
            if (!canAccessAll && orgFilter.HasValue)
            {
                deptFilter = d => !d.IsDeleted && d.OrganizationId == orgFilter.Value;
            }
            var totalDepartments = await _unitOfWork.Departments.CountAsync(deptFilter);

            Expression<Func<Role, bool>> roleFilter = r => !r.IsDeleted;
            if (!canAccessAll && orgFilter.HasValue)
            {
                roleFilter = r => !r.IsDeleted && 
                    (r.ApplyToAllOrganizations || (r.OrganizationId.HasValue && r.OrganizationId.Value == orgFilter.Value));
            }
            var totalRoles = await _unitOfWork.Roles.CountAsync(roleFilter);

            Expression<Func<Segment, bool>> segmentFilter = s => !s.IsDeleted;
            if (!canAccessAll && orgFilter.HasValue)
            {
                segmentFilter = s => !s.IsDeleted && s.OrganizationId == orgFilter.Value;
            }
            var totalSegments = await _unitOfWork.Segments.CountAsync(segmentFilter);

            Expression<Func<Location, bool>> locationFilter = l => !l.IsDeleted;
            if (!canAccessAll && orgFilter.HasValue)
            {
                locationFilter = l => !l.IsDeleted && l.OrganizationId == orgFilter.Value;
            }
            var totalLocations = await _unitOfWork.Locations.CountAsync(locationFilter);

            // Instructors and Institutions don't have organization relationship, so count all
            var totalInstructors = await _unitOfWork.Instructors.CountAsync(i => !i.IsDeleted);
            var totalInstitutions = await _unitOfWork.Institutions.CountAsync(i => !i.IsDeleted);

            Expression<Func<AdoptionUser, bool>> adoptionUserFilter = au => !au.IsDeleted;
            if (!canAccessAll && orgFilter.HasValue)
            {
                adoptionUserFilter = au => !au.IsDeleted && au.OrganizationId == orgFilter.Value;
            }
            var totalAdoptionUsers = await _unitOfWork.AdoptionUsers.CountAsync(adoptionUserFilter);

            // For job titles, filter by department's organization if needed
            Expression<Func<JobTitle, bool>> jobTitleFilter = jt => !jt.IsDeleted;
            if (!canAccessAll && orgFilter.HasValue)
            {
                // Get departments for this organization first
                var departments = await _unitOfWork.Departments.GetAllAsync(1000, 0, d => !d.IsDeleted && d.OrganizationId == orgFilter.Value, null, null, null);
                var departmentIds = departments.Select(dept => dept.Id).ToList();
                if (departmentIds.Any())
                {
                    jobTitleFilter = jt => !jt.IsDeleted && jt.DepartmentId.HasValue && departmentIds.Contains(jt.DepartmentId.Value);
                }
                else
                {
                    jobTitleFilter = jt => false; // No departments, so no job titles
                }
            }
            var totalJobTitles = await _unitOfWork.JobTitles.CountAsync(jobTitleFilter);

            // Positions don't have organization relationship, so count all
            var totalPositions = await _unitOfWork.Positions.CountAsync(p => !p.IsDeleted);

            var dashboardData = new DashboardDto
            {
                TotalUsers = totalUsers,
                ActiveUsers = activeUsers,
                InactiveUsers = inactiveUsers,
                LockedUsers = lockedUsers,
                TotalOrganizations = totalOrganizations,
                TotalDepartments = totalDepartments,
                TotalRoles = totalRoles,
                TotalSegments = totalSegments,
                TotalLocations = totalLocations,
                TotalInstructors = totalInstructors,
                TotalInstitutions = totalInstitutions,
                TotalAdoptionUsers = totalAdoptionUsers,
                TotalJobTitles = totalJobTitles,
                TotalPositions = totalPositions,
                UsersByLoginMethod = usersByLoginMethod,
                UsersByOrganization = usersByOrganization,
                UsersWithTemporaryPassword = usersWithTemporaryPassword
            };

            return Ok(new BaseResponse<DashboardDto>
            {
                StatusCode = 200,
                Message = "Dashboard statistics retrieved successfully.",
                Result = dashboardData
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new BaseResponse<DashboardDto>
            {
                StatusCode = 500,
                Message = $"Error retrieving dashboard statistics: {ex.Message}",
                Result = null
            });
        }
    }
}
