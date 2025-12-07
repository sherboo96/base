
using UMS.Dtos;

namespace UMS.Data;

public class Mapping: Profile
{
    public Mapping()
    {
        // Organization
        CreateMap<Organization, OrganizationDto>().ReverseMap();

        // Department
        CreateMap<Department, DepartmentDto>().ReverseMap();

        // Role
        CreateMap<Role, RoleDto>().ReverseMap();

        // Permission
        CreateMap<Permission, PermissionDto>().ReverseMap();

        // System
        CreateMap<SystemEntity, SystemDto>().ReverseMap();

        // User
        CreateMap<User, UserDto>()
            .ForMember(dest => dest.JobTitle, opt => opt.MapFrom(src => src.JobTitle))
            .ReverseMap();

        // JobTitle
        CreateMap<JobTitle, JobTitleDto>().ReverseMap();

        // Position
        CreateMap<Position, PositionDto>().ReverseMap();

        // Institution
        CreateMap<Institution, InstitutionDto>().ReverseMap();

        // Instructor
        CreateMap<Instructor, InstructorDto>().ReverseMap();

        // Location
        CreateMap<Location, LocationDto>().ReverseMap();

        // Structure
        CreateMap<Structure, StructureDto>()
            .ForMember(dest => dest.AssignedUsers, opt => opt.MapFrom(src => src.StructureUsers))
            .ReverseMap();

        // StructureUser
        CreateMap<StructureUser, StructureUserDto>()
            .ForMember(dest => dest.User, opt => opt.MapFrom(src => src.User))
            .ReverseMap();

        // DepartmentUser
        CreateMap<DepartmentUser, DepartmentUserDto>()
            .ForMember(dest => dest.User, opt => opt.MapFrom(src => src.User))
            .ReverseMap();

        // Join Entities
        CreateMap<UserRole, UserRoleDto>().ReverseMap();
        CreateMap<RolePermission, RolePermissionDto>().ReverseMap();
        CreateMap<RoleSystem, RoleSystemDto>().ReverseMap();
        CreateMap<UserSystem, UserSystemDto>().ReverseMap();
    }
}
