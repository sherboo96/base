using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UMS.Migrations
{
    /// <inheritdoc />
    public partial class ChangeIsVipToVipStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsVip",
                table: "EventRegistrations");

            migrationBuilder.AddColumn<int>(
                name: "VipStatus",
                table: "EventRegistrations",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "VipStatus",
                table: "EventRegistrations");

            migrationBuilder.AddColumn<bool>(
                name: "IsVip",
                table: "EventRegistrations",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }
    }
}
