using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UMS.Migrations
{
    /// <inheritdoc />
    public partial class AddDepartmentToStructure : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DepartmentId",
                table: "Structures",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Structures_DepartmentId",
                table: "Structures",
                column: "DepartmentId");

            migrationBuilder.AddForeignKey(
                name: "FK_Structures_Departments_DepartmentId",
                table: "Structures",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Structures_Departments_DepartmentId",
                table: "Structures");

            migrationBuilder.DropIndex(
                name: "IX_Structures_DepartmentId",
                table: "Structures");

            migrationBuilder.DropColumn(
                name: "DepartmentId",
                table: "Structures");
        }
    }
}
