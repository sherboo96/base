using AutoMapper;
using Microsoft.EntityFrameworkCore;
using UMS.Data;
using UMS.Dtos;
using UMS.Interfaces;
using UMS.Models;

namespace UMS.Repository;

public class SegmentRepository : BaseRepository<Segment, SegmentDto>, ISegmentRepository
{
    private readonly ApplicationDbContext _context;

    public SegmentRepository(ApplicationDbContext context, IMapper mapper) : base(context, mapper)
    {
        _context = context;
    }

    public async Task<IEnumerable<Segment>> GetByOrganizationIdAsync(int organizationId)
    {
        return await _context.Segments
            .AsNoTracking()
            .Where(s => !s.IsDeleted && s.OrganizationId == organizationId)
            .Include(s => s.Organization)
            .Include(s => s.UserSegments)
                .ThenInclude(us => us.User)
            .OrderBy(s => s.Name)
            .ToListAsync();
    }

    public async Task<bool> CodeExistsAsync(string code, int? excludeId = null)
    {
        var query = _context.Segments.Where(s => !s.IsDeleted && s.Code == code);
        if (excludeId.HasValue)
        {
            query = query.Where(s => s.Id != excludeId.Value);
        }
        return await query.AnyAsync();
    }

    public async Task<Segment> GetWithUsersAsync(int id)
    {
        return await _context.Segments
            .AsNoTracking()
            .Include(s => s.Organization)
            .Include(s => s.UserSegments)
                .ThenInclude(us => us.User)
                    .ThenInclude(u => u.JobTitle)
            .FirstOrDefaultAsync(s => !s.IsDeleted && s.Id == id);
    }

    public async Task<bool> AssignUsersAsync(int segmentId, List<string> userIds)
    {
        try
        {
            var segment = await _context.Segments
                .Include(s => s.UserSegments)
                .FirstOrDefaultAsync(s => s.Id == segmentId && !s.IsDeleted);

            if (segment == null)
                return false;

            // Remove existing user assignments
            _context.UserSegments.RemoveRange(segment.UserSegments);

            // Add new user assignments
            foreach (var userId in userIds)
            {
                segment.UserSegments.Add(new UserSegment
                {
                    SegmentId = segmentId,
                    UserId = userId,
                    AssignedOn = DateTime.Now
                });
            }

            await _context.SaveChangesAsync();
            return true;
        }
        catch
        {
            return false;
        }
    }

    public async Task<bool> RemoveUsersAsync(int segmentId, List<string> userIds)
    {
        try
        {
            var userSegments = await _context.UserSegments
                .Where(us => us.SegmentId == segmentId && userIds.Contains(us.UserId))
                .ToListAsync();

            _context.UserSegments.RemoveRange(userSegments);
            await _context.SaveChangesAsync();
            return true;
        }
        catch
        {
            return false;
        }
    }
}
