using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Repetitio.Api.Endpoints;
using Repetitio.Application.Wiki;
using Repetitio.Domain.Wiki;
using Repetitio.Infrastructure.Persistence;
using Repetitio.Infrastructure.Wiki;

namespace Repetitio.UnitTests.Wiki;

public sealed class WikiJsonEditingTests
{
    [Fact]
    public async Task ExportPreservesTreeBodyAndImageLocationsWithoutEmbeddingBinaryData()
    {
        await using var fixture = await Fixture.CreateAsync();
        var result = await Invoke("GetWikiJsonAsync", fixture.Db, fixture.Root.Id, true);
        var document = Assert.IsType<JsonObject>(((IValueHttpResult)result).Value);
        var root = document["pages"]![0]!;
        Assert.Equal(fixture.Root.ContentMarkdown, root["contentMarkdown"]!.GetValue<string>());
        Assert.Equal(fixture.Child.Id, root["children"]![0]!["id"]!.GetValue<Guid>());
        var image = root["images"]![0]!;
        Assert.Equal(fixture.Image.Id, image["id"]!.GetValue<Guid>());
        Assert.Equal(2, image["occurrences"]!.GetValue<int>());
        Assert.Equal(new[] { 3, 7 }, image["lines"]!.AsArray().Select(line => line!.GetValue<int>()));
        Assert.Null(image["data"]);
        Assert.Equal(fixture.Image.Data, (await fixture.Db.WikiImages.SingleAsync()).Data);
    }

    [Fact]
    public async Task TextUpdateKeepsExistingChecksSourceIdsStudyHistoryAndOmittedChildren()
    {
        await using var fixture = await Fixture.CreateAsync();
        var db = fixture.Db;
        var root = fixture.Root;
        var question = root.QuizQuestions.Single();
        var cardId = root.Flashcards.Single().Id;
        var sourceId = root.Sources.Single().Id;
        var service = new WikiStudyService(db);
        Assert.Null(await service.SaveAsync(new(Guid.NewGuid(), [new(root.Id, question.Id, "quiz", question.Options.First(option => option.IsCorrect).Id, null)])));
        var before = (await service.GetOverviewAsync()).Pages.Single(page => page.Id == root.Id).Modes.Single(mode => mode.Kind == "quiz");
        var request = Update(root, Current(root) with { ContentMarkdown = root.ContentMarkdown + "\n\nAdded vocabulary." });
        var result = await Invoke("UpdateWikiJsonAsync", db, root.Id, new WikiJsonUpdateRequest([request]));
        Assert.Equal(200, ((IStatusCodeHttpResult)result).StatusCode);
        db.ChangeTracker.Clear();
        Assert.Equal(question.Id, (await db.WikiQuizQuestions.SingleAsync()).Id);
        Assert.Equal(cardId, (await db.WikiFlashcards.SingleAsync()).Id);
        Assert.Equal(sourceId, (await db.WikiSources.SingleAsync()).Id);
        Assert.Equal("Child body", (await db.WikiPages.SingleAsync(page => page.Id == fixture.Child.Id)).ContentMarkdown);
        Assert.Single(await db.WikiStudyAnswers.ToListAsync());
        var after = (await new WikiStudyService(db).GetOverviewAsync()).Pages.Single(page => page.Id == root.Id).Modes.Single(mode => mode.Kind == "quiz");
        Assert.Equal(before, after);
    }

    [Fact]
    public async Task AddingChecksAndUpdatingSourcesWorksWithLoadedCollectionsAndKeepsUnchangedCheckIds()
    {
        await using var fixture = await Fixture.CreateAsync();
        var questionId = fixture.Root.QuizQuestions.Single().Id;
        var cardId = fixture.Root.Flashcards.Single().Id;
        var current = Current(fixture.Root);
        var update = current with
        {
            Sources = [new() { Title = "Updated book", Type = "Book" }],
            Flashcards = [.. current.Flashcards!, new() { Front = "Extra question", Back = "Extra answer" }]
        };
        var result = await Invoke("UpdateWikiJsonAsync", fixture.Db, fixture.Root.Id, new WikiJsonUpdateRequest([Update(fixture.Root, update)]));
        Assert.Equal(200, ((IStatusCodeHttpResult)result).StatusCode);
        fixture.Db.ChangeTracker.Clear();
        Assert.Equal(questionId, (await fixture.Db.WikiQuizQuestions.SingleAsync()).Id);
        Assert.Contains(await fixture.Db.WikiFlashcards.ToListAsync(), card => card.Id == cardId);
        Assert.Equal(2, await fixture.Db.WikiFlashcards.CountAsync());
        Assert.Equal("Updated book", (await fixture.Db.WikiSources.SingleAsync()).Title);
    }

