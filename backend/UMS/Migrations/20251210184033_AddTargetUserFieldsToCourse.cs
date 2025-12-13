using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UMS.Migrations
{
    /// <inheritdoc />
    public partial class AddTargetUserFieldsToCourse : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TargetDepartmentIds",
                table: "Courses",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TargetDepartmentRole",
                table: "Courses",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TargetOrganizationIds",
                table: "Courses",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TargetSegmentIds",
                table: "Courses",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TargetUserType",
                table: "Courses",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TargetDepartmentIds",
                table: "Courses");

            migrationBuilder.DropColumn(
                name: "TargetDepartmentRole",
                table: "Courses");

            migrationBuilder.DropColumn(
                name: "TargetOrganizationIds",
                table: "Courses");

            migrationBuilder.DropColumn(
                name: "TargetSegmentIds",
                table: "Courses");

            migrationBuilder.DropColumn(
                name: "TargetUserType",
                table: "Courses");
        }
    }
}
