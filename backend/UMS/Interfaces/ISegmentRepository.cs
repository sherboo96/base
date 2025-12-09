using UMS.Dtos;
using UMS.Models;

namespace UMS.Interfaces;

public interface ISegmentRepository : IBaseRepository<Segment, SegmentDto>
{
    Task<IEnumerable<Segment>> GetByOrganizationIdAsync(int organizationId);
    Task<bool> CodeExistsAsync(string code, int? excludeId = null);
    Task<Segment> GetWithUsersAsync(int id);
    Task<bool> AssignUsersAsync(int segmentId, List<string> userIds);
    Task<bool> RemoveUsersAsync(int segmentId, List<string> userIds);
}
