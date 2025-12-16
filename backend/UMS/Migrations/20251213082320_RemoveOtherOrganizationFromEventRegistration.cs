using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UMS.Migrations
{
    /// <inheritdoc />
    public partial class RemoveOtherOrganizationFromEventRegistration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Check if column exists before dropping (in case it was never created)
            var sql = @"
                IF EXISTS (
                    SELECT 1 
                    FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[EventRegistrations]') 
                    AND name = 'OtherOrganization'
                )
                BEGIN
                    ALTER TABLE [EventRegistrations] DROP COLUMN [OtherOrganization];
                END
            ";
            migrationBuilder.Sql(sql);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Only add column if it doesn't exist
            var sql = @"
                IF NOT EXISTS (
                    SELECT 1 
                    FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[EventRegistrations]') 
                    AND name = 'OtherOrganization'
                )
                BEGIN
                    ALTER TABLE [EventRegistrations] ADD [OtherOrganization] nvarchar(max) NULL;
                END
            ";
            migrationBuilder.Sql(sql);
        }
    }
}
