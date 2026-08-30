using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Repetitio.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDsaTracker : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DsaProblems",
                columns: table => new
                {
                    LearningItemId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Source = table.Column<string>(type: "TEXT", maxLength: 120, nullable: true),
                    ExternalUrl = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    ProblemStatement = table.Column<string>(type: "TEXT", maxLength: 8000, nullable: true),
                    TestCases = table.Column<string>(type: "TEXT", maxLength: 8000, nullable: true),
                    Assumptions = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: true),
                    Approach = table.Column<string>(type: "TEXT", maxLength: 8000, nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 8000, nullable: true),
                    WhatHelped = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: true),
                    WhatWasDifficult = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: true),
                    ImproveNext = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: true),
                    KnowledgeChecklist = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: true),
                    QuestionsToAsk = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: true),
                    MissedMentalSteps = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: true),
                    ExpectedTimeComplexity = table.Column<string>(type: "TEXT", maxLength: 80, nullable: true),
                    ExpectedSpaceComplexity = table.Column<string>(type: "TEXT", maxLength: 80, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DsaProblems", x => x.LearningItemId);
                    table.ForeignKey(
                        name: "FK_DsaProblems_LearningItems_LearningItemId",
                        column: x => x.LearningItemId,
                        principalTable: "LearningItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DsaSolutions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    LearningItemId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Language = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    SourceCode = table.Column<string>(type: "TEXT", maxLength: 20000, nullable: false),
                    Explanation = table.Column<string>(type: "TEXT", maxLength: 8000, nullable: true),
                    TimeComplexity = table.Column<string>(type: "TEXT", maxLength: 80, nullable: true),
                    SpaceComplexity = table.Column<string>(type: "TEXT", maxLength: 80, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DsaSolutions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DsaSolutions_DsaProblems_LearningItemId",
                        column: x => x.LearningItemId,
                        principalTable: "DsaProblems",
                        principalColumn: "LearningItemId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DsaSolutions_LearningItemId",
                table: "DsaSolutions",
                column: "LearningItemId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DsaSolutions");

            migrationBuilder.DropTable(
                name: "DsaProblems");
        }
    }
}
