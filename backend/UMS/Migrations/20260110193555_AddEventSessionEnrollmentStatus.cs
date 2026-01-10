using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UMS.Migrations
{
    /// <inheritdoc />
    public partial class AddEventSessionEnrollmentStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ApprovalEmailSent",
                table: "EventSessionEnrollments",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovalEmailSentAt",
                table: "EventSessionEnrollments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "EventSessionEnrollments",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "EventSessionEnrollments",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApprovalEmailSent",
                table: "EventSessionEnrollments");

            migrationBuilder.DropColumn(
                name: "ApprovalEmailSentAt",
                table: "EventSessionEnrollments");

            migrationBuilder.DropColumn(
                name: "Email",
                table: "EventSessionEnrollments");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "EventSessionEnrollments");
        }
    }
}
