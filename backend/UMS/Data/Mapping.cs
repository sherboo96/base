
using UMS.Dtos;
using AutoMapper;

namespace UMS.Data;

public class UserIdToStringResolver : IValueResolver<UserRoleDto, UserRole, string>
{
    public string Resolve(UserRoleDto source, UserRole destination, string destMember, ResolutionContext context)
    {
        return source?.UserId.ToString() ?? "0";
    }
}

public class UserIdToIntResolver : IValueResolver<UserRole, UserRoleDto, int>
{
    public int Resolve(UserRole source, UserRoleDto destination, int destMember, ResolutionContext context)
    {
        if (source?.UserId == null)
            return 0;
        return int.TryParse(source.UserId, out var userIdInt) ? userIdInt : 0;
    }
}

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

        // AdoptionUser
        CreateMap<AdoptionUser, AdoptionUserDto>().ReverseMap();

        // CourseTab
        CreateMap<CourseTab, CourseTabDto>().ReverseMap();

        // Course
        CreateMap<Course, CourseDto>()
            .ForMember(dest => dest.LearningOutcomes, opt => opt.MapFrom(src => src.LearningOutcomes))
            .ForMember(dest => dest.CourseContents, opt => opt.MapFrom(src => src.CourseContents))
            .ForMember(dest => dest.InstructorIds, opt => opt.MapFrom(src => src.CourseInstructors.Select(ci => ci.InstructorId)))
            .ForMember(dest => dest.Instructors, opt => opt.MapFrom(src => src.CourseInstructors.Select(ci => ci.Instructor)))
            .ReverseMap()
            .ForMember(dest => dest.LearningOutcomes, opt => opt.Ignore())
            .ForMember(dest => dest.CourseContents, opt => opt.Ignore())
            .ForMember(dest => dest.CourseInstructors, opt => opt.Ignore());

        // CourseLearningOutcome
        CreateMap<CourseLearningOutcome, CourseLearningOutcomeDto>().ReverseMap();

        // CourseContent
        CreateMap<CourseContent, CourseContentDto>().ReverseMap();

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
        // UserRole: UserId is string (GUID from Identity), UserRoleDto: UserId is int
        // We need custom mapping to handle this conversion
        CreateMap<UserRole, UserRoleDto>()
            .ForMember(dest => dest.UserId, opt => opt.MapFrom<UserIdToIntResolver>());
        CreateMap<UserRoleDto, UserRole>()
            .ForMember(dest => dest.UserId, opt => opt.MapFrom<UserIdToStringResolver>());
        CreateMap<RolePermission, RolePermissionDto>().ReverseMap();
        CreateMap<RoleSystem, RoleSystemDto>().ReverseMap();
        CreateMap<UserSystem, UserSystemDto>().ReverseMap();
    }
}
