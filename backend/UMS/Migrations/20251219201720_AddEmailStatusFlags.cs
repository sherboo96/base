using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UMS.Migrations
{
    /// <inheritdoc />
    public partial class AddEmailStatusFlags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ConfirmationEmailSent",
                table: "EventRegistrations",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ConfirmationEmailSentAt",
                table: "EventRegistrations",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "FinalApprovalEmailSent",
                table: "EventRegistrations",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "FinalApprovalEmailSentAt",
                table: "EventRegistrations",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "RegistrationSuccessfulEmailSent",
                table: "EventRegistrations",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "RegistrationSuccessfulEmailSentAt",
                table: "EventRegistrations",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ConfirmationEmailSent",
                table: "EventRegistrations");

            migrationBuilder.DropColumn(
                name: "ConfirmationEmailSentAt",
                table: "EventRegistrations");

            migrationBuilder.DropColumn(
                name: "FinalApprovalEmailSent",
                table: "EventRegistrations");

            migrationBuilder.DropColumn(
                name: "FinalApprovalEmailSentAt",
                table: "EventRegistrations");

            migrationBuilder.DropColumn(
                name: "RegistrationSuccessfulEmailSent",
                table: "EventRegistrations");

            migrationBuilder.DropColumn(
                name: "RegistrationSuccessfulEmailSentAt",
                table: "EventRegistrations");
        }
    }
}
