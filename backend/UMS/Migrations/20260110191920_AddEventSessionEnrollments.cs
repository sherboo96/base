using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UMS.Migrations
{
    /// <inheritdoc />
    public partial class AddEventSessionEnrollments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EventSessionEnrollments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NameAr = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Phone = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Barcode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EventSessionId = table.Column<int>(type: "int", nullable: false),
                    EventOrganizationId = table.Column<int>(type: "int", nullable: true),
                    IsCheckedIn = table.Column<bool>(type: "bit", nullable: false),
                    CheckedInAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventSessionEnrollments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EventSessionEnrollments_EventOrganizations_EventOrganizationId",
                        column: x => x.EventOrganizationId,
                        principalTable: "EventOrganizations",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_EventSessionEnrollments_EventSessions_EventSessionId",
                        column: x => x.EventSessionId,
                        principalTable: "EventSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EventSessionEnrollments_EventOrganizationId",
                table: "EventSessionEnrollments",
                column: "EventOrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_EventSessionEnrollments_EventSessionId",
                table: "EventSessionEnrollments",
                column: "EventSessionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EventSessionEnrollments");
        }
    }
}
