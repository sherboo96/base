using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UMS.Migrations
{
    /// <inheritdoc />
    public partial class updateLocationTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop foreign key constraint if it exists
            migrationBuilder.Sql(@"
                IF EXISTS (
                    SELECT 1 
                    FROM sys.foreign_keys 
                    WHERE name = 'FK_Users_Locations_LocationId'
                )
                BEGIN
                    ALTER TABLE [Users] DROP CONSTRAINT [FK_Users_Locations_LocationId];
                END
            ");

            // Drop index if it exists
            migrationBuilder.Sql(@"
                IF EXISTS (
                    SELECT 1 
                    FROM sys.indexes 
                    WHERE name = 'IX_Users_LocationId' 
                    AND object_id = OBJECT_ID('Users')
                )
                BEGIN
                    DROP INDEX [IX_Users_LocationId] ON [Users];
                END
            ");

            // Drop column if it exists
            migrationBuilder.Sql(@"
                IF EXISTS (
                    SELECT 1 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = 'Users' 
                    AND COLUMN_NAME = 'LocationId'
                )
                BEGIN
                    ALTER TABLE [Users] DROP COLUMN [LocationId];
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LocationId",
                table: "Users",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_LocationId",
                table: "Users",
                column: "LocationId");

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Locations_LocationId",
                table: "Users",
                column: "LocationId",
                principalTable: "Locations",
                principalColumn: "Id");
        }
    }
}
