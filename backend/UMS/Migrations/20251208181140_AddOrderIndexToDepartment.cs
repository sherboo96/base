using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UMS.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderIndexToDepartment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "OrderIndex",
                table: "Departments",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OrderIndex",
                table: "Departments");
        }
    }
}
