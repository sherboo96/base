using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using UMS.Models;

namespace UMS.Data;

public class ApplicationDbContext : IdentityDbContext<User>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options) { }

    // DbSets
    public DbSet<Organization> Organizations { get; set; }
    public DbSet<Department> Departments { get; set; }
    public new DbSet<Role> Roles { get; set; }
    public DbSet<Permission> Permissions { get; set; }
    public DbSet<JobTitle> JobTitles { get; set; }
    public DbSet<Position> Positions { get; set; }
    public DbSet<Institution> Institutions { get; set; }
    public DbSet<Instructor> Instructors { get; set; }
    public DbSet<SystemConfiguration> SystemConfigurations { get; set; }
    public DbSet<Public> Publics { get; set; }
    public DbSet<Location> Locations { get; set; }
    public DbSet<Segment> Segments { get; set; }
    public DbSet<AdoptionUser> AdoptionUsers { get; set; }
    public DbSet<CourseTab> CourseTabs { get; set; }
    public DbSet<Course> Courses { get; set; }
    public DbSet<CourseLearningOutcome> CourseLearningOutcomes { get; set; }
    public DbSet<CourseContent> CourseContents { get; set; }
    public DbSet<CourseInstructor> CourseInstructors { get; set; }
    public DbSet<CourseAdoptionUser> CourseAdoptionUsers { get; set; }
    public DbSet<CourseContact> CourseContacts { get; set; }
    public DbSet<CourseEnrollment> CourseEnrollments { get; set; }
    public DbSet<CourseTabApproval> CourseTabApprovals { get; set; }
    public DbSet<CourseEnrollmentApproval> CourseEnrollmentApprovals { get; set; }
    public DbSet<CourseQuestion> CourseQuestions { get; set; }
    public DbSet<Event> Events { get; set; }
    public DbSet<EventSpeaker> EventSpeakers { get; set; }
    public DbSet<EventOrganization> EventOrganizations { get; set; }
    public DbSet<EventRegistration> EventRegistrations { get; set; }
    public DbSet<EventAttendee> EventAttendees { get; set; }
    public DbSet<EventSession> EventSessions { get; set; }
    public DbSet<EventSessionEnrollment> EventSessionEnrollments { get; set; }
    public DbSet<CourseAttendance> CourseAttendances { get; set; }
    public DbSet<Log> Logs { get; set; }

    public new DbSet<UserRole> UserRoles { get; set; }
    public DbSet<UserSegment> UserSegments { get; set; }
    public DbSet<RolePermission> RolePermissions { get; set; }
    
    // Digital Library DbSets
    public DbSet<DigitalLibraryItem> DigitalLibraryItems { get; set; }
    public DbSet<DigitalLibraryFile> DigitalLibraryFiles { get; set; }
    public DbSet<UserDigitalLibraryProgress> UserDigitalLibraryProgresses { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure User table name (Identity uses AspNetUsers by default)
        modelBuilder.Entity<User>().ToTable("Users");

        // Composite Keys for Join Tables
        modelBuilder.Entity<UserRole>()
            .HasKey(ur => new { ur.UserId, ur.RoleId });

        modelBuilder.Entity<RolePermission>()
            .HasKey(rp => new { rp.RoleId, rp.PermissionId });

        // Department self-referencing relationship
        modelBuilder.Entity<Department>()
            .HasOne(d => d.ParentDepartment)
            .WithMany()
            .HasForeignKey(d => d.ParentDepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        // Organization IsMain constraint - only one organization can be main
        modelBuilder.Entity<Organization>()
            .HasIndex(o => o.IsMain)
            .HasFilter("[IsMain] = 1")
            .IsUnique();

        // Role IsDefault constraint - only one default role per organization
        // This is handled at the application level, but we can add a filtered unique index
        // Note: This requires a migration to be created

        // User-Organization relationship
        modelBuilder.Entity<User>()
            .HasOne(u => u.Organization)
            .WithMany(o => o.Users)
            .HasForeignKey(u => u.OrganizationId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired();

        // User-Department relationship (optional)
        modelBuilder.Entity<User>()
            .HasOne(u => u.Department)
            .WithMany()
            .HasForeignKey(u => u.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        // Location-Organization relationship
        modelBuilder.Entity<Location>()
            .HasOne(l => l.Organization)
            .WithMany()
            .HasForeignKey(l => l.OrganizationId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired();

        // Instructor-Institution relationship
        modelBuilder.Entity<Instructor>()
            .HasOne(i => i.Institution)
            .WithMany()
            .HasForeignKey(i => i.InstitutionId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired();

        // Segment-Organization relationship
        modelBuilder.Entity<Segment>()
            .HasOne(s => s.Organization)
            .WithMany()
            .HasForeignKey(s => s.OrganizationId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired();

        // AdoptionUser-Organization relationship
        modelBuilder.Entity<AdoptionUser>()
            .HasOne(au => au.Organization)
            .WithMany()
            .HasForeignKey(au => au.OrganizationId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired();

        // CourseTab-Organization relationship
        modelBuilder.Entity<CourseTab>()
            .HasOne(ct => ct.Organization)
            .WithMany()
            .HasForeignKey(ct => ct.OrganizationId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired();

        // Course relationships
        modelBuilder.Entity<Course>()
            .HasOne(c => c.CourseTab)
            .WithMany()
            .HasForeignKey(c => c.CourseTabId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired();

        modelBuilder.Entity<Course>()
            .HasOne(c => c.Organization)
            .WithMany()
            .HasForeignKey(c => c.OrganizationId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired();

        modelBuilder.Entity<Course>()
            .HasOne(c => c.Location)
            .WithMany()
            .HasForeignKey(c => c.LocationId)
            .OnDelete(DeleteBehavior.Restrict);

        // Configure decimal precision for Course
        modelBuilder.Entity<Course>()
            .Property(c => c.Price)
            .HasPrecision(18, 2);

        modelBuilder.Entity<Course>()
            .Property(c => c.KpiWeight)
            .HasPrecision(18, 2);

        // CourseLearningOutcome relationship
        modelBuilder.Entity<CourseLearningOutcome>()
            .HasOne(clo => clo.Course)
            .WithMany(c => c.LearningOutcomes)
            .HasForeignKey(clo => clo.CourseId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired();

        // CourseContent relationship
        modelBuilder.Entity<CourseContent>()
            .HasOne(cc => cc.Course)
            .WithMany(c => c.CourseContents)
            .HasForeignKey(cc => cc.CourseId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired();

        // CourseTabApproval relationship
        modelBuilder.Entity<CourseTabApproval>()
            .HasOne(cta => cta.CourseTab)
            .WithMany(ct => ct.Approvals)
            .HasForeignKey(cta => cta.CourseTabId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired();

        modelBuilder.Entity<CourseTabApproval>()
            .HasOne(cta => cta.Role)
            .WithMany()
            .HasForeignKey(cta => cta.RoleId)
            .OnDelete(DeleteBehavior.Restrict);

        // CourseEnrollmentApproval relationship
        modelBuilder.Entity<CourseEnrollmentApproval>()
            .HasOne(cea => cea.CourseEnrollment)
            .WithMany(ce => ce.ApprovalSteps)
            .HasForeignKey(cea => cea.CourseEnrollmentId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired();

        modelBuilder.Entity<CourseEnrollmentApproval>()
            .HasOne(cea => cea.CourseTabApproval)
            .WithMany(cta => cta.EnrollmentApprovals)
            .HasForeignKey(cea => cea.CourseTabApprovalId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired();

        // CourseInstructor many-to-many relationship
        modelBuilder.Entity<CourseInstructor>()
            .HasKey(ci => new { ci.CourseId, ci.InstructorId });

        modelBuilder.Entity<CourseInstructor>()
            .HasOne(ci => ci.Course)
            .WithMany(c => c.CourseInstructors)
            .HasForeignKey(ci => ci.CourseId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired();

        modelBuilder.Entity<CourseInstructor>()
            .HasOne(ci => ci.Instructor)
            .WithMany()
            .HasForeignKey(ci => ci.InstructorId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired();

        // CourseAdoptionUser many-to-many relationship
        modelBuilder.Entity<CourseAdoptionUser>()
            .HasKey(cau => new { cau.CourseId, cau.AdoptionUserId });

        modelBuilder.Entity<CourseAdoptionUser>()
            .HasOne(cau => cau.Course)
            .WithMany(c => c.CourseAdoptionUsers)
            .HasForeignKey(cau => cau.CourseId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired();

        modelBuilder.Entity<CourseAdoptionUser>()
            .HasOne(cau => cau.AdoptionUser)
            .WithMany()
            .HasForeignKey(cau => cau.AdoptionUserId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired();

        // CourseContact relationship
        modelBuilder.Entity<CourseContact>()
            .HasOne(cc => cc.Course)
            .WithMany(c => c.CourseContacts)
            .HasForeignKey(cc => cc.CourseId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired();

        // CourseQuestion relationship
        modelBuilder.Entity<CourseQuestion>()
            .HasOne(cq => cq.Course)
            .WithMany(c => c.CourseQuestions)
            .HasForeignKey(cq => cq.CourseId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired();

        // CourseEnrollment relationships
        modelBuilder.Entity<CourseEnrollment>()
            .HasOne(ce => ce.Course)
            .WithMany()
            .HasForeignKey(ce => ce.CourseId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired();

        modelBuilder.Entity<CourseEnrollment>()
            .HasOne(ce => ce.User)
            .WithMany()
            .HasForeignKey(ce => ce.UserId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired();

        // Unique constraint: one enrollment per user per course
        modelBuilder.Entity<CourseEnrollment>()
            .HasIndex(ce => new { ce.CourseId, ce.UserId })
            .IsUnique();

        // UserSegment composite key and relationships
        modelBuilder.Entity<UserSegment>()
            .HasKey(us => new { us.UserId, us.SegmentId });

        modelBuilder.Entity<UserSegment>()
            .HasOne(us => us.User)
            .WithMany()
            .HasForeignKey(us => us.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<UserSegment>()
            .HasOne(us => us.Segment)
            .WithMany(s => s.UserSegments)
            .HasForeignKey(us => us.SegmentId)
            .OnDelete(DeleteBehavior.Restrict);

        // Event relationships
        modelBuilder.Entity<Event>()
            .HasOne(e => e.Location)
            .WithMany()
            .HasForeignKey(e => e.LocationId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<EventSpeaker>()
            .HasOne(es => es.Event)
            .WithMany(e => e.Speakers)
            .HasForeignKey(es => es.EventId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired();

        // EventRegistration relationships
        modelBuilder.Entity<EventRegistration>()
            .HasOne(er => er.Event)
            .WithMany(e => e.Registrations)
            .HasForeignKey(er => er.EventId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired();

        modelBuilder.Entity<EventRegistration>()
            .HasOne(er => er.EventOrganization)
            .WithMany(eo => eo.Registrations)
            .HasForeignKey(er => er.EventOrganizationId)
            .OnDelete(DeleteBehavior.Restrict);

        // EventAttendee relationships
        modelBuilder.Entity<EventAttendee>()
            .HasOne(ea => ea.EventRegistration)
            .WithMany(er => er.Attendees)
            .HasForeignKey(ea => ea.EventRegistrationId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired();

        // Unique constraint: Event Code must be unique
        modelBuilder.Entity<Event>()
            .HasIndex(e => e.Code)
            .IsUnique();

        // Unique constraint: EventRegistration Barcode must be unique
        modelBuilder.Entity<EventRegistration>()
            .HasIndex(er => er.Barcode)
            .IsUnique();

        // Check constraint: DepartmentId is required if Organization.IsMain is true
        // Note: This is a database-level constraint that will be enforced via migration
        // CourseAttendance relationship
        modelBuilder.Entity<CourseAttendance>()
            .HasOne(ca => ca.CourseEnrollment)
            .WithMany()
            .HasForeignKey(ca => ca.CourseEnrollmentId)
            .OnDelete(DeleteBehavior.Cascade)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired();
            
        // Digital Library Configuration
        
        // DigitalLibraryItem Relationship
        modelBuilder.Entity<DigitalLibraryItem>()
            .HasOne(i => i.Course)
            .WithMany()
            .HasForeignKey(i => i.CourseId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<DigitalLibraryItem>()
            .HasOne(i => i.Organization)
            .WithMany() // Assuming no collection in Organization for now
            .HasForeignKey(i => i.OrganizationId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired();

        // DigitalLibraryFile Relationship
        modelBuilder.Entity<DigitalLibraryFile>()
            .HasOne(f => f.DigitalLibraryItem)
            .WithMany(i => i.Files)
            .HasForeignKey(f => f.DigitalLibraryItemId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired();
            
        // UserDigitalLibraryProgress Relationship
        modelBuilder.Entity<UserDigitalLibraryProgress>()
            .HasOne(p => p.User)
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired();
            
        modelBuilder.Entity<UserDigitalLibraryProgress>()
            .HasOne(p => p.DigitalLibraryFile)
            .WithMany()
            .HasForeignKey(p => p.DigitalLibraryFileId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired();
            
        // Unique progress record per user per file
        modelBuilder.Entity<UserDigitalLibraryProgress>()
            .HasIndex(p => new { p.UserId, p.DigitalLibraryFileId })
            .IsUnique();
    }

}
