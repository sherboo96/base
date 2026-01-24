using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UMS.Migrations
{
    /// <inheritdoc />
    public partial class AddIsFinalApprovalToCourseTabApproval : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsFinalApproval",
                table: "CourseTabApprovals",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsFinalApproval",
                table: "CourseTabApprovals");
        }
    }
}
