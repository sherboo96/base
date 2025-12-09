using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using UMS.Models;

namespace UMS.Services;

public class OrganizationAccessService
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IUnitOfWork _unitOfWork;

    public OrganizationAccessService(IHttpContextAccessor httpContextAccessor, IUnitOfWork unitOfWork)
    {
        _httpContextAccessor = httpContextAccessor;
        _unitOfWork = unitOfWork;
    }

    /// <summary>
    /// Gets the current user's organization ID from JWT claims
    /// </summary>
    public async Task<int?> GetUserOrganizationIdAsync()
    {
        var organizationCode = _httpContextAccessor.HttpContext?.User?.FindFirst("Organization")?.Value;
        if (string.IsNullOrEmpty(organizationCode))
        {
            // Try to get from user ID
            var userId = GetUserId();
            if (!string.IsNullOrEmpty(userId))
            {
                var user = await _unitOfWork.Users.FindAsync(u => u.Id == userId);
                return user?.OrganizationId;
            }
            return null;
        }

        var organization = await _unitOfWork.Organizations.FindAsync(o => o.Code == organizationCode && !o.IsDeleted);
        return organization?.Id;
    }

    /// <summary>
    /// Gets the current user's ID from JWT claims
    /// </summary>
    public string? GetUserId()
    {
        return _httpContextAccessor.HttpContext?.User?.FindFirst("UserId")?.Value
            ?? _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? _httpContextAccessor.HttpContext?.User?.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
    }

    /// <summary>
    /// Checks if the current user's role allows access to all organizations
    /// Returns true if user should see all organizations, false if only their own
    /// </summary>
    public async Task<bool> CanAccessAllOrganizationsAsync()
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
        {
            return false; // Default to restricted access if user not found
        }

        // Get user's roles
        var userRoles = await _unitOfWork.UserRoles.GetAllAsync(
            ur => ur.UserId == userId,
            includes: new[] { "Role" });

        if (userRoles == null || !userRoles.Any())
        {
            return false; // No roles = restricted access
        }

        // Check if user has SuperAdmin role (always has access to all)
        var isSuperAdmin = userRoles.Any(ur => ur.Role.Name == "SuperAdmin");
        if (isSuperAdmin)
        {
            return true;
        }

        // Check if any role has ApplyToAllOrganizations = true
        return userRoles.Any(ur => ur.Role.ApplyToAllOrganizations);
    }

    /// <summary>
    /// Gets the organization ID filter for the current user
    /// Returns null if user can access all organizations, otherwise returns user's organization ID
    /// </summary>
    public async Task<int?> GetOrganizationFilterAsync()
    {
        var canAccessAll = await CanAccessAllOrganizationsAsync();
        if (canAccessAll)
        {
            return null; // null means no filter (all organizations)
        }

        return await GetUserOrganizationIdAsync();
    }
}
