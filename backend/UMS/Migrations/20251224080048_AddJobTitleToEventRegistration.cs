using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UMS.Migrations
{
    /// <inheritdoc />
    public partial class AddJobTitleToEventRegistration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "JobTitle",
                table: "EventRegistrations",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "JobTitle",
                table: "EventRegistrations");
        }
    }
}
