using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UMS.Migrations
{
    /// <inheritdoc />
    public partial class AddDepartmentToJobTitle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DepartmentId",
                table: "JobTitles",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_JobTitles_DepartmentId",
                table: "JobTitles",
                column: "DepartmentId");

            migrationBuilder.AddForeignKey(
                name: "FK_JobTitles_Departments_DepartmentId",
                table: "JobTitles",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_JobTitles_Departments_DepartmentId",
                table: "JobTitles");

            migrationBuilder.DropIndex(
                name: "IX_JobTitles_DepartmentId",
                table: "JobTitles");

            migrationBuilder.DropColumn(
                name: "DepartmentId",
                table: "JobTitles");
        }
    }
}
