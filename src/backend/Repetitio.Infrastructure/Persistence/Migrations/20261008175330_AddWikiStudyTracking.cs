using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Repetitio.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddWikiStudyTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ReviewEnabled",
                table: "WikiPages",
                type: "INTEGER",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "ReviewIntervalDays",
                table: "WikiPages",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "WikiStudyProgress",
                columns: table => new
                {
                    WikiPageId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Kind = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    LastPracticedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    LastCompletedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WikiStudyProgress", x => new { x.WikiPageId, x.Kind });
                    table.ForeignKey(
                        name: "FK_WikiStudyProgress_WikiPages_WikiPageId",
                        column: x => x.WikiPageId,
                        principalTable: "WikiPages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WikiStudySessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WikiStudySessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WikiStudySettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    IntervalDays = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WikiStudySettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WikiStudyAnswers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    SessionId = table.Column<Guid>(type: "TEXT", nullable: false),
                    WikiPageId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ItemId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Kind = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    IsCorrect = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WikiStudyAnswers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WikiStudyAnswers_WikiPages_WikiPageId",
                        column: x => x.WikiPageId,
                        principalTable: "WikiPages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WikiStudyAnswers_WikiStudySessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "WikiStudySessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WikiStudyAnswers_SessionId_ItemId_Kind",
                table: "WikiStudyAnswers",
                columns: new[] { "SessionId", "ItemId", "Kind" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WikiStudyAnswers_WikiPageId_Kind_ItemId",
                table: "WikiStudyAnswers",
                columns: new[] { "WikiPageId", "Kind", "ItemId" });

            migrationBuilder.CreateIndex(
                name: "IX_WikiStudyProgress_LastPracticedAt",
                table: "WikiStudyProgress",
                column: "LastPracticedAt");

            migrationBuilder.CreateIndex(
                name: "IX_WikiStudySessions_CompletedAt",
                table: "WikiStudySessions",
                column: "CompletedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WikiStudyAnswers");

            migrationBuilder.DropTable(
                name: "WikiStudyProgress");

            migrationBuilder.DropTable(
                name: "WikiStudySettings");

            migrationBuilder.DropTable(
                name: "WikiStudySessions");

            migrationBuilder.DropColumn(
                name: "ReviewEnabled",
                table: "WikiPages");

            migrationBuilder.DropColumn(
                name: "ReviewIntervalDays",
                table: "WikiPages");
        }
    }
}
