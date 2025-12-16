using System.Runtime.InteropServices;

namespace UMS.Services
{
    public class LdapAuthenticator
    {
        private readonly string _domain;
        private readonly bool _isWindows;

        public LdapAuthenticator(string domain)
        {
            _domain = domain;
            _isWindows = RuntimeInformation.IsOSPlatform(OSPlatform.Windows);
        }

        public bool ValidateCredentials(string username, string password)
        {
            if (!_isWindows)
            {
                // On non-Windows platforms, AD authentication is not supported
                // For development/testing, you can return false or implement alternative authentication
                throw new PlatformNotSupportedException(
                    "Active Directory authentication is only supported on Windows. " +
                    "Please use Credentials or OTP Verification login methods on this platform.");
            }

#if NET6_0_OR_GREATER
            using (var context = new System.DirectoryServices.AccountManagement.PrincipalContext(
                System.DirectoryServices.AccountManagement.ContextType.Domain, _domain))
            {
                return context.ValidateCredentials(username, password);
            }
#else
            throw new PlatformNotSupportedException("Active Directory authentication requires .NET 6 or later on Windows.");
#endif
        }

        public string GetFullName(string username)
        {
            if (!_isWindows)
            {
                return null;
            }

#if NET6_0_OR_GREATER
            using (var context = new System.DirectoryServices.AccountManagement.PrincipalContext(
                System.DirectoryServices.AccountManagement.ContextType.Domain, _domain))
            using (var userPrincipal = System.DirectoryServices.AccountManagement.UserPrincipal.FindByIdentity(context, username))
            {
                if (userPrincipal != null)
                {
                    return userPrincipal.DisplayName; // Retrieves the full name (display name)
                }
                return null; // Return null if the user is not found
            }
#else
            return null;
#endif
        }

        public AdUserModel? GetUserFromDomain(string username)
        {
            if (!_isWindows)
            {
                // On non-Windows platforms, return null to indicate user not found
                // This allows the application to handle the error gracefully
                return null;
            }

#if NET6_0_OR_GREATER
            using var context = new System.DirectoryServices.AccountManagement.PrincipalContext(
                System.DirectoryServices.AccountManagement.ContextType.Domain);
            using var userPrincipal = System.DirectoryServices.AccountManagement.UserPrincipal.FindByIdentity(context, username);

            if (userPrincipal == null) return null;

            return new AdUserModel
            {
                Username = userPrincipal.SamAccountName,
                DisplayName = userPrincipal.DisplayName,
                Title = userPrincipal.Description
            };
#else
            return null;
#endif
        }

        /// <summary>
        /// Checks if the username is related to the domain.
        /// </summary>
        /// <param name="username">The username to check.</param>
        /// <returns>True if the username is found in the domain, otherwise false.</returns>
        public bool IsUsernameInDomain(string username)
        {
            if (!_isWindows)
            {
                // On non-Windows platforms, AD lookup is not supported
                // Return false to indicate user not found in domain
                return false;
            }

#if NET6_0_OR_GREATER
            using (var context = new System.DirectoryServices.AccountManagement.PrincipalContext(
                System.DirectoryServices.AccountManagement.ContextType.Domain, _domain))
            using (var userPrincipal = System.DirectoryServices.AccountManagement.UserPrincipal.FindByIdentity(context, username))
            {
                return userPrincipal != null;
            }
#else
            return false;
#endif
        }
    }
}
