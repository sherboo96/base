namespace UMS.Repository;

public class BaseRepository<T, TViewModel>(ApplicationDbContext context, IMapper mapper)
    : IBaseRepository<T, TViewModel> where T : class where TViewModel : class?
{
    public async Task<T> AddAsync(TViewModel viewModel)
    {
        var entity = mapper.Map<T>(viewModel);
        await context.Set<T>().AddAsync(entity);
        return entity;
    }

    public async Task<T> AddAsync(T model)
    {
        await context.Set<T>().AddAsync(model);
        return model;
    }

    public async Task<T> FindAsync(Expression<Func<T, bool>> match, string[] includes = null)
    {
        IQueryable<T> query = context.Set<T>().AsNoTracking();
        if (includes != null)
            foreach (var include in includes)
                query = query.Include(include);

        return await query.SingleOrDefaultAsync(match);
    }

    public async Task<IEnumerable<T>> GetAllAsync(string[] includes = null)
    {
        IQueryable<T> query = context.Set<T>().AsNoTracking();
        if (includes != null)
            foreach (var include in includes)
                query = query.Include(include);

        return await query.ToListAsync();
    }

    public async Task<IEnumerable<T>> GetAllAsync(Expression<Func<T, bool>> match, string[] includes = null)
    {
        IQueryable<T> query = context.Set<T>().Where(match).AsNoTracking();
        if (includes != null)
            foreach (var include in includes)
                query = query.Include(include);

        return await query.ToListAsync();
    }

    public async Task<IEnumerable<T>> GetAllAsync(int take, int skip, string[] includes = null)
    {
        IQueryable<T> query = context.Set<T>().Skip(skip).Take(take).AsNoTracking();
        if (includes != null)
            foreach (var include in includes)
                query = query.Include(include);

        return await query.ToListAsync();
    }

    public async Task<IEnumerable<T>> GetAllAsync(int take, int skip, Expression<Func<T, bool>> match, string[] includes = null)
    {
        IQueryable<T> query = context.Set<T>().Where(match).Skip(skip).Take(take).AsNoTracking();
        if (includes != null)
            foreach (var include in includes)
                query = query.Include(include);

        return await query.ToListAsync();
    }

    public async Task<IEnumerable<T>> GetAllAsync(int? take, int? skip, Expression<Func<T, object>> orderBy = null, string orderByDirection = OrderBy.Ascending, string[] includes = null)
    {
        IQueryable<T> query = context.Set<T>().AsNoTracking();

        if (orderBy != null)
            query = orderByDirection == OrderBy.Ascending ? query.OrderBy(orderBy) : query.OrderByDescending(orderBy);

        if (skip.HasValue)
            query = query.Skip(skip.Value);

        if (take.HasValue)
            query = query.Take(take.Value);

        if (includes != null)
            foreach (var include in includes)
                query = query.Include(include);

        return await query.ToListAsync();
    }

    public async Task<IEnumerable<T>> GetAllAsync(int? take, int? skip, Expression<Func<T, bool>> match, Expression<Func<T, object>> orderBy = null, string orderByDirection = OrderBy.Ascending, string[] includes = null)
    {
        IQueryable<T> query = context.Set<T>().Where(match).AsNoTracking();

        if (orderBy != null)
            query = orderByDirection == OrderBy.Ascending ? query.OrderBy(orderBy) : query.OrderByDescending(orderBy);

        if (skip.HasValue)
            query = query.Skip(skip.Value);

        if (take.HasValue)
            query = query.Take(take.Value);

        if (includes != null)
            foreach (var include in includes)
                query = query.Include(include);

        return await query.ToListAsync();
    }

    public async Task<T> UpdateAsync(T entity)
    {
        // Get the key value to find the existing entity
        var keyValue = GetKeyValue(entity);
        if (keyValue != null)
        {
            // Find existing entity from database (without related entities to avoid tracking conflicts)
            var existing = await context.Set<T>().FindAsync(keyValue);
            if (existing != null)
            {
                // Use SetValues to copy only scalar properties, ignoring navigation properties
                // This prevents attaching related entities that might already be tracked
                context.Entry(existing).CurrentValues.SetValues(entity);
                return existing;
            }
        }
        
        // If entity doesn't exist or no key found, use standard Update
        // This will attach the entity but should only be used for new entities
        context.Set<T>().Update(entity);
        return await Task.FromResult(entity);
    }
    
    private object? GetKeyValue(T entity)
    {
        // Try to get the ID property value using reflection
        var idProperty = typeof(T).GetProperty("Id");
        return idProperty?.GetValue(entity);
    }

    public async Task<T> UpdateAsync(TViewModel viewModel)
    {
        var entity = mapper.Map<T>(viewModel);
        context.Set<T>().Update(entity);
        return await Task.FromResult(entity);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var entity = await context.Set<T>().FindAsync(id);
        if (entity == null) return false;
        context.Set<T>().Remove(entity);
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var entity = await context.Set<T>().FindAsync(id);
        if (entity == null) return false;
        context.Set<T>().Remove(entity);
        return true;
    }

    public async Task<bool> DeleteAsync(T entity)
    {
        context.Set<T>().Remove(entity);
        return await Task.FromResult(true);
    }

    public async Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate)
    {
        return await context.Set<T>().AnyAsync(predicate);
    }

    public async Task<int> CountAsync(Expression<Func<T, bool>> predicate)
    {
        return await context.Set<T>().CountAsync(predicate);
    }

    public async Task<IEnumerable<TResult>> GroupByAsync<TKey, TResult>(
        Expression<Func<T, TKey>> keySelector,
        Expression<Func<T, T>> elementSelector,
        Expression<Func<TKey, IEnumerable<T>, TResult>> resultSelector,
        Expression<Func<T, bool>> filter = null)
    {
        IQueryable<T> query = context.Set<T>();

        if (filter != null)
            query = query.Where(filter);

        var data = await query.ToListAsync();
        return data.GroupBy(keySelector.Compile(), elementSelector.Compile())
                   .Select(g => resultSelector.Compile().Invoke(g.Key, g))
                   .ToList();
    }
}

