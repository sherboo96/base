using System.Security.Cryptography;
using System.Text;

namespace UMS.Services;

public class PasswordHasher
{
    /// <summary>
    /// Hashes a password using SHA256 algorithm
    /// </summary>
    /// <param name="password">Plain text password</param>
    /// <returns>Hashed password as base64 string</returns>
    public string HashPassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password))
            throw new ArgumentException("Password cannot be null or empty.", nameof(password));

        using (var sha256 = SHA256.Create())
        {
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            return Convert.ToBase64String(hashedBytes);
        }
    }

    /// <summary>
    /// Verifies a password against a hash
    /// </summary>
    /// <param name="password">Plain text password to verify</param>
    /// <param name="hash">Stored password hash</param>
    /// <returns>True if password matches hash, false otherwise</returns>
    public bool VerifyPassword(string password, string hash)
    {
        if (string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(hash))
            return false;

        var passwordHash = HashPassword(password);
        return passwordHash == hash;
    }
}

