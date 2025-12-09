using System.Linq.Expressions;
using UMS.Const;

namespace UMS.Interfaces;

public interface IBaseRepository<T, TViewModel> where T : class where TViewModel : class?
{
    /// <summary>
    /// Finds a single entity by predicate.
    /// </summary>
    Task<T> FindAsync(Expression<Func<T, bool>> match, string[]? includes = null);

    /// <summary>
    /// Gets all entities.
    /// </summary>
    Task<IEnumerable<T>> GetAllAsync(string[]? includes = null);

    Task<IEnumerable<T>> GetAllAsync(Expression<Func<T, bool>> match, string[]? includes = null);

    Task<IEnumerable<T>> GetAllAsync(int take, int skip, string[]? includes = null);

    Task<IEnumerable<T>> GetAllAsync(
        int? take,
        int? skip,
        Expression<Func<T, object>>? orderBy = null,
        string orderByDirection = OrderBy.Ascending,
        string[]? includes = null);

    Task<IEnumerable<T>> GetAllAsync(
        int? take,
        int? skip,
        Expression<Func<T, bool>> match,
        Expression<Func<T, object>>? orderBy = null,
        string orderByDirection = OrderBy.Ascending,
        string[]? includes = null);

    /// <summary>
    /// Adds a new entity using a view model.
    /// </summary>
    Task<T> AddAsync(TViewModel viewModel);

    /// <summary>
    /// Adds a new entity directly.
    /// </summary>
    Task<T> AddAsync(T entity);

    /// <summary>
    /// Updates an existing entity.
    /// </summary>
    Task<T> UpdateAsync(T entity);

    /// <summary>
    /// Updates an existing entity using a view model.
    /// </summary>
    Task<T> UpdateAsync(TViewModel viewModel);

    /// <summary>
    /// Deletes an entity by integer ID.
    /// </summary>
    Task<bool> DeleteAsync(int id);

    /// <summary>
    /// Deletes an entity by Guid ID.
    /// </summary>
    Task<bool> DeleteAsync(Guid id);

    /// <summary>
    /// Deletes the provided entity.
    /// </summary>
    Task<bool> DeleteAsync(T entity);

    /// <summary>
    /// Counts matching records.
    /// </summary>
    Task<int> CountAsync(Expression<Func<T, bool>> predicate);

    /// <summary>
    /// Checks for existence of matching records.
    /// </summary>
    Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate);

    /// <summary>
    /// Performs a grouped query.
    /// </summary>
    Task<IEnumerable<TResult>> GroupByAsync<TKey, TResult>(
        Expression<Func<T, TKey>> keySelector,
        Expression<Func<T, T>> elementSelector,
        Expression<Func<TKey, IEnumerable<T>, TResult>> resultSelector,
        Expression<Func<T, bool>>? filter = null);
}