    [Fact]
    public async Task StaleChildRejectsTheEntireEditBeforeUpdatingRoot()
    {
        await using var fixture = await Fixture.CreateAsync();
        var request = new WikiJsonUpdateRequest([
            Update(fixture.Root, Current(fixture.Root) with { Title = "Changed root" }),
            Update(fixture.Child, Current(fixture.Child) with { ContentMarkdown = "Changed child" }) with { ExpectedUpdatedAt = fixture.Child.UpdatedAt.AddSeconds(-1) }
        ]);
        var result = await Invoke("UpdateWikiJsonAsync", fixture.Db, fixture.Root.Id, request);
        Assert.Equal(409, ((IStatusCodeHttpResult)result).StatusCode);
        fixture.Db.ChangeTracker.Clear();
        Assert.Equal("Root", (await fixture.Db.WikiPages.SingleAsync(page => page.Id == fixture.Root.Id)).Title);
        Assert.Equal("Child body", (await fixture.Db.WikiPages.SingleAsync(page => page.Id == fixture.Child.Id)).ContentMarkdown);
    }

    [Fact]
    public async Task ImageRemovalNeedsExplicitPermissionAndNeverDeletesStoredImage()
    {
        await using var fixture = await Fixture.CreateAsync();
        var request = new WikiJsonUpdateRequest([Update(fixture.Root, Current(fixture.Root) with { ContentMarkdown = "No images" })]);
        var result = await Invoke("UpdateWikiJsonAsync", fixture.Db, fixture.Root.Id, request);
        Assert.Equal(400, ((IStatusCodeHttpResult)result).StatusCode);
        Assert.Contains("wiki-image:", fixture.Root.ContentMarkdown);
        result = await Invoke("UpdateWikiJsonAsync", fixture.Db, fixture.Root.Id, request with { AllowImageRemoval = true });
        Assert.Equal(200, ((IStatusCodeHttpResult)result).StatusCode);
        Assert.Equal(fixture.Image.Data, (await fixture.Db.WikiImages.SingleAsync()).Data);
    }

    [Fact]
    public async Task UnknownImagesAndPagesOutsideTheBranchCannotBeSaved()
    {
        await using var fixture = await Fixture.CreateAsync();
        var unknownImage = new WikiJsonUpdateRequest([Update(fixture.Root, Current(fixture.Root) with { ContentMarkdown = fixture.Root.ContentMarkdown + $"\n![Unknown](wiki-image:{Guid.NewGuid()})" })]);
        Assert.Equal(400, ((IStatusCodeHttpResult)await Invoke("UpdateWikiJsonAsync", fixture.Db, fixture.Root.Id, unknownImage)).StatusCode);
        var outside = NewPage("Outside", "outside");
        fixture.Db.WikiPages.Add(outside); await fixture.Db.SaveChangesAsync();
        var request = new WikiJsonUpdateRequest([Update(fixture.Root, Current(fixture.Root)), Update(outside, Current(outside) with { Title = "Unauthorized" })]);
        Assert.Equal(400, ((IStatusCodeHttpResult)await Invoke("UpdateWikiJsonAsync", fixture.Db, fixture.Root.Id, request)).StatusCode);
        Assert.Equal("Outside", outside.Title);
    }

    [Fact]
    public async Task ParentRenameUpdatesChildPathsAtomicallyAndKeepsOmittedChildren()
    {
        await using var fixture = await Fixture.CreateAsync();
        var request = new WikiJsonUpdateRequest([
            Update(fixture.Root, Current(fixture.Root) with { Slug = "renamed" }),
            Update(fixture.Child, Current(fixture.Child) with { ContentMarkdown = "Updated child" })
        ]);
        var result = await Invoke("UpdateWikiJsonAsync", fixture.Db, fixture.Root.Id, request);
        Assert.Equal(200, ((IStatusCodeHttpResult)result).StatusCode);
        fixture.Db.ChangeTracker.Clear();
        Assert.Equal("renamed/child", (await fixture.Db.WikiPages.SingleAsync(page => page.Id == fixture.Child.Id)).Path);
        Assert.Equal("Updated child", (await fixture.Db.WikiPages.SingleAsync(page => page.Id == fixture.Child.Id)).ContentMarkdown);
        Assert.Equal("renamed/child/grandchild", (await fixture.Db.WikiPages.SingleAsync(page => page.Id == fixture.Grandchild.Id)).Path);
        Assert.Equal("Grandchild body", (await fixture.Db.WikiPages.SingleAsync(page => page.Id == fixture.Grandchild.Id)).ContentMarkdown);
    }

