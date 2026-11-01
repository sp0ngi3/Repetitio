using System.Reflection;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Options;
using Repetitio.Api.Endpoints;
using Repetitio.Application.Practice;
using Repetitio.Domain.LearningItems;
using Repetitio.Domain.Practice;
using Repetitio.Infrastructure.Backup;
using Repetitio.Infrastructure.Persistence;

namespace Repetitio.UnitTests.Practice;

public sealed class DsaInterviewReviewTests
{
    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    [InlineData(-1)]
    public void AllRatingsRejectValuesOutsideTheScale(int invalid)
    {
        Assert.False(new DsaInterviewReview { ProblemSolving = invalid }.HasValidRatings());
        Assert.False(new DsaInterviewReview { Communication = invalid }.HasValidRatings());
        Assert.False(new DsaInterviewReview { Speed = invalid }.HasValidRatings());
        Assert.False(new DsaInterviewReview { Dsa = invalid }.HasValidRatings());
        Assert.False(new DsaInterviewReview { Coding = invalid }.HasValidRatings());
        Assert.True(new DsaInterviewReview { ProblemSolving = 1, Communication = 2, Speed = 3, Dsa = 4, Coding = 5 }.HasValidRatings());
        Assert.True(new DsaInterviewReview().HasValidRatings());
    }

    [Fact]
    public void OldRequestJsonStillDeserializesWithoutADetailedReview()
    {
        var request = JsonSerializer.Deserialize<CreatePracticeSessionRequest>(
            """{"learningItemId":"00000000-0000-0000-0000-000000000001","clarifiedRequirements":true,"notes":"keep this"}""",
            new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
        Assert.Null(request.InterviewReview);
        Assert.True(request.ClarifiedRequirements);
        Assert.Equal("keep this", request.Notes);
    }

    [Fact]
    public async Task OldDatabaseAndBackupsMigrateWithoutRewritingHistoryAndNewReviewsRoundTrip()
    {
        var root = Path.Combine(Path.GetTempPath(), "repetitio-interview-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        try
        {
            await using var db = new RepetitioDbContext(new DbContextOptionsBuilder<RepetitioDbContext>()
                .UseSqlite($"Data Source={Path.Combine(root, "test.db")};Pooling=False").Options);
            var legacyMigration = "20261023065828_AddWikiStudied";
            await db.GetService<IMigrator>().MigrateAsync(legacyMigration);
            var itemId = Guid.NewGuid();
            var legacyId = Guid.NewGuid();
            var date = DateTime.UtcNow.AddDays(-30);
            await db.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO LearningItems (Id,Type,Title,Status,Difficulty,CreatedAt,UpdatedAt)
                VALUES ({itemId},'Dsa','Retain existing attempts','InProgress','Easy',{date},{date})
                """);
            await db.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO PracticeSessions (Id,LearningItemId,StartedAt,CreatedAt,Outcome,Notes,SourceCode,
                    ClarifiedRequirements,FoundEdgeCases,ExplainedComplexity,TestedSolution,CommunicatedTradeoffs)
                VALUES ({legacyId},{itemId},{date},{date},'Completed','Original notes','// original code',1,1,0,1,0)
                """);
            var service = new RepetitioBackupService(db, new BackupArchiveValidator(), Options.Create(new BackupOptions { Directory = Path.Combine(root, "backups") }));
            await using var oldBackup = await service.ExportFileAsync();
            await db.Database.MigrateAsync();
            var old = await db.PracticeSessions.SingleAsync();
            Assert.Null(old.InterviewReview);
            Assert.True(old.ClarifiedRequirements);
            Assert.True(old.FoundEdgeCases);
            Assert.True(old.TestedSolution);
            Assert.Equal("Original notes", old.Notes);
            Assert.Equal("// original code", old.SourceCode);

            var review = new DsaInterviewReview { RestatedProblem = true, AskedConstraints = true, DiscussedApproaches = true,
                StatedComplexity = true, ReceivedGoAhead = true, TalkedThroughCode = true, MeaningfulNames = true,
                CleanModularCode = true, HandledEdgeCases = true, WalkedThroughExample = true,
                TestedEdgeCases = true, FixedBugs = true, DiscussedOptimizations = true,
                ProblemSolving = 5, Communication = 4, Speed = 3, Dsa = 2, Coding = 1 };
            var result = await Create(db, new() { LearningItemId = itemId, InterviewReview = review });
            var response = Assert.IsType<PracticeSessionResponse>(((IValueHttpResult)result).Value);
            Assert.Equal(review, response.InterviewReview);
            Assert.True(response.ExplainedComplexity);
            Assert.True(response.CommunicatedTradeoffs);
            db.ChangeTracker.Clear();
            Assert.Equal(review, (await db.PracticeSessions.SingleAsync(session => session.Id == response.Id)).InterviewReview);

            await using var currentBackup = await service.ExportFileAsync();
            await db.Database.ExecuteSqlRawAsync("UPDATE PracticeSessions SET InterviewReview = NULL");
            Assert.True((await service.ImportAsync(currentBackup.Contents)).Imported);
            db.ChangeTracker.Clear();
            Assert.Equal(review, (await db.PracticeSessions.SingleAsync(session => session.Id == response.Id)).InterviewReview);
            Assert.Null((await db.PracticeSessions.SingleAsync(session => session.Id == legacyId)).InterviewReview);

            Assert.True((await service.ImportAsync(oldBackup.Contents)).Imported);
            db.ChangeTracker.Clear();
            var restored = Assert.Single(await db.PracticeSessions.ToListAsync());
            Assert.Equal(legacyId, restored.Id);
            Assert.Null(restored.InterviewReview);
            Assert.Equal("Original notes", restored.Notes);
            Assert.Equal("// original code", restored.SourceCode);
            Assert.True(restored.ClarifiedRequirements);
            Assert.Empty(await db.Database.GetPendingMigrationsAsync());
        }
        finally { Directory.Delete(root, recursive: true); }
    }

    [Theory]
    [InlineData(LearningItemType.Dsa, 6)]
    [InlineData(LearningItemType.SystemDesign, 3)]
    [InlineData(LearningItemType.Basics, 3)]
    public async Task InvalidOrUnrelatedReviewsDoNotCreateAttempts(LearningItemType type, int rating)
    {
        await using var db = new RepetitioDbContext(new DbContextOptionsBuilder<RepetitioDbContext>().UseSqlite("Data Source=:memory:").Options);
        await db.Database.OpenConnectionAsync();
        await db.Database.MigrateAsync();
        var item = new LearningItem { Id = Guid.NewGuid(), Type = type, Title = "Unchanged", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        db.LearningItems.Add(item);
        await db.SaveChangesAsync();
        var result = await Create(db, new() { LearningItemId = item.Id, InterviewReview = new() { Speed = rating } });
        Assert.Equal(400, ((IStatusCodeHttpResult)result).StatusCode);
        Assert.Empty(await db.PracticeSessions.ToListAsync());
        Assert.Null(item.LastPracticedAt);
    }

    private static Task<IResult> Create(RepetitioDbContext db, CreatePracticeSessionRequest request) =>
        (Task<IResult>)typeof(PracticeSessionEndpoints).GetMethod("CreatePracticeSessionAsync", BindingFlags.NonPublic | BindingFlags.Static)!
            .Invoke(null, [db, request])!;
}
