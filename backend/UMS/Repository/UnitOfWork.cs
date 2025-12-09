using Azure.Core;
using Azure;
using System.Diagnostics;
using UMS.Dtos;

namespace UMS.Repository;

public class UnitOfWork : IUnitOfWork
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public UnitOfWork(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;

        Organizations = new BaseRepository<Organization, OrganizationDto>(_context, _mapper);
        Departments = new BaseRepository<Department, DepartmentDto>(_context, _mapper);
        Roles = new BaseRepository<Role, RoleDto>(_context, _mapper);
        Permissions = new BaseRepository<Permission, PermissionDto>(_context, _mapper);
        Users = new BaseRepository<User, UserDto>(_context, _mapper);
        JobTitles = new BaseRepository<JobTitle, JobTitleDto>(_context, _mapper);
        Positions = new BaseRepository<Position, PositionDto>(_context, _mapper);
        Institutions = new BaseRepository<Institution, InstitutionDto>(_context, _mapper);
        Instructors = new BaseRepository<Instructor, InstructorDto>(_context, _mapper);
        SystemConfigurations = new BaseRepository<SystemConfiguration, SystemConfigurationDto>(_context, _mapper);
        Locations = new BaseRepository<Location, LocationDto>(_context, _mapper);
        Segments = new SegmentRepository(_context, _mapper);

        UserRoles = new BaseRepository<UserRole, UserRoleDto>(_context, _mapper);
        RolePermissions = new BaseRepository<RolePermission, RolePermissionDto>(_context, _mapper);
    }

    public IBaseRepository<Organization, OrganizationDto> Organizations { get; private set; }
    public IBaseRepository<Department, DepartmentDto> Departments { get; private set; }
    public IBaseRepository<Role, RoleDto> Roles { get; private set; }
    public IBaseRepository<Permission, PermissionDto> Permissions { get; private set; }
    public IBaseRepository<User, UserDto> Users { get; private set; }
    public IBaseRepository<JobTitle, JobTitleDto> JobTitles { get; private set; }
    public IBaseRepository<Position, PositionDto> Positions { get; private set; }
    public IBaseRepository<Institution, InstitutionDto> Institutions { get; private set; }
    public IBaseRepository<Instructor, InstructorDto> Instructors { get; private set; }
    public IBaseRepository<SystemConfiguration, SystemConfigurationDto> SystemConfigurations { get; private set; }
    public IBaseRepository<Location, LocationDto> Locations { get; private set; }
    public ISegmentRepository Segments { get; private set; }

    public IBaseRepository<UserRole, UserRoleDto> UserRoles { get; private set; }
    public IBaseRepository<RolePermission, RolePermissionDto> RolePermissions { get; private set; }

    public int Complete()
    {
        return _context.SaveChanges();
    }

    public Task<int> CompleteAsync()
    {
        return _context.SaveChangesAsync();
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
