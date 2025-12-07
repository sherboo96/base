using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UMS.Migrations
{
    /// <inheritdoc />
    public partial class MoveStructureFieldsToDepartment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // First, add the new columns to Departments as nullable
            migrationBuilder.AddColumn<string>(
                name: "Code",
                table: "Departments",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Level",
                table: "Departments",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NameAr",
                table: "Departments",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NameEn",
                table: "Departments",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "Departments",
                type: "nvarchar(max)",
                nullable: true);

            // Copy data from Structures to their linked Departments
            migrationBuilder.Sql(@"
                UPDATE Departments
                SET 
                    NameAr = s.NameAr,
                    NameEn = s.NameEn,
                    Code = s.Code,
                    Type = s.Type,
                    Level = s.Level
                FROM Departments d
                INNER JOIN Structures s ON s.DepartmentId = d.Id
                WHERE s.DepartmentId IS NOT NULL
            ");

            // Update existing Departments without Structure link - use Name for NameEn and NameAr if they're empty
            migrationBuilder.Sql(@"
                UPDATE Departments
                SET 
                    NameEn = CASE WHEN NameEn IS NULL OR NameEn = '' THEN Name ELSE NameEn END,
                    NameAr = CASE WHEN NameAr IS NULL OR NameAr = '' THEN Name ELSE NameAr END,
                    Code = CASE WHEN Code IS NULL OR Code = '' THEN '' ELSE Code END,
                    Type = CASE WHEN Type IS NULL OR Type = '' THEN 'DepartmentHead' ELSE Type END,
                    Level = CASE WHEN Level IS NULL OR Level = '' THEN 'DepartmentHead' ELSE Level END
                WHERE NameEn IS NULL OR NameAr IS NULL OR Code IS NULL OR Type IS NULL OR Level IS NULL
            ");

            // Make columns non-nullable with defaults for new records
            migrationBuilder.AlterColumn<string>(
                name: "Code",
                table: "Departments",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "Level",
                table: "Departments",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "NameAr",
                table: "Departments",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "NameEn",
                table: "Departments",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "Type",
                table: "Departments",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            // Now drop the columns from Structures
            migrationBuilder.DropColumn(
                name: "Code",
                table: "Structures");

            migrationBuilder.DropColumn(
                name: "Level",
                table: "Structures");

            migrationBuilder.DropColumn(
                name: "NameAr",
                table: "Structures");

            migrationBuilder.DropColumn(
                name: "NameEn",
                table: "Structures");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "Structures");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Code",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "Level",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "NameAr",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "NameEn",
                table: "Departments");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "Departments");

            migrationBuilder.AddColumn<string>(
                name: "Code",
                table: "Structures",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Level",
                table: "Structures",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "NameAr",
                table: "Structures",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "NameEn",
                table: "Structures",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "Structures",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
