using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UMS.Migrations
{
    /// <inheritdoc />
    public partial class UpdateLocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "OrganizationId",
                table: "Roles",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Logo",
                table: "Locations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Template",
                table: "Locations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Roles_OrganizationId",
                table: "Roles",
                column: "OrganizationId");

            migrationBuilder.AddForeignKey(
                name: "FK_Roles_Organizations_OrganizationId",
                table: "Roles",
                column: "OrganizationId",
                principalTable: "Organizations",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Roles_Organizations_OrganizationId",
                table: "Roles");

            migrationBuilder.DropIndex(
                name: "IX_Roles_OrganizationId",
                table: "Roles");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                table: "Roles");

            migrationBuilder.DropColumn(
                name: "Logo",
                table: "Locations");

            migrationBuilder.DropColumn(
                name: "Template",
                table: "Locations");
        }
    }
}
