using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Repetitio.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPracticeSessionScorecard : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ClarifiedRequirements",
                table: "PracticeSessions",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CommunicatedTradeoffs",
                table: "PracticeSessions",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ExplainedComplexity",
                table: "PracticeSessions",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "FoundEdgeCases",
                table: "PracticeSessions",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "TestedSolution",
                table: "PracticeSessions",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ClarifiedRequirements",
                table: "PracticeSessions");

            migrationBuilder.DropColumn(
                name: "CommunicatedTradeoffs",
                table: "PracticeSessions");

            migrationBuilder.DropColumn(
                name: "ExplainedComplexity",
                table: "PracticeSessions");

            migrationBuilder.DropColumn(
                name: "FoundEdgeCases",
                table: "PracticeSessions");

            migrationBuilder.DropColumn(
                name: "TestedSolution",
                table: "PracticeSessions");
        }
    }
}
