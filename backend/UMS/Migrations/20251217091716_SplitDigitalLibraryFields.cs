using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UMS.Migrations
{
    /// <inheritdoc />
    public partial class SplitDigitalLibraryFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add the new column first
            migrationBuilder.AddColumn<bool>(
                name: "ShowDigitalLibraryInMenu",
                table: "CourseTabs",
                type: "bit",
                nullable: false,
                defaultValue: false);

            // Add the public column by renaming the existing one
            migrationBuilder.RenameColumn(
                name: "ShowDigitalLibrary",
                table: "CourseTabs",
                newName: "ShowDigitalLibraryPublic");

            // Copy existing ShowDigitalLibraryPublic value to ShowDigitalLibraryInMenu
            migrationBuilder.Sql(@"
                UPDATE CourseTabs 
                SET ShowDigitalLibraryInMenu = ShowDigitalLibraryPublic
                WHERE ShowDigitalLibraryPublic = 1
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ShowDigitalLibraryInMenu",
                table: "CourseTabs");

            migrationBuilder.RenameColumn(
                name: "ShowDigitalLibraryPublic",
                table: "CourseTabs",
                newName: "ShowDigitalLibrary");
        }
    }
}
