using UMS.Dtos;
using UMS.Models;

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
    IBaseRepository<Public, PublicDto> Publics { get; }
    IBaseRepository<Location, LocationDto> Locations { get; }
    ISegmentRepository Segments { get; }
    IBaseRepository<AdoptionUser, AdoptionUserDto> AdoptionUsers { get; }
    IBaseRepository<CourseTab, CourseTabDto> CourseTabs { get; }
    IBaseRepository<Course, CourseDto> Courses { get; }
    IBaseRepository<CourseTabApproval, CourseTabApprovalDto> CourseTabApprovals { get; }
    IBaseRepository<CourseEnrollmentApproval, CourseEnrollmentApprovalDto> CourseEnrollmentApprovals { get; }
    IBaseRepository<CourseQuestion, CourseQuestionDto> CourseQuestions { get; }
    IBaseRepository<Event, EventDto> Events { get; }
    IBaseRepository<EventSpeaker, EventSpeakerDto> EventSpeakers { get; }
    IBaseRepository<EventOrganization, EventOrganizationDto> EventOrganizations { get; }
    IBaseRepository<EventRegistration, EventRegistrationDto> EventRegistrations { get; }
    IBaseRepository<EventAttendee, EventAttendeeDto> EventAttendees { get; }

    IBaseRepository<UserRole, UserRoleDto> UserRoles { get; }
    IBaseRepository<RolePermission, RolePermissionDto> RolePermissions { get; }

    int Complete();
    Task<int> CompleteAsync();
}