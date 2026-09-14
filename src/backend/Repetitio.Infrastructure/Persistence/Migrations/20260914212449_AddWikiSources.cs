using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Repetitio.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddWikiSources : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WikiSources",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    WikiPageId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    Type = table.Column<string>(type: "TEXT", maxLength: 80, nullable: true),
                    Author = table.Column<string>(type: "TEXT", maxLength: 240, nullable: true),
                    Url = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    Locator = table.Column<string>(type: "TEXT", maxLength: 240, nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WikiSources", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WikiSources_WikiPages_WikiPageId",
                        column: x => x.WikiPageId,
                        principalTable: "WikiPages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WikiSources_Author",
                table: "WikiSources",
                column: "Author");

            migrationBuilder.CreateIndex(
                name: "IX_WikiSources_Title",
                table: "WikiSources",
                column: "Title");

            migrationBuilder.CreateIndex(
                name: "IX_WikiSources_Type",
                table: "WikiSources",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_WikiSources_WikiPageId",
                table: "WikiSources",
                column: "WikiPageId");

            migrationBuilder.CreateIndex(
                name: "IX_WikiSources_WikiPageId_SortOrder",
                table: "WikiSources",
                columns: new[] { "WikiPageId", "SortOrder" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WikiSources");
        }
    }
}
