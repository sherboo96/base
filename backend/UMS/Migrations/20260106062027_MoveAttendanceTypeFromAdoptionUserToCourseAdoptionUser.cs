using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UMS.Migrations
{
    /// <inheritdoc />
    public partial class MoveAttendanceTypeFromAdoptionUserToCourseAdoptionUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Attendance",
                table: "AdoptionUsers");

            migrationBuilder.AddColumn<int>(
                name: "AttendanceType",
                table: "CourseAdoptionUsers",
                type: "int",
                nullable: false,
                defaultValue: 1);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AttendanceType",
                table: "CourseAdoptionUsers");

            migrationBuilder.AddColumn<int>(
                name: "Attendance",
                table: "AdoptionUsers",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }
    }
}
