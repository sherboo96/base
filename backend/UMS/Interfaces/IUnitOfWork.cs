using UMS.Dtos;

namespace UMS.Interfaces;

public interface IUnitOfWork : IDisposable
{
    IBaseRepository<Organization, OrganizationDto> Organizations { get; }
    IBaseRepository<Department, DepartmentDto> Departments { get; }
    IBaseRepository<Role, RoleDto> Roles { get; }
    IBaseRepository<Permission, PermissionDto> Permissions { get; }
    IBaseRepository<User, UserDto> Users { get; }
    IBaseRepository<JobTitle, JobTitleDto> JobTitles { get; }
    IBaseRepository<Position, PositionDto> Positions { get; }
    IBaseRepository<Institution, InstitutionDto> Institutions { get; }
    IBaseRepository<Instructor, InstructorDto> Instructors { get; }
    IBaseRepository<SystemConfiguration, SystemConfigurationDto> SystemConfigurations { get; }
    IBaseRepository<Location, LocationDto> Locations { get; }

    IBaseRepository<UserRole, UserRoleDto> UserRoles { get; }
    IBaseRepository<RolePermission, RolePermissionDto> RolePermissions { get; }

    int Complete();
    Task<int> CompleteAsync();
}