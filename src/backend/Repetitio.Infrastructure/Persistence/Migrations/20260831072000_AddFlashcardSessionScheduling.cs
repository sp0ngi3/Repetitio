using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Repetitio.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFlashcardSessionScheduling : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DefaultSessionSize",
                table: "FlashcardDecks",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastPracticedAt",
                table: "FlashcardDecks",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "NextReviewAt",
                table: "FlashcardDecks",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TotalRuns",
                table: "FlashcardDecks",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_FlashcardDecks_NextReviewAt",
                table: "FlashcardDecks",
                column: "NextReviewAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_FlashcardDecks_NextReviewAt",
                table: "FlashcardDecks");

            migrationBuilder.DropColumn(
                name: "DefaultSessionSize",
                table: "FlashcardDecks");

            migrationBuilder.DropColumn(
                name: "LastPracticedAt",
                table: "FlashcardDecks");

            migrationBuilder.DropColumn(
                name: "NextReviewAt",
                table: "FlashcardDecks");

            migrationBuilder.DropColumn(
                name: "TotalRuns",
                table: "FlashcardDecks");
        }
    }
}
