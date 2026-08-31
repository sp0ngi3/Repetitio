using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Repetitio.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NotePages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Area = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    ContentMarkdown = table.Column<string>(type: "TEXT", maxLength: 50000, nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotePages", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NotePages_Area",
                table: "NotePages",
                column: "Area");

            migrationBuilder.CreateIndex(
                name: "IX_NotePages_Area_SortOrder",
                table: "NotePages",
                columns: new[] { "Area", "SortOrder" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NotePages");
        }
    }
}
