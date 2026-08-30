using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Repetitio.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSystemDesignTracker : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SystemDesignProblems",
                columns: table => new
                {
                    LearningItemId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Source = table.Column<string>(type: "TEXT", maxLength: 120, nullable: true),
                    ExternalUrl = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    PromptMarkdown = table.Column<string>(type: "TEXT", maxLength: 12000, nullable: true),
                    FunctionalRequirementsMarkdown = table.Column<string>(type: "TEXT", maxLength: 8000, nullable: true),
                    NonFunctionalRequirementsMarkdown = table.Column<string>(type: "TEXT", maxLength: 8000, nullable: true),
                    ConstraintsMarkdown = table.Column<string>(type: "TEXT", maxLength: 8000, nullable: true),
                    CapacityEstimatesMarkdown = table.Column<string>(type: "TEXT", maxLength: 8000, nullable: true),
                    ApiDesignMarkdown = table.Column<string>(type: "TEXT", maxLength: 12000, nullable: true),
                    DataModelMarkdown = table.Column<string>(type: "TEXT", maxLength: 12000, nullable: true),
                    ArchitectureMarkdown = table.Column<string>(type: "TEXT", maxLength: 16000, nullable: true),
                    ScalingStrategyMarkdown = table.Column<string>(type: "TEXT", maxLength: 12000, nullable: true),
                    TradeoffsMarkdown = table.Column<string>(type: "TEXT", maxLength: 12000, nullable: true),
                    ReflectionMarkdown = table.Column<string>(type: "TEXT", maxLength: 12000, nullable: true),
                    WhatHelped = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: true),
                    WhatWasDifficult = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: true),
                    ImproveNext = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemDesignProblems", x => x.LearningItemId);
                    table.ForeignKey(
                        name: "FK_SystemDesignProblems_LearningItems_LearningItemId",
                        column: x => x.LearningItemId,
                        principalTable: "LearningItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SystemDesignProblems");
        }
    }
}
