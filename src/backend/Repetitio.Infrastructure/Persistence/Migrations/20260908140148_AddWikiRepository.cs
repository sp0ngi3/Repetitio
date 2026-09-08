using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Repetitio.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddWikiRepository : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WikiPages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ParentId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Title = table.Column<string>(type: "TEXT", maxLength: 240, nullable: false),
                    Slug = table.Column<string>(type: "TEXT", maxLength: 180, nullable: false),
                    Path = table.Column<string>(type: "TEXT", maxLength: 1200, nullable: false),
                    Depth = table.Column<int>(type: "INTEGER", nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    Summary = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    ContentMarkdown = table.Column<string>(type: "TEXT", maxLength: 200000, nullable: false),
                    IsArchived = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WikiPages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WikiPages_WikiPages_ParentId",
                        column: x => x.ParentId,
                        principalTable: "WikiPages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WikiPages_Depth",
                table: "WikiPages",
                column: "Depth");

            migrationBuilder.CreateIndex(
                name: "IX_WikiPages_IsArchived",
                table: "WikiPages",
                column: "IsArchived");

            migrationBuilder.CreateIndex(
                name: "IX_WikiPages_ParentId",
                table: "WikiPages",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_WikiPages_ParentId_Slug",
                table: "WikiPages",
                columns: new[] { "ParentId", "Slug" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WikiPages_ParentId_SortOrder",
                table: "WikiPages",
                columns: new[] { "ParentId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_WikiPages_Path",
                table: "WikiPages",
                column: "Path",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WikiPages_Slug",
                table: "WikiPages",
                column: "Slug");

            migrationBuilder.CreateIndex(
                name: "IX_WikiPages_Title",
                table: "WikiPages",
                column: "Title");

            migrationBuilder.CreateIndex(
                name: "IX_WikiPages_UpdatedAt",
                table: "WikiPages",
                column: "UpdatedAt");

            migrationBuilder.Sql("""
                CREATE VIRTUAL TABLE WikiPageSearch USING fts5(
                    WikiPageId UNINDEXED,
                    Title,
                    Path,
                    Summary,
                    ContentMarkdown,
                    tokenize='unicode61'
                );
                """);

            migrationBuilder.Sql("""
                INSERT INTO WikiPageSearch (WikiPageId, Title, Path, Summary, ContentMarkdown)
                SELECT Id, Title, Path, COALESCE(Summary, ''), ContentMarkdown
                FROM WikiPages;
                """);

            migrationBuilder.Sql("""
                CREATE TRIGGER WikiPages_AfterInsert
                AFTER INSERT ON WikiPages
                BEGIN
                    INSERT INTO WikiPageSearch (WikiPageId, Title, Path, Summary, ContentMarkdown)
                    VALUES (new.Id, new.Title, new.Path, COALESCE(new.Summary, ''), new.ContentMarkdown);
                END;
                """);

            migrationBuilder.Sql("""
                CREATE TRIGGER WikiPages_AfterUpdate
                AFTER UPDATE ON WikiPages
                BEGIN
                    DELETE FROM WikiPageSearch WHERE WikiPageId = old.Id;
                    INSERT INTO WikiPageSearch (WikiPageId, Title, Path, Summary, ContentMarkdown)
                    VALUES (new.Id, new.Title, new.Path, COALESCE(new.Summary, ''), new.ContentMarkdown);
                END;
                """);

            migrationBuilder.Sql("""
                CREATE TRIGGER WikiPages_AfterDelete
                AFTER DELETE ON WikiPages
                BEGIN
                    DELETE FROM WikiPageSearch WHERE WikiPageId = old.Id;
                END;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TRIGGER IF EXISTS WikiPages_AfterDelete;");
            migrationBuilder.Sql("DROP TRIGGER IF EXISTS WikiPages_AfterUpdate;");
            migrationBuilder.Sql("DROP TRIGGER IF EXISTS WikiPages_AfterInsert;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS WikiPageSearch;");

            migrationBuilder.DropTable(
                name: "WikiPages");
        }
    }
}
