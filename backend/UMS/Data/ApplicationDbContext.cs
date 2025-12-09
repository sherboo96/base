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
    public DbSet<Location> Locations { get; set; }
    public DbSet<Segment> Segments { get; set; }

    public new DbSet<UserRole> UserRoles { get; set; }
    public DbSet<UserSegment> UserSegments { get; set; }
    public DbSet<RolePermission> RolePermissions { get; set; }

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

        // Check constraint: DepartmentId is required if Organization.IsMain is true
        // Note: This is a database-level constraint that will be enforced via migration
    }

}
