using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UMS.Migrations
{
    /// <inheritdoc />
    public partial class MigrateToIdentityAndAddOrganizationConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop foreign keys that reference Users.Id
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_UserRoles_Users_UserId')
                    ALTER TABLE [UserRoles] DROP CONSTRAINT [FK_UserRoles_Users_UserId];
            ");

            // Drop the Users table and recreate it with string Id
            migrationBuilder.Sql(@"
                -- Create temporary table with new structure
                CREATE TABLE [Users_Temp] (
                    [Id] nvarchar(450) NOT NULL,
                    [FullName] nvarchar(max) NOT NULL,
                    [Email] nvarchar(256) NULL,
                    [EmailConfirmed] bit NOT NULL DEFAULT 0,
                    [PasswordHash] nvarchar(max) NULL,
                    [SecurityStamp] nvarchar(max) NULL,
                    [ConcurrencyStamp] nvarchar(max) NULL,
                    [PhoneNumber] nvarchar(max) NULL,
                    [PhoneNumberConfirmed] bit NOT NULL DEFAULT 0,
                    [TwoFactorEnabled] bit NOT NULL DEFAULT 0,
                    [LockoutEnd] datetimeoffset NULL,
                    [LockoutEnabled] bit NOT NULL DEFAULT 0,
                    [AccessFailedCount] int NOT NULL DEFAULT 0,
                    [UserName] nvarchar(256) NULL,
                    [NormalizedUserName] nvarchar(256) NULL,
                    [NormalizedEmail] nvarchar(256) NULL,
                    [ADUsername] nvarchar(max) NOT NULL,
                    [CivilNo] nvarchar(max) NULL,
                    [JobTitleId] int NULL,
                    [LastLogin] datetime2 NULL,
                    [FailedLoginAttempts] int NOT NULL DEFAULT 0,
                    [IsLocked] bit NOT NULL DEFAULT 0,
                    [LoginMethod] int NOT NULL DEFAULT 2,
                    [OrganizationId] int NOT NULL,
                    [DepartmentId] int NULL,
                    [IsActive] bit NOT NULL DEFAULT 1,
                    [IsDeleted] bit NOT NULL DEFAULT 0,
                    [CreatedOn] datetime2 NOT NULL,
                    [CreatedBy] nvarchar(max) NULL,
                    [UpdatedAt] datetime2 NULL,
                    [UpdatedBy] nvarchar(max) NULL,
                    CONSTRAINT [PK_Users_Temp] PRIMARY KEY ([Id])
                );

                -- Ensure at least one organization exists (IsMain column doesn't exist yet, will be added later)
                IF NOT EXISTS (SELECT 1 FROM [Organizations])
                BEGIN
                    INSERT INTO [Organizations] ([Name], [Code], [IsActive], [IsDeleted], [CreatedOn], [CreatedBy])
                    VALUES ('Ministry of Oil', 'MOIL', 1, 0, GETUTCDATE(), 'System');
                END
                
                -- Get the first organization ID (will be marked as main later)
                DECLARE @MainOrgId int;
                SELECT TOP 1 @MainOrgId = [Id] FROM [Organizations] ORDER BY [Id];
                
                -- Copy data from old table to new table (convert int Id to string)
                INSERT INTO [Users_Temp] (
                    [Id], [FullName], [Email], [ADUsername], [CivilNo], [JobTitleId], 
                    [LastLogin], [FailedLoginAttempts], [IsLocked], [LoginMethod], 
                    [PasswordHash], [OrganizationId], [IsActive], [IsDeleted], 
                    [CreatedOn], [CreatedBy], [UpdatedAt], [UpdatedBy]
                )
                SELECT 
                    CAST([Id] AS nvarchar(450)), 
                    [FullName], [Email], [ADUsername], [CivilNo], [JobTitleId],
                    [LastLogin], [FailedLoginAttempts], [IsLocked], [LoginMethod],
                    [PasswordHash], @MainOrgId, [IsActive], [IsDeleted],
                    [CreatedOn], [CreatedBy], [UpdatedAt], [UpdatedBy]
                FROM [Users];

                -- Drop old table
                DROP TABLE [Users];

                -- Rename new table
                EXEC sp_rename '[Users_Temp]', 'Users';
            ");

            // Columns are already added in the temp table creation above, so we skip AddColumn statements

            // Update UserRoles.UserId to string - need to drop PK constraint first
            migrationBuilder.Sql(@"
                -- Drop primary key constraint on UserRoles
                IF EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'PK_UserRoles')
                    ALTER TABLE [UserRoles] DROP CONSTRAINT [PK_UserRoles];
                
                -- Drop foreign key if exists
                IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_UserRoles_Users_UserId')
                    ALTER TABLE [UserRoles] DROP CONSTRAINT [FK_UserRoles_Users_UserId];
                
                -- Create temporary UserRoles table with string UserId
                CREATE TABLE [UserRoles_Temp] (
                    [UserId] nvarchar(450) NOT NULL,
                    [RoleId] int NOT NULL,
                    CONSTRAINT [PK_UserRoles_Temp] PRIMARY KEY ([UserId], [RoleId])
                );
                
                -- Copy data and convert UserId from int to string
                INSERT INTO [UserRoles_Temp] ([UserId], [RoleId])
                SELECT CAST([UserId] AS nvarchar(450)), [RoleId]
                FROM [UserRoles];
                
                -- Drop old table
                DROP TABLE [UserRoles];
                
                -- Rename new table
                EXEC sp_rename '[UserRoles_Temp]', 'UserRoles';
            ");

            migrationBuilder.AddColumn<bool>(
                name: "IsMain",
                table: "Organizations",
                type: "bit",
                nullable: false,
                defaultValue: false);

            // Mark the first organization as main
            migrationBuilder.Sql(@"
                UPDATE TOP (1) [Organizations] 
                SET [IsMain] = 1 
                WHERE [IsMain] = 0
                ORDER BY [Id];
            ");

            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUserClaims_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderKey = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_AspNetUserLogins_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    LoginProvider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Value = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_AspNetUserTokens_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SystemConfigurations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Key = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Value = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedOn = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemConfigurations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoleId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ClaimType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ClaimValue = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetRoleClaims_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    RoleId = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "Users",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "IX_Users_DepartmentId",
                table: "Users",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_OrganizationId",
                table: "Users",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "Users",
                column: "NormalizedUserName",
                unique: true,
                filter: "[NormalizedUserName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Organizations_IsMain",
                table: "Organizations",
                column: "IsMain",
                unique: true,
                filter: "[IsMain] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetRoleClaims_RoleId",
                table: "AspNetRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "AspNetRoles",
                column: "NormalizedName",
                unique: true,
                filter: "[NormalizedName] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserClaims_UserId",
                table: "AspNetUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserLogins_UserId",
                table: "AspNetUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserRoles_RoleId",
                table: "AspNetUserRoles",
                column: "RoleId");

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Departments_DepartmentId",
                table: "Users",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Organizations_OrganizationId",
                table: "Users",
                column: "OrganizationId",
                principalTable: "Organizations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Users_Departments_DepartmentId",
                table: "Users");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_Organizations_OrganizationId",
                table: "Users");

            migrationBuilder.DropTable(
                name: "AspNetRoleClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens");

            migrationBuilder.DropTable(
                name: "SystemConfigurations");

            migrationBuilder.DropTable(
                name: "AspNetRoles");

            migrationBuilder.DropIndex(
                name: "EmailIndex",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_DepartmentId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_OrganizationId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "UserNameIndex",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Organizations_IsMain",
                table: "Organizations");

            migrationBuilder.DropColumn(
                name: "AccessFailedCount",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ConcurrencyStamp",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "DepartmentId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "EmailConfirmed",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "LockoutEnabled",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "LockoutEnd",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "NormalizedEmail",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "NormalizedUserName",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PhoneNumber",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PhoneNumberConfirmed",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "SecurityStamp",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "TwoFactorEnabled",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "UserName",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "IsMain",
                table: "Organizations");

            migrationBuilder.AlterColumn<string>(
                name: "Email",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(256)",
                oldMaxLength: 256,
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "Users",
                type: "int",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)")
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AlterColumn<int>(
                name: "UserId",
                table: "UserRoles",
                type: "int",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");
        }
    }
}
