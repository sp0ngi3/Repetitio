using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Repetitio.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFlashcards : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FlashcardDecks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FlashcardDecks", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Flashcards",
                columns: table => new
                {
                    LearningItemId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Question = table.Column<string>(type: "TEXT", maxLength: 8000, nullable: false),
                    Explanation = table.Column<string>(type: "TEXT", maxLength: 12000, nullable: false),
                    Source = table.Column<string>(type: "TEXT", maxLength: 120, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Flashcards", x => x.LearningItemId);
                    table.ForeignKey(
                        name: "FK_Flashcards_LearningItems_LearningItemId",
                        column: x => x.LearningItemId,
                        principalTable: "LearningItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FlashcardDeckCards",
                columns: table => new
                {
                    DeckId = table.Column<Guid>(type: "TEXT", nullable: false),
                    FlashcardLearningItemId = table.Column<Guid>(type: "TEXT", nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FlashcardDeckCards", x => new { x.DeckId, x.FlashcardLearningItemId });
                    table.ForeignKey(
                        name: "FK_FlashcardDeckCards_FlashcardDecks_DeckId",
                        column: x => x.DeckId,
                        principalTable: "FlashcardDecks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_FlashcardDeckCards_Flashcards_FlashcardLearningItemId",
                        column: x => x.FlashcardLearningItemId,
                        principalTable: "Flashcards",
                        principalColumn: "LearningItemId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FlashcardReviews",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    DeckId = table.Column<Guid>(type: "TEXT", nullable: true),
                    FlashcardLearningItemId = table.Column<Guid>(type: "TEXT", nullable: false),
                    PracticeSessionId = table.Column<Guid>(type: "TEXT", nullable: false),
                    KnewAnswer = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FlashcardReviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FlashcardReviews_FlashcardDecks_DeckId",
                        column: x => x.DeckId,
                        principalTable: "FlashcardDecks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_FlashcardReviews_Flashcards_FlashcardLearningItemId",
                        column: x => x.FlashcardLearningItemId,
                        principalTable: "Flashcards",
                        principalColumn: "LearningItemId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_FlashcardReviews_PracticeSessions_PracticeSessionId",
                        column: x => x.PracticeSessionId,
                        principalTable: "PracticeSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FlashcardDeckCards_FlashcardLearningItemId",
                table: "FlashcardDeckCards",
                column: "FlashcardLearningItemId");

            migrationBuilder.CreateIndex(
                name: "IX_FlashcardDecks_Name",
                table: "FlashcardDecks",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_FlashcardReviews_DeckId",
                table: "FlashcardReviews",
                column: "DeckId");

            migrationBuilder.CreateIndex(
                name: "IX_FlashcardReviews_FlashcardLearningItemId",
                table: "FlashcardReviews",
                column: "FlashcardLearningItemId");

            migrationBuilder.CreateIndex(
                name: "IX_FlashcardReviews_PracticeSessionId",
                table: "FlashcardReviews",
                column: "PracticeSessionId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FlashcardDeckCards");

            migrationBuilder.DropTable(
                name: "FlashcardReviews");

            migrationBuilder.DropTable(
                name: "FlashcardDecks");

            migrationBuilder.DropTable(
                name: "Flashcards");
        }
    }
}
