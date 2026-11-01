using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Repetitio.Api.Endpoints;
using Repetitio.Application.Basics;
using Repetitio.Domain.LearningItems;
using Repetitio.Domain.Practice;
using Repetitio.Infrastructure.Persistence;

namespace Repetitio.UnitTests.Basics;

public sealed class BasicExerciseInitializationTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ParallelInitializationAddsMissingExercisesOnceAndPreservesExistingProgress(bool existingCatalog)
    {
        var root = Path.Combine(Path.GetTempPath(), "repetitio-basics-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        var options = new DbContextOptionsBuilder<RepetitioDbContext>()
            .UseSqlite($"Data Source={Path.Combine(root, "test.db")};Pooling=False").Options;
        var oldId = BasicExerciseIds.CreateLearningItemId("reverse-linked-list");
        var sessionId = Guid.NewGuid();
        var practicedAt = new DateTime(2026, 10, 1, 12, 0, 0, DateTimeKind.Utc);
        var reviewAt = practicedAt.AddDays(30);
        try
        {
            await using (var db = new RepetitioDbContext(options))
            {
                await db.Database.MigrateAsync();
                if (existingCatalog)
                {
                    // Model a backup made before the matrix catalog existed.
                    foreach (var exercise in BasicExerciseCatalog.GetAll().Where(item => !item.Tags.Contains("matrix")))
                    {
                        db.LearningItems.Add(new LearningItem
                        {
                            Id = BasicExerciseIds.CreateLearningItemId(exercise.Slug), Type = LearningItemType.Basics,
                            Title = exercise.Title, CreatedAt = practicedAt, UpdatedAt = practicedAt,
                            Status = LearningItemStatus.NotStarted
                        });
                    }
                    var item = db.LearningItems.Local.Single(item => item.Id == oldId);
                    item.Status = LearningItemStatus.Completed;
                    item.Confidence = 4;
                    item.LastPracticedAt = practicedAt;
                    item.NextReviewAt = reviewAt;
                    item.PracticeSessions.Add(new PracticeSession
                    {
                        Id = sessionId, LearningItem = item, LearningItemId = item.Id,
                        StartedAt = practicedAt, CompletedAt = practicedAt, CreatedAt = practicedAt,
                        Outcome = PracticeOutcome.Completed, Notes = "Keep my history", SourceCode = "// keep my saved code"
                    });
                    await db.SaveChangesAsync();
                }
            }

            var initialize = typeof(BasicExerciseEndpoints).GetMethod("EnsureBasicLearningItemsAsync", BindingFlags.NonPublic | BindingFlags.Static)!;
            await Task.WhenAll(Enumerable.Range(0, 6).Select(async _ =>
            {
                await using var db = new RepetitioDbContext(options);
                await (Task)initialize.Invoke(null, [db])!;
            }));

            await using var check = new RepetitioDbContext(options);
            Assert.Equal(BasicExerciseCatalog.GetAll().Count, await check.LearningItems.CountAsync());
            Assert.Equal(await check.Tags.CountAsync(), await check.Tags.Select(tag => tag.Name).Distinct().CountAsync());
            var matrices = BasicExerciseCatalog.GetAll().Where(item => item.Tags.Contains("matrix"));
            foreach (var exercise in matrices)
            {
                var item = await check.LearningItems.Include(item => item.PracticeSessions)
                    .SingleAsync(item => item.Id == BasicExerciseIds.CreateLearningItemId(exercise.Slug));
                Assert.Empty(item.PracticeSessions);
                Assert.Null(item.LastPracticedAt);
                Assert.Equal(LearningItemStatus.NotStarted, item.Status);
            }
            if (existingCatalog)
            {
                var old = await check.LearningItems.Include(item => item.PracticeSessions).SingleAsync(item => item.Id == oldId);
                Assert.Equal(LearningItemStatus.Completed, old.Status);
                Assert.Equal(4, old.Confidence);
                Assert.Equal(practicedAt, old.LastPracticedAt);
                Assert.Equal(reviewAt, old.NextReviewAt);
                var saved = Assert.Single(old.PracticeSessions);
                Assert.Equal(sessionId, saved.Id);
                Assert.Equal("Keep my history", saved.Notes);
                Assert.Equal("// keep my saved code", saved.SourceCode);
            }
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }
}
