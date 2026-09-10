using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Repetitio.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddWikiImageStorage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WikiImages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    FileName = table.Column<string>(type: "TEXT", maxLength: 260, nullable: false),
                    ContentType = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    Sha256 = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    SizeBytes = table.Column<long>(type: "INTEGER", nullable: false),
                    Data = table.Column<byte[]>(type: "BLOB", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WikiImages", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WikiImages_ContentType",
                table: "WikiImages",
                column: "ContentType");

            migrationBuilder.CreateIndex(
                name: "IX_WikiImages_CreatedAt",
                table: "WikiImages",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_WikiImages_Sha256",
                table: "WikiImages",
                column: "Sha256",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WikiImages_SizeBytes",
                table: "WikiImages",
                column: "SizeBytes");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WikiImages");
        }
    }
}
