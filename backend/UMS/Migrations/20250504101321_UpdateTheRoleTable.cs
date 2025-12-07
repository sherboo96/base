using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UMS.Migrations
{
    /// <inheritdoc />
    public partial class UpdateTheRoleTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SystemId",
                table: "Roles",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Roles_SystemId",
                table: "Roles",
                column: "SystemId");

            migrationBuilder.AddForeignKey(
                name: "FK_Roles_Systems_SystemId",
                table: "Roles",
                column: "SystemId",
                principalTable: "Systems",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Roles_Systems_SystemId",
                table: "Roles");

            migrationBuilder.DropIndex(
                name: "IX_Roles_SystemId",
                table: "Roles");

            migrationBuilder.DropColumn(
                name: "SystemId",
                table: "Roles");
        }
    }
}