    [Fact]
    public async Task UnchangedJsonDoesNotRewriteTimestampsOrSourceIds()
    {
        await using var fixture = await Fixture.CreateAsync();
        var originalDate = fixture.Root.UpdatedAt;
        var sourceId = fixture.Root.Sources.Single().Id;
        var result = await Invoke("UpdateWikiJsonAsync", fixture.Db, fixture.Root.Id, new WikiJsonUpdateRequest([Update(fixture.Root, Current(fixture.Root))]));
        Assert.Equal(200, ((IStatusCodeHttpResult)result).StatusCode);
        Assert.Equal(0, JsonSerializer.SerializeToNode(((IValueHttpResult)result).Value)!["updatedCount"]!.GetValue<int>());
        Assert.Equal(originalDate, fixture.Root.UpdatedAt);
        Assert.Equal(sourceId, fixture.Root.Sources.Single().Id);
    }

    private static WikiJsonPageUpdate Update(WikiPage page, UpdateWikiPageRequest update) => new(page.Id, page.UpdatedAt, update);
    private static UpdateWikiPageRequest Current(WikiPage page) => (UpdateWikiPageRequest)typeof(WikiEndpoints)
        .GetMethod("WikiJsonCurrentPage", BindingFlags.NonPublic | BindingFlags.Static)!.Invoke(null, [page])!;
    private static Task<IResult> Invoke(string method, params object[] arguments) => (Task<IResult>)typeof(WikiEndpoints)
        .GetMethod(method, BindingFlags.NonPublic | BindingFlags.Static)!.Invoke(null, arguments)!;
    private static WikiPage NewPage(string title, string path, Guid? parentId = null) => new()
    {
        Id = Guid.NewGuid(), Title = title, Slug = path.Split('/').Last(), Path = path, Depth = path.Count(character => character == '/'),
        ParentId = parentId, ContentMarkdown = title + " body", CreatedAt = DateTime.UtcNow.AddDays(-2), UpdatedAt = DateTime.UtcNow.AddDays(-1)
    };

    private sealed class Fixture : IAsyncDisposable
    {
        private readonly SqliteConnection connection = new("Data Source=:memory:");
        public RepetitioDbContext Db { get; private set; } = null!;
        public WikiPage Root { get; private set; } = null!;
        public WikiPage Child { get; private set; } = null!;
        public WikiPage Grandchild { get; private set; } = null!;
        public WikiImage Image { get; private set; } = null!;
        public static async Task<Fixture> CreateAsync()
        {
            var fixture = new Fixture();
            await fixture.connection.OpenAsync();
            fixture.Db = new(new DbContextOptionsBuilder<RepetitioDbContext>().UseSqlite(fixture.connection).Options);
            await fixture.Db.Database.MigrateAsync();
            fixture.Root = NewPage("Root", "root");
            fixture.Child = NewPage("Child", "root/child", fixture.Root.Id);
            fixture.Grandchild = NewPage("Grandchild", "root/child/grandchild", fixture.Child.Id);
            fixture.Image = new() { Id = Guid.NewGuid(), FileName = "diagram.png", ContentType = "image/png", Sha256 = new string('a', 64), SizeBytes = 4, Data = [1, 2, 3, 4], CreatedAt = DateTime.UtcNow };
            fixture.Root.ContentMarkdown = $"Before.\n\n![Diagram](wiki-image:{fixture.Image.Id})\n\nBetween.\n\n![Again](wiki-image:{fixture.Image.Id})\n\nAfter.";
            var quiz = new WikiQuizQuestion { Id = Guid.NewGuid(), Prompt = "Which answer?", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
            quiz.Options.Add(new() { Id = Guid.NewGuid(), Text = "Correct", IsCorrect = true });
            quiz.Options.Add(new() { Id = Guid.NewGuid(), Text = "Incorrect", SortOrder = 1 });
            fixture.Root.QuizQuestions.Add(quiz);
            fixture.Root.Flashcards.Add(new() { Id = Guid.NewGuid(), Front = "Question", Back = "Answer", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
            fixture.Root.Sources.Add(new() { Id = Guid.NewGuid(), Title = "Book", Type = "Book", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
            fixture.Db.WikiPages.AddRange(fixture.Root, fixture.Child, fixture.Grandchild);
            fixture.Db.WikiImages.Add(fixture.Image);
            await fixture.Db.SaveChangesAsync();
            return fixture;
        }
        public async ValueTask DisposeAsync() { await Db.DisposeAsync(); await connection.DisposeAsync(); }
    }
}
