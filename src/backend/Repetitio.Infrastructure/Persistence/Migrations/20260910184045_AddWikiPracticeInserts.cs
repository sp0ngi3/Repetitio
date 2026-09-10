using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Repetitio.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddWikiPracticeInserts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WikiFlashcards",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    WikiPageId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Front = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: false),
                    Back = table.Column<string>(type: "TEXT", maxLength: 8000, nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WikiFlashcards", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WikiFlashcards_WikiPages_WikiPageId",
                        column: x => x.WikiPageId,
                        principalTable: "WikiPages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WikiQuizQuestions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    WikiPageId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Prompt = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: false),
                    Explanation = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: true),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WikiQuizQuestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WikiQuizQuestions_WikiPages_WikiPageId",
                        column: x => x.WikiPageId,
                        principalTable: "WikiPages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WikiQuizOptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    WikiQuizQuestionId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Text = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: false),
                    IsCorrect = table.Column<bool>(type: "INTEGER", nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WikiQuizOptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WikiQuizOptions_WikiQuizQuestions_WikiQuizQuestionId",
                        column: x => x.WikiQuizQuestionId,
                        principalTable: "WikiQuizQuestions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WikiFlashcards_WikiPageId",
                table: "WikiFlashcards",
                column: "WikiPageId");

            migrationBuilder.CreateIndex(
                name: "IX_WikiFlashcards_WikiPageId_SortOrder",
                table: "WikiFlashcards",
                columns: new[] { "WikiPageId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_WikiQuizOptions_WikiQuizQuestionId",
                table: "WikiQuizOptions",
                column: "WikiQuizQuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_WikiQuizOptions_WikiQuizQuestionId_SortOrder",
                table: "WikiQuizOptions",
                columns: new[] { "WikiQuizQuestionId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_WikiQuizQuestions_WikiPageId",
                table: "WikiQuizQuestions",
                column: "WikiPageId");

            migrationBuilder.CreateIndex(
                name: "IX_WikiQuizQuestions_WikiPageId_SortOrder",
                table: "WikiQuizQuestions",
                columns: new[] { "WikiPageId", "SortOrder" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WikiFlashcards");

            migrationBuilder.DropTable(
                name: "WikiQuizOptions");

            migrationBuilder.DropTable(
                name: "WikiQuizQuestions");
        }
    }
}
