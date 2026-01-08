
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
            .ForMember(dest => dest.TargetDepartmentIds, opt => opt.MapFrom(src => string.IsNullOrEmpty(src.TargetDepartmentIds) ? null : System.Text.Json.JsonSerializer.Deserialize<List<int>>(src.TargetDepartmentIds, (System.Text.Json.JsonSerializerOptions)null)))
            .ForMember(dest => dest.TargetOrganizationIds, opt => opt.MapFrom(src => string.IsNullOrEmpty(src.TargetOrganizationIds) ? null : System.Text.Json.JsonSerializer.Deserialize<List<int>>(src.TargetOrganizationIds, (System.Text.Json.JsonSerializerOptions)null)))
            .ForMember(dest => dest.TargetSegmentIds, opt => opt.MapFrom(src => string.IsNullOrEmpty(src.TargetSegmentIds) ? null : System.Text.Json.JsonSerializer.Deserialize<List<int>>(src.TargetSegmentIds, (System.Text.Json.JsonSerializerOptions)null)))
            .ForMember(dest => dest.TargetDepartmentRoles, opt => opt.MapFrom(src => string.IsNullOrEmpty(src.TargetDepartmentRoles) ? null : System.Text.Json.JsonSerializer.Deserialize<Dictionary<int, string>>(src.TargetDepartmentRoles, (System.Text.Json.JsonSerializerOptions)null)))
            .ReverseMap()
            .ForMember(dest => dest.TargetDepartmentIds, opt => opt.MapFrom(src => src.TargetDepartmentIds == null ? null : System.Text.Json.JsonSerializer.Serialize(src.TargetDepartmentIds, (System.Text.Json.JsonSerializerOptions)null)))
            .ForMember(dest => dest.TargetOrganizationIds, opt => opt.MapFrom(src => src.TargetOrganizationIds == null ? null : System.Text.Json.JsonSerializer.Serialize(src.TargetOrganizationIds, (System.Text.Json.JsonSerializerOptions)null)))
            .ForMember(dest => dest.TargetSegmentIds, opt => opt.MapFrom(src => src.TargetSegmentIds == null ? null : System.Text.Json.JsonSerializer.Serialize(src.TargetSegmentIds, (System.Text.Json.JsonSerializerOptions)null)))
            .ForMember(dest => dest.TargetDepartmentRoles, opt => opt.MapFrom(src => src.TargetDepartmentRoles == null ? null : System.Text.Json.JsonSerializer.Serialize(src.TargetDepartmentRoles, (System.Text.Json.JsonSerializerOptions)null)))
            .ForMember(dest => dest.LearningOutcomes, opt => opt.Ignore())
            .ForMember(dest => dest.CourseContents, opt => opt.Ignore())
            .ForMember(dest => dest.CourseInstructors, opt => opt.Ignore());

        // CourseLearningOutcome
        CreateMap<CourseLearningOutcome, CourseLearningOutcomeDto>().ReverseMap();

        // CourseContent
        CreateMap<CourseContent, CourseContentDto>().ReverseMap();

        // CourseQuestion
        CreateMap<CourseQuestion, CourseQuestionDto>().ReverseMap();

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

        // Event
        CreateMap<Event, EventDto>()
            .ForMember(dest => dest.SpeakerIds, opt => opt.MapFrom(src => src.Speakers.Select(s => s.Id)))
            .ForMember(dest => dest.Speakers, opt => opt.MapFrom(src => src.Speakers))
            .ReverseMap()
            .ForMember(dest => dest.Speakers, opt => opt.Ignore());

        // EventSpeaker
        CreateMap<EventSpeaker, EventSpeakerDto>().ReverseMap();

        // EventOrganization
        CreateMap<EventOrganization, EventOrganizationDto>().ReverseMap();

        // EventRegistration
        CreateMap<EventRegistration, EventRegistrationDto>()
            .ForMember(dest => dest.Attendees, opt => opt.MapFrom(src => src.Attendees))
            .ReverseMap()
            .ForMember(dest => dest.Attendees, opt => opt.Ignore());

        // EventAttendee
        CreateMap<EventAttendee, EventAttendeeDto>().ReverseMap();
        
        // Digital Library
        CreateMap<DigitalLibraryItem, DigitalLibraryItemDto>()
            .ForMember(dest => dest.CourseName, opt => opt.MapFrom(src => src.Course != null ? src.Course.Name : null))
            .ForMember(dest => dest.FilesCount, opt => opt.MapFrom(src => src.Files.Count))
            .ReverseMap()
            .ForMember(dest => dest.Files, opt => opt.Ignore())
            .ForMember(dest => dest.PosterPath, opt => opt.MapFrom(src => src.PosterPath ?? string.Empty));

        CreateMap<DigitalLibraryFile, DigitalLibraryFileDto>()
            .ForMember(dest => dest.FileType, opt => opt.MapFrom(src => (int)src.FileType))
            .ReverseMap()
            .ForMember(dest => dest.FileType, opt => opt.MapFrom(src => (DigitalFileType)src.FileType));
            
        CreateMap<UserDigitalLibraryProgress, UserDigitalLibraryProgressDto>().ReverseMap();
    }
}
