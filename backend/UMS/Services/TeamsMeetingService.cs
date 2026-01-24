using Microsoft.Graph;
using Azure.Identity;
using Microsoft.Graph.Models;
using UMS.Interfaces;
using UMS.Dtos.Shared;
using Microsoft.EntityFrameworkCore;
using GraphEvent = Microsoft.Graph.Models.Event;
using GraphLocation = Microsoft.Graph.Models.Location;
using UMS.Models;

namespace UMS.Services;

public class TeamsMeetingService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<TeamsMeetingService> _logger;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ApplicationDbContext _context;
    private GraphServiceClient? _graphClient;

    public TeamsMeetingService(
        IConfiguration configuration,
        ILogger<TeamsMeetingService> logger,
        IUnitOfWork unitOfWork,
        ApplicationDbContext context)
    {
        _configuration = configuration;
        _logger = logger;
        _unitOfWork = unitOfWork;
        _context = context;
    }

    private GraphServiceClient GetGraphClient()
    {
        if (_graphClient != null)
            return _graphClient;

        var tenantId = _configuration["AzureAd:TenantId"];
        var clientId = _configuration["AzureAd:ClientId"];
        var clientSecret = _configuration["AzureAd:ClientSecret"];

        // Log configuration values (without exposing secret)
        _logger.LogInformation("Reading Azure AD configuration - TenantId: {TenantId}, ClientId: {ClientId}, HasClientSecret: {HasSecret}",
            string.IsNullOrEmpty(tenantId) ? "MISSING" : tenantId.Substring(0, Math.Min(8, tenantId.Length)) + "...",
            string.IsNullOrEmpty(clientId) ? "MISSING" : clientId.Substring(0, Math.Min(8, clientId.Length)) + "...",
            !string.IsNullOrEmpty(clientSecret));

        if (string.IsNullOrEmpty(tenantId) || string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
        {
            var missingFields = new List<string>();
            if (string.IsNullOrEmpty(tenantId)) missingFields.Add("TenantId");
            if (string.IsNullOrEmpty(clientId)) missingFields.Add("ClientId");
            if (string.IsNullOrEmpty(clientSecret)) missingFields.Add("ClientSecret");
            
            throw new InvalidOperationException(
                $"Azure AD configuration is missing: {string.Join(", ", missingFields)}. " +
                "Please configure these values in appsettings.json");
        }

        // Validate tenant ID format (should be a GUID)
        if (!Guid.TryParse(tenantId, out _))
        {
            _logger.LogError("Invalid TenantId format: {TenantId}. Expected a valid GUID.", tenantId);
            throw new InvalidOperationException($"Invalid TenantId format. Expected a valid GUID, but got: {tenantId}");
        }

        var options = new TokenCredentialOptions
        {
            AuthorityHost = AzureAuthorityHosts.AzurePublicCloud
        };

        var clientSecretCredential = new ClientSecretCredential(
            tenantId,
            clientId,
            clientSecret,
            options
        );

        var scopes = new[] { "https://graph.microsoft.com/.default" };
        _graphClient = new GraphServiceClient(clientSecretCredential, scopes);

        return _graphClient;
    }

    public async Task<BaseResponse<object>> CreateTeamsMeetingForCourseAsync(int courseId, string organizerUserId)
    {
        try
        {
            // Load course with related data
            var course = await _context.Courses
                .Include(c => c.CourseInstructors)
                    .ThenInclude(ci => ci.Instructor)
                .FirstOrDefaultAsync(c => c.Id == courseId && !c.IsDeleted);

            if (course == null)
            {
                return new BaseResponse<object>
                {
                    StatusCode = 404,
                    Message = "Course not found."
                };
            }

            // Check if course status is RegistrationClosed
            if (course.Status != CourseStatus.RegistrationClosed)
            {
                return new BaseResponse<object>
                {
                    StatusCode = 400,
                    Message = "Teams meetings can only be created for courses with Registration Closed status."
                };
            }

            // Check if course has online seats
            if (course.AvailableOnlineSeats <= 0)
            {
                return new BaseResponse<object>
                {
                    StatusCode = 400,
                    Message = "Course does not have online seats available."
                };
            }

            // Get approved online enrollments
            var onlineEnrollments = await _context.CourseEnrollments
                .Include(ce => ce.User)
                .Where(ce => ce.CourseId == courseId
                    && !ce.IsDeleted
                    && ce.IsActive
                    && ce.Status == EnrollmentStatus.Approve
                    && ce.EnrollmentType == EnrollmentType.Online)
                .ToListAsync();

            if (!onlineEnrollments.Any())
            {
                return new BaseResponse<object>
                {
                    StatusCode = 400,
                    Message = "No approved online enrollments found for this course."
                };
            }

            // Get organizer email - use configured email if available, otherwise use the logged-in user's email
            var configuredOrganizerEmail = _configuration["Meeting:OrganizerUser"];
            string organizerEmail;

            if (!string.IsNullOrEmpty(configuredOrganizerEmail))
            {
                organizerEmail = configuredOrganizerEmail;
                _logger.LogInformation("Using configured organizer email: {Email}", organizerEmail);
            }
            else
            {
                // Fallback to logged-in user's email
                var organizer = await _context.Users
                    .FirstOrDefaultAsync(u => u.Id == organizerUserId);

                if (organizer == null || string.IsNullOrEmpty(organizer.Email))
                {
                    return new BaseResponse<object>
                    {
                        StatusCode = 400,
                        Message = "Organizer user not found or does not have an email address. Please configure Meeting:OrganizerUser in appsettings.json"
                    };
                }

                organizerEmail = organizer.Email;
                _logger.LogInformation("Using logged-in user's email as organizer: {Email}", organizerEmail);
            }
            var graphClient = GetGraphClient();

            // Prepare meeting details
            var meetingSubject = $"{course.CourseTitle} - Online Training";
            var meetingDescription = course.Description ?? $"Online training session for {course.CourseTitle}";

            // Use course dates or default to tomorrow
            var startDateTime = course.StartDateTime ?? DateTime.UtcNow.AddDays(1);
            var endDateTime = course.EndDateTime ?? startDateTime.AddHours(2);

            // Convert to UTC format required by Graph API
            var startDateTimeString = startDateTime.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
            var endDateTimeString = endDateTime.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ");

            // Build attendees list
            var attendees = new List<Attendee>();

            // Add enrolled users
            foreach (var enrollment in onlineEnrollments)
            {
                if (!string.IsNullOrEmpty(enrollment.User?.Email))
                {
                    attendees.Add(new Attendee
                    {
                        EmailAddress = new EmailAddress
                        {
                            Address = enrollment.User.Email,
                            Name = enrollment.User.FullName ?? enrollment.User.Email
                        },
                        Type = AttendeeType.Required
                    });
                }
            }

            // Add course instructors
            foreach (var courseInstructor in course.CourseInstructors.Where(ci => !ci.IsDeleted && ci.IsActive))
            {
                if (!string.IsNullOrEmpty(courseInstructor.Instructor?.Email))
                {
                    // Check if instructor is already in attendees list
                    if (!attendees.Any(a => a.EmailAddress?.Address == courseInstructor.Instructor.Email))
                    {
                        var instructorName = !string.IsNullOrEmpty(courseInstructor.Instructor.NameEn) 
                            ? courseInstructor.Instructor.NameEn 
                            : courseInstructor.Instructor.NameAr ?? courseInstructor.Instructor.Email;
                        
                        attendees.Add(new Attendee
                        {
                            EmailAddress = new EmailAddress
                            {
                                Address = courseInstructor.Instructor.Email,
                                Name = instructorName
                            },
                            Type = AttendeeType.Required
                        });
                    }
                }
            }

            // Create the Teams meeting event
            var newMeeting = new GraphEvent
            {
                Subject = meetingSubject,
                Body = new ItemBody
                {
                    ContentType = BodyType.Html,
                    Content = $"<p>{meetingDescription}</p><p><strong>Course Code:</strong> {course.Code}</p>"
                },
                Start = new DateTimeTimeZone
                {
                    DateTime = startDateTimeString,
                    TimeZone = "UTC"
                },
                End = new DateTimeTimeZone
                {
                    DateTime = endDateTimeString,
                    TimeZone = "UTC"
                },
                Location = new GraphLocation
                {
                    DisplayName = "Virtual (Microsoft Teams)"
                },
                IsOnlineMeeting = true,
                OnlineMeetingProvider = OnlineMeetingProviderType.TeamsForBusiness,
                Attendees = attendees
            };

            // Create the meeting via Graph API
            var createdEvent = await graphClient
                .Users[organizerEmail]
                .Events
                .PostAsync(newMeeting);

            // Wait a bit for Teams to generate the join URL
            await Task.Delay(2000);

            // Fetch the event again to get the join URL
            if (createdEvent?.Id != null)
            {
                var fetchedEvent = await graphClient
                    .Users[organizerEmail]
                    .Events[createdEvent.Id]
                    .GetAsync();

                var joinUrl = fetchedEvent?.OnlineMeeting?.JoinUrl;

                // Save Teams meeting data to course
                course.TeamsEventId = createdEvent.Id;
                course.TeamsJoinUrl = joinUrl;
                course.TeamsMeetingCreatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return new BaseResponse<object>
                {
                    StatusCode = 200,
                    Message = $"Teams meeting created successfully. {onlineEnrollments.Count} online enrollments added.",
                    Result = new
                    {
                        EventId = createdEvent.Id,
                        JoinUrl = joinUrl,
                        Subject = createdEvent.Subject,
                        StartDateTime = createdEvent.Start?.DateTime,
                        EndDateTime = createdEvent.End?.DateTime,
                        AttendeesCount = attendees.Count
                    }
                };
            }

            return new BaseResponse<object>
            {
                StatusCode = 200,
                Message = "Teams meeting created successfully.",
                Result = new
                {
                    EventId = createdEvent?.Id,
                    Subject = createdEvent?.Subject
                }
            };
        }
        catch (Exception ex) when (ex.GetType().Name == "ODataError" || ex.Message.Contains("OData"))
        {
            _logger.LogError(ex, "Graph API Error creating Teams meeting for course {CourseId}", courseId);
            return new BaseResponse<object>
            {
                StatusCode = 500,
                Message = ex.Message ?? "Failed to create Teams meeting."
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating Teams meeting for course {CourseId}", courseId);
            return new BaseResponse<object>
            {
                StatusCode = 500,
                Message = $"An error occurred while creating Teams meeting: {ex.Message}"
            };
        }
    }

    public async Task<BaseResponse<object>> GetTeamsMeetingForCourseAsync(int courseId)
    {
        try
        {
            var course = await _context.Courses
                .Include(c => c.CourseInstructors)
                    .ThenInclude(ci => ci.Instructor)
                .FirstOrDefaultAsync(c => c.Id == courseId && !c.IsDeleted);

            if (course == null)
            {
                return new BaseResponse<object>
                {
                    StatusCode = 404,
                    Message = "Course not found."
                };
            }

            if (string.IsNullOrEmpty(course.TeamsEventId))
            {
                return new BaseResponse<object>
                {
                    StatusCode = 404,
                    Message = "No Teams meeting found for this course."
                };
            }

            var configuredOrganizerEmail = _configuration["Meeting:OrganizerUser"];
            if (string.IsNullOrEmpty(configuredOrganizerEmail))
            {
                return new BaseResponse<object>
                {
                    StatusCode = 400,
                    Message = "Organizer email not configured."
                };
            }

            var graphClient = GetGraphClient();

            // Fetch the event from Graph API
            var graphEvent = await graphClient
                .Users[configuredOrganizerEmail]
                .Events[course.TeamsEventId]
                .GetAsync();

            if (graphEvent == null)
            {
                return new BaseResponse<object>
                {
                    StatusCode = 404,
                    Message = "Teams meeting not found in Microsoft Graph."
                };
            }

            // Get attendees count
            var attendeesCount = graphEvent.Attendees?.Count ?? 0;

            return new BaseResponse<object>
            {
                StatusCode = 200,
                Message = "Teams meeting details retrieved successfully.",
                Result = new
                {
                    EventId = graphEvent.Id,
                    JoinUrl = graphEvent.OnlineMeeting?.JoinUrl ?? course.TeamsJoinUrl,
                    Subject = graphEvent.Subject,
                    StartDateTime = graphEvent.Start?.DateTime,
                    EndDateTime = graphEvent.End?.DateTime,
                    AttendeesCount = attendeesCount,
                    Attendees = graphEvent.Attendees != null ? graphEvent.Attendees.Select(a => (object)new
                    {
                        Email = a.EmailAddress?.Address,
                        Name = a.EmailAddress?.Name,
                        Type = a.Type?.ToString()
                    }).ToList() : new List<object>(),
                    CreatedAt = course.TeamsMeetingCreatedAt
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving Teams meeting for course {CourseId}", courseId);
            return new BaseResponse<object>
            {
                StatusCode = 500,
                Message = $"An error occurred while retrieving Teams meeting: {ex.Message}"
            };
        }
    }

    public async Task<BaseResponse<object>> CancelTeamsMeetingForCourseAsync(int courseId)
    {
        try
        {
            var course = await _context.Courses
                .FirstOrDefaultAsync(c => c.Id == courseId && !c.IsDeleted);

            if (course == null)
            {
                return new BaseResponse<object>
                {
                    StatusCode = 404,
                    Message = "Course not found."
                };
            }

            if (string.IsNullOrEmpty(course.TeamsEventId))
            {
                return new BaseResponse<object>
                {
                    StatusCode = 404,
                    Message = "No Teams meeting found for this course."
                };
            }

            var configuredOrganizerEmail = _configuration["Meeting:OrganizerUser"];
            if (string.IsNullOrEmpty(configuredOrganizerEmail))
            {
                return new BaseResponse<object>
                {
                    StatusCode = 400,
                    Message = "Organizer email not configured."
                };
            }

            var graphClient = GetGraphClient();

            // Delete the event from Graph API
            await graphClient
                .Users[configuredOrganizerEmail]
                .Events[course.TeamsEventId]
                .DeleteAsync();

            // Clear Teams meeting data from course
            course.TeamsEventId = null;
            course.TeamsJoinUrl = null;
            course.TeamsMeetingCreatedAt = null;
            await _context.SaveChangesAsync();

            return new BaseResponse<object>
            {
                StatusCode = 200,
                Message = "Teams meeting cancelled successfully."
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling Teams meeting for course {CourseId}", courseId);
            return new BaseResponse<object>
            {
                StatusCode = 500,
                Message = $"An error occurred while cancelling Teams meeting: {ex.Message}"
            };
        }
    }

    public async Task<BaseResponse<object>> UpdateTeamsMeetingForCourseAsync(int courseId, string organizerUserId)
    {
        try
        {
            var course = await _context.Courses
                .Include(c => c.CourseInstructors)
                    .ThenInclude(ci => ci.Instructor)
                .FirstOrDefaultAsync(c => c.Id == courseId && !c.IsDeleted);

            if (course == null)
            {
                return new BaseResponse<object>
                {
                    StatusCode = 404,
                    Message = "Course not found."
                };
            }

            if (string.IsNullOrEmpty(course.TeamsEventId))
            {
                return new BaseResponse<object>
                {
                    StatusCode = 404,
                    Message = "No Teams meeting found for this course. Please create a meeting first."
                };
            }

            var configuredOrganizerEmail = _configuration["Meeting:OrganizerUser"];
            if (string.IsNullOrEmpty(configuredOrganizerEmail))
            {
                return new BaseResponse<object>
                {
                    StatusCode = 400,
                    Message = "Organizer email not configured."
                };
            }

            // Get approved online enrollments
            var onlineEnrollments = await _context.CourseEnrollments
                .Include(ce => ce.User)
                .Where(ce => ce.CourseId == courseId
                    && !ce.IsDeleted
                    && ce.IsActive
                    && ce.Status == EnrollmentStatus.Approve
                    && ce.EnrollmentType == EnrollmentType.Online)
                .ToListAsync();

            // Build attendees list
            var attendees = new List<Attendee>();

            // Add enrolled users
            foreach (var enrollment in onlineEnrollments)
            {
                if (!string.IsNullOrEmpty(enrollment.User?.Email))
                {
                    attendees.Add(new Attendee
                    {
                        EmailAddress = new EmailAddress
                        {
                            Address = enrollment.User.Email,
                            Name = enrollment.User.FullName ?? enrollment.User.Email
                        },
                        Type = AttendeeType.Required
                    });
                }
            }

            // Add course instructors
            foreach (var courseInstructor in course.CourseInstructors.Where(ci => !ci.IsDeleted && ci.IsActive))
            {
                if (!string.IsNullOrEmpty(courseInstructor.Instructor?.Email))
                {
                    if (!attendees.Any(a => a.EmailAddress?.Address == courseInstructor.Instructor.Email))
                    {
                        var instructorName = !string.IsNullOrEmpty(courseInstructor.Instructor.NameEn) 
                            ? courseInstructor.Instructor.NameEn 
                            : courseInstructor.Instructor.NameAr ?? courseInstructor.Instructor.Email;
                        
                        attendees.Add(new Attendee
                        {
                            EmailAddress = new EmailAddress
                            {
                                Address = courseInstructor.Instructor.Email,
                                Name = instructorName
                            },
                            Type = AttendeeType.Required
                        });
                    }
                }
            }

            var graphClient = GetGraphClient();

            // Prepare updated meeting details
            var meetingSubject = $"{course.CourseTitle} - Online Training";
            var meetingDescription = course.Description ?? $"Online training session for {course.CourseTitle}";

            var startDateTime = course.StartDateTime ?? DateTime.UtcNow.AddDays(1);
            var endDateTime = course.EndDateTime ?? startDateTime.AddHours(2);

            var startDateTimeString = startDateTime.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
            var endDateTimeString = endDateTime.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ");

            // Update the event
            var updatedMeeting = new GraphEvent
            {
                Subject = meetingSubject,
                Body = new ItemBody
                {
                    ContentType = BodyType.Html,
                    Content = $"<p>{meetingDescription}</p><p><strong>Course Code:</strong> {course.Code}</p>"
                },
                Start = new DateTimeTimeZone
                {
                    DateTime = startDateTimeString,
                    TimeZone = "UTC"
                },
                End = new DateTimeTimeZone
                {
                    DateTime = endDateTimeString,
                    TimeZone = "UTC"
                },
                Attendees = attendees
            };

            await graphClient
                .Users[configuredOrganizerEmail]
                .Events[course.TeamsEventId]
                .PatchAsync(updatedMeeting);

            // Update join URL if needed
            await Task.Delay(1000);
            var fetchedEvent = await graphClient
                .Users[configuredOrganizerEmail]
                .Events[course.TeamsEventId]
                .GetAsync();

            if (fetchedEvent?.OnlineMeeting?.JoinUrl != null)
            {
                course.TeamsJoinUrl = fetchedEvent.OnlineMeeting.JoinUrl;
                await _context.SaveChangesAsync();
            }

            return new BaseResponse<object>
            {
                StatusCode = 200,
                Message = $"Teams meeting updated successfully. {onlineEnrollments.Count} online enrollments synced.",
                Result = new
                {
                    EventId = course.TeamsEventId,
                    JoinUrl = fetchedEvent?.OnlineMeeting?.JoinUrl ?? course.TeamsJoinUrl,
                    AttendeesCount = attendees.Count
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating Teams meeting for course {CourseId}", courseId);
            return new BaseResponse<object>
            {
                StatusCode = 500,
                Message = $"An error occurred while updating Teams meeting: {ex.Message}"
            };
        }
    }
}
