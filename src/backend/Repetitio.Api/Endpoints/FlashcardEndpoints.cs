using Microsoft.EntityFrameworkCore;
using Repetitio.Application.Flashcards;
using Repetitio.Application.Practice;
using Repetitio.Application.Review;
using Repetitio.Domain.Flashcards;
using Repetitio.Domain.LearningItems;
using Repetitio.Domain.Practice;
using Repetitio.Infrastructure.Persistence;

namespace Repetitio.Api.Endpoints;

/// <summary>
/// Maps flashcard API endpoints.
/// </summary>
public static class FlashcardEndpoints
{
    private const int MaxBatchImportSize = 1000;
    private const string PriorityFlashcardSort = "priority";

    /// <summary>
    /// Adds flashcard endpoints to the application.
    /// </summary>
    /// <param name="app">The endpoint route builder.</param>
    /// <returns>The same endpoint route builder for chaining.</returns>
    public static IEndpointRouteBuilder MapFlashcardEndpoints(this IEndpointRouteBuilder app)
    {
        ArgumentNullException.ThrowIfNull(app);

        var group = app.MapGroup("/api/flashcards").WithTags("Flashcards");

        group.MapGet("/", GetFlashcardsAsync).WithName("GetFlashcards");
        group.MapGet("/{id:guid}", GetFlashcardAsync).WithName("GetFlashcard");
        group.MapPost("/", CreateFlashcardAsync).WithName("CreateFlashcard");
        group.MapPost("/batch", ImportFlashcardsBatchAsync).WithName("ImportFlashcardsBatch");
        group.MapPut("/{id:guid}", UpdateFlashcardAsync).WithName("UpdateFlashcard");
        group.MapDelete("/{id:guid}", DeleteFlashcardAsync).WithName("DeleteFlashcard");
        group.MapGet("/decks", GetDecksAsync).WithName("GetFlashcardDecks");
        group.MapGet("/decks/{id:guid}", GetDeckAsync).WithName("GetFlashcardDeck");
        group.MapPost("/decks", CreateDeckAsync).WithName("CreateFlashcardDeck");
        group.MapPut("/decks/{id:guid}", UpdateDeckAsync).WithName("UpdateFlashcardDeck");
        group.MapDelete("/decks/{id:guid}", DeleteDeckAsync).WithName("DeleteFlashcardDeck");
        group.MapPost("/sessions/complete", CompleteSessionAsync).WithName("CompleteFlashcardSession");

        return app;
    }

    /// <summary>
    /// Returns flashcards with optional filters.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="status">The optional status filter.</param>
    /// <param name="difficulty">The optional difficulty filter.</param>
    /// <param name="search">The optional text search.</param>
    /// <param name="page">The one-based page number.</param>
    /// <param name="pageSize">The number of flashcards per page.</param>
    /// <returns>The paged flashcard responses.</returns>
    private static async Task<IResult> GetFlashcardsAsync(
        RepetitioDbContext dbContext,
        LearningItemStatus? status,
        LearningDifficulty? difficulty,
        string? search,
        string? sort,
        int page = 1,
        int pageSize = 10)
    {
        var query = FlashcardQuery(dbContext).AsNoTracking();

        if (status is not null)
        {
            query = query.Where(flashcard => flashcard.LearningItem.Status == status);
        }

        if (difficulty is not null)
        {
            query = query.Where(flashcard => flashcard.LearningItem.Difficulty == difficulty);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim();
            query = query.Where(flashcard =>
                flashcard.LearningItem.Title.Contains(normalizedSearch)
                || flashcard.Question.Contains(normalizedSearch)
                || flashcard.Explanation.Contains(normalizedSearch)
                || (flashcard.Source != null && flashcard.Source.Contains(normalizedSearch))
                || flashcard.LearningItem.Tags.Any(itemTag => itemTag.Tag.Name.Contains(normalizedSearch)));
        }

        var normalizedPage = NormalizePage(page);
        var normalizedPageSize = NormalizePageSize(pageSize);
        var totalCount = await query.CountAsync();
        var flashcards = await ApplyFlashcardSort(query, sort)
            .Skip((normalizedPage - 1) * normalizedPageSize)
            .Take(normalizedPageSize)
            .ToListAsync();

        return Results.Ok(new PagedFlashcardResponse
        {
            Items = flashcards.Select(ToResponse).ToArray(),
            TotalCount = totalCount,
            Page = normalizedPage,
            PageSize = normalizedPageSize
        });
    }

    /// <summary>
    /// Returns one flashcard.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="id">The flashcard learning item identifier.</param>
    /// <returns>The flashcard response when found.</returns>
    private static async Task<IResult> GetFlashcardAsync(RepetitioDbContext dbContext, Guid id)
    {
        var flashcard = await FlashcardQuery(dbContext)
            .FirstOrDefaultAsync(card => card.LearningItemId == id);

        return flashcard is null ? Results.NotFound() : Results.Ok(ToResponse(flashcard));
    }

    /// <summary>
    /// Creates a flashcard and its underlying learning item.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="request">The create request.</param>
    /// <returns>The created flashcard response.</returns>
    private static async Task<IResult> CreateFlashcardAsync(RepetitioDbContext dbContext, CreateFlashcardRequest request)
    {
        var validation = ValidateFlashcardRequest(request.Title, request.Question, request.Explanation);

        if (validation is not null)
        {
            return Results.BadRequest(validation);
        }

        var now = DateTime.UtcNow;
        var flashcard = CreateFlashcardEntity(request, now);

        await TagAttachment.AttachTagsAsync(dbContext, flashcard.LearningItem, request.Tags, now);
        dbContext.LearningItems.Add(flashcard.LearningItem);
        dbContext.Flashcards.Add(flashcard);
        await dbContext.SaveChangesAsync();

        return Results.Created($"/api/flashcards/{flashcard.LearningItemId}", ToResponse(flashcard));
    }

    /// <summary>
    /// Imports many flashcards from a JSON payload.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="request">The batch import request.</param>
    /// <returns>The batch import summary.</returns>
    private static async Task<IResult> ImportFlashcardsBatchAsync(
        RepetitioDbContext dbContext,
        ImportFlashcardBatchRequest request)
    {
        var requestedFlashcards = request.Flashcards ?? [];
        var requestedCount = requestedFlashcards.Count;

        if (requestedCount == 0)
        {
            return Results.BadRequest("At least one flashcard is required.");
        }

        if (requestedCount > MaxBatchImportSize)
        {
            return Results.BadRequest($"A single import can contain at most {MaxBatchImportSize} flashcards.");
        }

        if (request.CreateLearningSessions && !IsValidDefaultSessionSize(request.LearningSessionSize))
        {
            return Results.BadRequest("Learning session size must be between 1 and 200.");
        }

        var validation = ValidateFlashcardBatchRequest(requestedFlashcards);

        if (validation is not null)
        {
            return Results.BadRequest(validation);
        }

        var now = DateTime.UtcNow;
        var importedIds = new List<Guid>(requestedCount);
        var createdLearningSessions = new List<FlashcardDeck>();

        await using var transaction = await dbContext.Database.BeginTransactionAsync();

        foreach (var importCard in requestedFlashcards)
        {
            var flashcard = CreateFlashcardEntity(importCard, now);

            await TagAttachment.AttachTagsAsync(dbContext, flashcard.LearningItem, importCard.Tags, now);
            dbContext.LearningItems.Add(flashcard.LearningItem);
            dbContext.Flashcards.Add(flashcard);
            importedIds.Add(flashcard.LearningItemId);
        }

        if (request.CreateLearningSessions)
        {
            createdLearningSessions.AddRange(CreateImportedLearningSessions(
                importedIds,
                request.LearningSessionName,
                request.LearningSessionSize,
                now));
            dbContext.FlashcardDecks.AddRange(createdLearningSessions);
        }

        await dbContext.SaveChangesAsync();
        await transaction.CommitAsync();

        return Results.Ok(new ImportFlashcardBatchResponse
        {
            RequestedCount = requestedCount,
            ImportedCount = importedIds.Count,
            FlashcardIds = importedIds,
            CreatedLearningSessions = createdLearningSessions.Select(ToDeckSummaryResponse).ToArray()
        });
    }

    /// <summary>
    /// Updates a flashcard and its underlying learning item.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="id">The flashcard learning item identifier.</param>
    /// <param name="request">The update request.</param>
    /// <returns>The updated flashcard response when found.</returns>
    private static async Task<IResult> UpdateFlashcardAsync(
        RepetitioDbContext dbContext,
        Guid id,
        UpdateFlashcardRequest request)
    {
        var validation = ValidateFlashcardRequest(request.Title, request.Question, request.Explanation);

        if (validation is not null)
        {
            return Results.BadRequest(validation);
        }

        if (!EndpointValidation.IsValidConfidence(request.Confidence))
        {
            return Results.BadRequest("Confidence must be between 1 and 5.");
        }

        var flashcard = await FlashcardQuery(dbContext)
            .AsTracking()
            .FirstOrDefaultAsync(card => card.LearningItemId == id);

        if (flashcard is null)
        {
            return Results.NotFound();
        }

        var now = DateTime.UtcNow;
        flashcard.LearningItem.Title = request.Title.Trim();
        flashcard.LearningItem.Description = TrimOptional(request.Description);
        flashcard.LearningItem.Status = request.Status;
        flashcard.LearningItem.Difficulty = request.Difficulty;
        flashcard.LearningItem.Confidence = request.Confidence;
        flashcard.LearningItem.UpdatedAt = now;
        flashcard.LearningItem.Tags.Clear();
        flashcard.Question = request.Question.Trim();
        flashcard.Explanation = request.Explanation.Trim();
        flashcard.Source = TrimOptional(request.Source);
        flashcard.UpdatedAt = now;

        await TagAttachment.AttachTagsAsync(dbContext, flashcard.LearningItem, request.Tags, now);
        await dbContext.SaveChangesAsync();

        return Results.Ok(ToResponse(flashcard));
    }

    /// <summary>
    /// Deletes a flashcard and removes it from any saved decks.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="id">The flashcard learning item identifier.</param>
    /// <returns>No content when the flashcard was deleted.</returns>
    private static async Task<IResult> DeleteFlashcardAsync(RepetitioDbContext dbContext, Guid id)
    {
        var item = await dbContext.LearningItems
            .FirstOrDefaultAsync(learningItem => learningItem.Id == id && learningItem.Type == LearningItemType.Flashcard);

        if (item is null)
        {
            return Results.NotFound();
        }

        dbContext.LearningItems.Remove(item);
        await dbContext.SaveChangesAsync();

        return Results.NoContent();
    }

    /// <summary>
    /// Returns saved flashcard decks.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="search">The optional saved session search.</param>
    /// <param name="page">The one-based page number.</param>
    /// <param name="pageSize">The number of saved sessions per page.</param>
    /// <returns>The paged saved flashcard decks.</returns>
    private static async Task<IResult> GetDecksAsync(
        RepetitioDbContext dbContext,
        string? search,
        int page = 1,
        int pageSize = 10)
    {
        var query = dbContext.FlashcardDecks.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim();
            query = query.Where(deck =>
                deck.Name.Contains(normalizedSearch)
                || (deck.Description != null && deck.Description.Contains(normalizedSearch))
                || deck.Cards.Any(deckCard =>
                    deckCard.Flashcard.LearningItem.Title.Contains(normalizedSearch)
                    || deckCard.Flashcard.Question.Contains(normalizedSearch)
                    || deckCard.Flashcard.Explanation.Contains(normalizedSearch)
                    || (deckCard.Flashcard.Source != null && deckCard.Flashcard.Source.Contains(normalizedSearch))
                    || deckCard.Flashcard.LearningItem.Tags.Any(itemTag => itemTag.Tag.Name.Contains(normalizedSearch))));
        }

        var normalizedPage = NormalizePage(page);
        var normalizedPageSize = NormalizePageSize(pageSize);
        var totalCount = await query.CountAsync();
        var decks = await query
            .OrderBy(deck => deck.NextReviewAt == null)
            .ThenBy(deck => deck.NextReviewAt)
            .ThenBy(deck => deck.Name)
            .Skip((normalizedPage - 1) * normalizedPageSize)
            .Take(normalizedPageSize)
            .Select(deck => new FlashcardDeckSummaryResponse
            {
                Id = deck.Id,
                Name = deck.Name,
                Description = deck.Description,
                CardCount = deck.Cards.Count,
                DefaultSessionSize = deck.DefaultSessionSize,
                TotalRuns = deck.TotalRuns,
                TotalReviews = deck.Reviews.Count,
                KnownReviews = deck.Reviews.Count(review => review.KnewAnswer),
                LastPracticedAt = deck.LastPracticedAt,
                NextReviewAt = deck.NextReviewAt,
                CreatedAt = deck.CreatedAt,
                UpdatedAt = deck.UpdatedAt
            })
            .ToListAsync();

        return Results.Ok(new PagedFlashcardDeckResponse
        {
            Items = decks,
            TotalCount = totalCount,
            Page = normalizedPage,
            PageSize = normalizedPageSize
        });
    }

    /// <summary>
    /// Returns one saved flashcard deck with its selected cards.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="id">The deck identifier.</param>
    /// <returns>The saved flashcard deck when found.</returns>
    private static async Task<IResult> GetDeckAsync(RepetitioDbContext dbContext, Guid id)
    {
        var deck = await DeckQuery(dbContext)
            .FirstOrDefaultAsync(savedDeck => savedDeck.Id == id);

        return deck is null ? Results.NotFound() : Results.Ok(ToDeckResponse(deck));
    }

    /// <summary>
    /// Creates a saved flashcard deck.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="request">The deck request.</param>
    /// <returns>The created deck response.</returns>
    private static async Task<IResult> CreateDeckAsync(RepetitioDbContext dbContext, SaveFlashcardDeckRequest request)
    {
        if (!EndpointValidation.HasText(request.Name))
        {
            return Results.BadRequest("Deck name is required.");
        }

        if (!IsValidDefaultSessionSize(request.DefaultSessionSize))
        {
            return Results.BadRequest("Default session size must be between 1 and 200.");
        }

        var uniqueCardIds = request.FlashcardIds.Distinct().ToArray();

        if (uniqueCardIds.Length == 0)
        {
            return Results.BadRequest("At least one flashcard is required.");
        }

        var existingCardIds = await dbContext.Flashcards
            .Where(flashcard => uniqueCardIds.Contains(flashcard.LearningItemId))
            .Select(flashcard => flashcard.LearningItemId)
            .ToListAsync();

        if (existingCardIds.Count != uniqueCardIds.Length)
        {
            return Results.BadRequest("Every selected flashcard must exist.");
        }

        var now = DateTime.UtcNow;
        var deck = new FlashcardDeck
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Description = TrimOptional(request.Description),
            DefaultSessionSize = request.DefaultSessionSize,
            CreatedAt = now,
            UpdatedAt = now
        };

        AddDeckCards(deck, uniqueCardIds);
        dbContext.FlashcardDecks.Add(deck);
        await dbContext.SaveChangesAsync();

        var created = await DeckQuery(dbContext).FirstAsync(savedDeck => savedDeck.Id == deck.Id);
        return Results.Created($"/api/flashcards/decks/{deck.Id}", ToDeckResponse(created));
    }

    /// <summary>
    /// Updates a saved flashcard deck.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="id">The deck identifier.</param>
    /// <param name="request">The deck request.</param>
    /// <returns>The updated deck response when found.</returns>
    private static async Task<IResult> UpdateDeckAsync(
        RepetitioDbContext dbContext,
        Guid id,
        SaveFlashcardDeckRequest request)
    {
        if (!EndpointValidation.HasText(request.Name))
        {
            return Results.BadRequest("Deck name is required.");
        }

        if (!IsValidDefaultSessionSize(request.DefaultSessionSize))
        {
            return Results.BadRequest("Default session size must be between 1 and 200.");
        }

        var uniqueCardIds = request.FlashcardIds.Distinct().ToArray();

        if (uniqueCardIds.Length == 0)
        {
            return Results.BadRequest("At least one flashcard is required.");
        }

        var deck = await dbContext.FlashcardDecks
            .Include(savedDeck => savedDeck.Cards)
            .FirstOrDefaultAsync(savedDeck => savedDeck.Id == id);

        if (deck is null)
        {
            return Results.NotFound();
        }

        var existingCardIds = await dbContext.Flashcards
            .Where(flashcard => uniqueCardIds.Contains(flashcard.LearningItemId))
            .Select(flashcard => flashcard.LearningItemId)
            .ToListAsync();

        if (existingCardIds.Count != uniqueCardIds.Length)
        {
            return Results.BadRequest("Every selected flashcard must exist.");
        }

        deck.Name = request.Name.Trim();
        deck.Description = TrimOptional(request.Description);
        deck.DefaultSessionSize = request.DefaultSessionSize;
        deck.UpdatedAt = DateTime.UtcNow;
        SyncDeckCards(deck, uniqueCardIds);

        await dbContext.SaveChangesAsync();

        var updated = await DeckQuery(dbContext).FirstAsync(savedDeck => savedDeck.Id == deck.Id);
        return Results.Ok(ToDeckResponse(updated));
    }

    /// <summary>
    /// Deletes a saved flashcard deck.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="id">The deck identifier.</param>
    /// <param name="deleteCards">Whether to delete every flashcard selected in the deck.</param>
    /// <returns>No content when the deck was deleted.</returns>
    private static async Task<IResult> DeleteDeckAsync(RepetitioDbContext dbContext, Guid id, bool deleteCards = false)
    {
        var deck = await dbContext.FlashcardDecks
            .Include(savedDeck => savedDeck.Cards)
            .FirstOrDefaultAsync(savedDeck => savedDeck.Id == id);

        if (deck is null)
        {
            return Results.NotFound();
        }

        var cardIds = deleteCards
            ? deck.Cards.Select(deckCard => deckCard.FlashcardLearningItemId).Distinct().ToArray()
            : [];

        dbContext.FlashcardDecks.Remove(deck);

        if (cardIds.Length > 0)
        {
            var learningItems = await dbContext.LearningItems
                .Where(learningItem => cardIds.Contains(learningItem.Id) && learningItem.Type == LearningItemType.Flashcard)
                .ToListAsync();

            dbContext.LearningItems.RemoveRange(learningItems);
        }

        await dbContext.SaveChangesAsync();

        return Results.NoContent();
    }

    /// <summary>
    /// Saves flashcard learning session results.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <param name="request">The completed session request.</param>
    /// <returns>The saved session summary.</returns>
    private static async Task<IResult> CompleteSessionAsync(
        RepetitioDbContext dbContext,
        CompleteFlashcardSessionRequest request)
    {
        var reviews = request.Reviews
            .GroupBy(review => review.FlashcardId)
            .Select(group => group.Last())
            .ToArray();

        if (reviews.Length == 0)
        {
            return Results.BadRequest("At least one reviewed flashcard is required.");
        }

        if (reviews.Any(review => !EndpointValidation.IsValidConfidence(review.Confidence)))
        {
            return Results.BadRequest("Confidence must be between 1 and 5.");
        }

        FlashcardDeck? deck = null;

        if (request.DeckId is not null)
        {
            deck = await dbContext.FlashcardDecks
                .AsTracking()
                .FirstOrDefaultAsync(savedDeck => savedDeck.Id == request.DeckId);

            if (deck is null)
            {
                return Results.BadRequest("Deck does not exist.");
            }
        }

        var cardIds = reviews.Select(review => review.FlashcardId).ToArray();
        var flashcards = await FlashcardQuery(dbContext)
            .AsTracking()
            .Where(flashcard => cardIds.Contains(flashcard.LearningItemId))
            .ToListAsync();

        if (flashcards.Count != cardIds.Length)
        {
            return Results.BadRequest("Every reviewed flashcard must exist.");
        }

        var now = DateTime.UtcNow;
        var flashcardsById = flashcards.ToDictionary(flashcard => flashcard.LearningItemId);
        var knownAnswers = 0;

        foreach (var review in reviews)
        {
            var flashcard = flashcardsById[review.FlashcardId];
            var outcome = review.KnewAnswer ? PracticeOutcome.Passed : PracticeOutcome.Failed;
            var confidence = review.Confidence ?? (review.KnewAnswer ? 4 : 2);
            var session = new PracticeSession
            {
                Id = Guid.NewGuid(),
                LearningItemId = flashcard.LearningItemId,
                LearningItem = flashcard.LearningItem,
                StartedAt = now,
                CompletedAt = now,
                DurationMs = 0,
                Outcome = outcome,
                Confidence = confidence,
                Notes = TrimOptional(request.Notes),
                CreatedAt = now
            };

            UpdateLearningItemAfterPractice(flashcard.LearningItem, session, now);

            dbContext.PracticeSessions.Add(session);
            dbContext.FlashcardReviews.Add(new FlashcardReview
            {
                Id = Guid.NewGuid(),
                DeckId = request.DeckId,
                FlashcardLearningItemId = flashcard.LearningItemId,
                PracticeSessionId = session.Id,
                KnewAnswer = review.KnewAnswer,
                CreatedAt = now
            });

            knownAnswers += review.KnewAnswer ? 1 : 0;
        }

        if (deck is not null)
        {
            UpdateDeckAfterPractice(deck, reviews, now);
        }

        await dbContext.SaveChangesAsync();

        return Results.Ok(new CompleteFlashcardSessionResponse
        {
            SavedReviews = reviews.Length,
            KnownAnswers = knownAnswers,
            MissedAnswers = reviews.Length - knownAnswers
        });
    }

    /// <summary>
    /// Creates the common flashcard query with all required navigations.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <returns>The base flashcard query.</returns>
    private static IQueryable<Flashcard> FlashcardQuery(RepetitioDbContext dbContext)
    {
        return dbContext.Flashcards
            .Include(flashcard => flashcard.LearningItem)
            .ThenInclude(item => item.Tags)
            .ThenInclude(itemTag => itemTag.Tag)
            .Include(flashcard => flashcard.LearningItem)
            .ThenInclude(item => item.PracticeSessions)
            .Include(flashcard => flashcard.Reviews);
    }

    /// <summary>
    /// Applies the requested flashcard ordering.
    /// </summary>
    /// <param name="query">The flashcard query to sort.</param>
    /// <param name="sort">The requested sort mode.</param>
    /// <returns>The sorted flashcard query.</returns>
    private static IOrderedQueryable<Flashcard> ApplyFlashcardSort(IQueryable<Flashcard> query, string? sort)
    {
        if (string.Equals(sort, PriorityFlashcardSort, StringComparison.OrdinalIgnoreCase))
        {
            var now = DateTime.UtcNow;

            return query
                .OrderByDescending(flashcard =>
                    flashcard.LearningItem.NextReviewAt != null && flashcard.LearningItem.NextReviewAt <= now)
                .ThenBy(flashcard => flashcard.LearningItem.Confidence ?? 0)
                .ThenByDescending(flashcard =>
                    flashcard.LearningItem.Difficulty == LearningDifficulty.Hard
                        ? 3
                        : flashcard.LearningItem.Difficulty == LearningDifficulty.Medium
                            ? 2
                            : flashcard.LearningItem.Difficulty == LearningDifficulty.Easy
                                ? 1
                                : 0)
                .ThenByDescending(flashcard => flashcard.LearningItem.CreatedAt)
                .ThenBy(flashcard => flashcard.LearningItem.Title);
        }

        return query
            .OrderBy(flashcard => flashcard.LearningItem.NextReviewAt == null)
            .ThenBy(flashcard => flashcard.LearningItem.NextReviewAt)
            .ThenBy(flashcard => flashcard.LearningItem.Title);
    }

    /// <summary>
    /// Creates the common deck query with selected flashcards.
    /// </summary>
    /// <param name="dbContext">The database context.</param>
    /// <returns>The base deck query.</returns>
    private static IQueryable<FlashcardDeck> DeckQuery(RepetitioDbContext dbContext)
    {
        return dbContext.FlashcardDecks
            .Include(deck => deck.Reviews)
            .Include(deck => deck.Cards)
            .ThenInclude(deckCard => deckCard.Flashcard)
            .ThenInclude(flashcard => flashcard.LearningItem)
            .ThenInclude(item => item.Tags)
            .ThenInclude(itemTag => itemTag.Tag)
            .Include(deck => deck.Cards)
            .ThenInclude(deckCard => deckCard.Flashcard)
            .ThenInclude(flashcard => flashcard.LearningItem)
            .ThenInclude(item => item.PracticeSessions)
            .Include(deck => deck.Cards)
            .ThenInclude(deckCard => deckCard.Flashcard)
            .ThenInclude(flashcard => flashcard.Reviews);
    }

    /// <summary>
    /// Adds selected card identifiers to a deck in order.
    /// </summary>
    /// <param name="deck">The deck to populate.</param>
    /// <param name="cardIds">The selected flashcard identifiers.</param>
    private static void AddDeckCards(FlashcardDeck deck, IReadOnlyCollection<Guid> cardIds)
    {
        var sortOrder = 0;

        foreach (var cardId in cardIds)
        {
            deck.Cards.Add(new FlashcardDeckCard
            {
                DeckId = deck.Id,
                FlashcardLearningItemId = cardId,
                SortOrder = sortOrder++
            });
        }
    }

    /// <summary>
    /// Creates one or more saved learning sessions from imported flashcard identifiers.
    /// </summary>
    /// <param name="cardIds">The imported flashcard identifiers in import order.</param>
    /// <param name="requestedName">The requested base saved session name.</param>
    /// <param name="sessionSize">The maximum number of cards per saved session.</param>
    /// <param name="createdAt">The creation timestamp.</param>
    /// <returns>The created saved learning session definitions.</returns>
    private static IReadOnlyCollection<FlashcardDeck> CreateImportedLearningSessions(
        IReadOnlyList<Guid> cardIds,
        string? requestedName,
        int sessionSize,
        DateTime createdAt)
    {
        var sessionCount = (int)Math.Ceiling(cardIds.Count / (double)sessionSize);
        var baseName = TrimOptional(requestedName) ?? "Imported flashcards";
        var decks = new List<FlashcardDeck>(sessionCount);

        for (var index = 0; index < sessionCount; index++)
        {
            var chunk = cardIds.Skip(index * sessionSize).Take(sessionSize).ToArray();
            var deck = new FlashcardDeck
            {
                Id = Guid.NewGuid(),
                Name = sessionCount == 1 ? baseName : $"{baseName} {index + 1}",
                Description = $"Created from batch import on {createdAt:yyyy-MM-dd}.",
                DefaultSessionSize = sessionSize,
                CreatedAt = createdAt,
                UpdatedAt = createdAt
            };

            AddDeckCards(deck, chunk);
            decks.Add(deck);
        }

        return decks;
    }

    /// <summary>
    /// Synchronizes selected card identifiers for an existing deck without duplicating tracked keys.
    /// </summary>
    /// <param name="deck">The deck to update.</param>
    /// <param name="cardIds">The selected flashcard identifiers.</param>
    private static void SyncDeckCards(FlashcardDeck deck, IReadOnlyList<Guid> cardIds)
    {
        var selectedIds = cardIds.ToHashSet();
        var cardsToRemove = deck.Cards
            .Where(deckCard => !selectedIds.Contains(deckCard.FlashcardLearningItemId))
            .ToArray();

        foreach (var deckCard in cardsToRemove)
        {
            deck.Cards.Remove(deckCard);
        }

        var existingCards = deck.Cards.ToDictionary(deckCard => deckCard.FlashcardLearningItemId);

        for (var index = 0; index < cardIds.Count; index++)
        {
            var cardId = cardIds[index];

            if (existingCards.TryGetValue(cardId, out var existingCard))
            {
                existingCard.SortOrder = index;
                continue;
            }

            deck.Cards.Add(new FlashcardDeckCard
            {
                DeckId = deck.Id,
                FlashcardLearningItemId = cardId,
                SortOrder = index
            });
        }
    }

    /// <summary>
    /// Updates learning item metadata after a flashcard review.
    /// </summary>
    /// <param name="learningItem">The reviewed learning item.</param>
    /// <param name="session">The created practice session.</param>
    /// <param name="updatedAt">The update timestamp.</param>
    private static void UpdateLearningItemAfterPractice(LearningItem learningItem, PracticeSession session, DateTime updatedAt)
    {
        learningItem.LastPracticedAt = session.CompletedAt ?? session.StartedAt;
        learningItem.UpdatedAt = updatedAt;

        if (session.Confidence is not null)
        {
            learningItem.Confidence = session.Confidence;
            learningItem.NextReviewAt = ConfidenceReviewSchedule.CalculateNextReviewAt(
                session.CompletedAt ?? session.StartedAt,
                session.Confidence.Value);
        }

        var successfulAttemptCount = learningItem.PracticeSessions.Count(PracticeProgressPolicy.IsSuccessfulAttempt)
            + (PracticeProgressPolicy.IsSuccessfulAttempt(session) ? 1 : 0);

        learningItem.Status = PracticeProgressPolicy.CalculateStatus(
            learningItem.Status,
            session.Outcome,
            successfulAttemptCount);
    }

    /// <summary>
    /// Converts a flashcard into an API response.
    /// </summary>
    /// <param name="flashcard">The flashcard.</param>
    /// <returns>The flashcard response.</returns>
    private static FlashcardResponse ToResponse(Flashcard flashcard)
    {
        return new FlashcardResponse
        {
            Id = flashcard.LearningItemId,
            Title = flashcard.LearningItem.Title,
            Description = flashcard.LearningItem.Description,
            Question = flashcard.Question,
            Explanation = flashcard.Explanation,
            Source = flashcard.Source,
            Status = flashcard.LearningItem.Status,
            Difficulty = flashcard.LearningItem.Difficulty,
            Confidence = flashcard.LearningItem.Confidence,
            LastPracticedAt = flashcard.LearningItem.LastPracticedAt,
            NextReviewAt = flashcard.LearningItem.NextReviewAt,
            Tags = flashcard.LearningItem.Tags.Select(itemTag => itemTag.Tag.Name).Order(StringComparer.Ordinal).ToArray(),
            TotalReviews = flashcard.Reviews.Count,
            KnownReviews = flashcard.Reviews.Count(review => review.KnewAnswer),
            PracticeSessions = flashcard.LearningItem.PracticeSessions
                .OrderByDescending(session => session.CreatedAt)
                .Select(session => ToPracticeSessionResponse(session, flashcard.LearningItem.Title))
                .ToArray()
        };
    }

    /// <summary>
    /// Converts a deck into an API response.
    /// </summary>
    /// <param name="deck">The deck.</param>
    /// <returns>The deck response.</returns>
    private static FlashcardDeckResponse ToDeckResponse(FlashcardDeck deck)
    {
        return new FlashcardDeckResponse
        {
            Id = deck.Id,
            Name = deck.Name,
            Description = deck.Description,
            DefaultSessionSize = deck.DefaultSessionSize,
            TotalRuns = deck.TotalRuns,
            TotalReviews = deck.Reviews.Count,
            KnownReviews = deck.Reviews.Count(review => review.KnewAnswer),
            LastPracticedAt = deck.LastPracticedAt,
            NextReviewAt = deck.NextReviewAt,
            CreatedAt = deck.CreatedAt,
            UpdatedAt = deck.UpdatedAt,
            Cards = deck.Cards
                .OrderBy(deckCard => deckCard.SortOrder)
                .Select(deckCard => ToResponse(deckCard.Flashcard))
                .ToArray()
        };
    }

    /// <summary>
    /// Converts a deck into a list summary response.
    /// </summary>
    /// <param name="deck">The deck.</param>
    /// <returns>The saved session summary.</returns>
    private static FlashcardDeckSummaryResponse ToDeckSummaryResponse(FlashcardDeck deck)
    {
        return new FlashcardDeckSummaryResponse
        {
            Id = deck.Id,
            Name = deck.Name,
            Description = deck.Description,
            CardCount = deck.Cards.Count,
            DefaultSessionSize = deck.DefaultSessionSize,
            TotalRuns = deck.TotalRuns,
            TotalReviews = deck.Reviews.Count,
            KnownReviews = deck.Reviews.Count(review => review.KnewAnswer),
            LastPracticedAt = deck.LastPracticedAt,
            NextReviewAt = deck.NextReviewAt,
            CreatedAt = deck.CreatedAt,
            UpdatedAt = deck.UpdatedAt
        };
    }

    /// <summary>
    /// Converts a practice session into an API response for a known flashcard title.
    /// </summary>
    /// <param name="session">The practice session.</param>
    /// <param name="learningItemTitle">The related learning item title.</param>
    /// <returns>The practice session response.</returns>
    private static PracticeSessionResponse ToPracticeSessionResponse(PracticeSession session, string learningItemTitle)
    {
        return new PracticeSessionResponse
        {
            Id = session.Id,
            LearningItemId = session.LearningItemId,
            LearningItemTitle = learningItemTitle,
            StartedAt = session.StartedAt,
            CompletedAt = session.CompletedAt,
            DurationMs = session.DurationMs,
            Outcome = session.Outcome,
            Confidence = session.Confidence,
            Notes = session.Notes,
            SourceCode = session.SourceCode,
            WhatHelped = session.WhatHelped,
            WhatWasDifficult = session.WhatWasDifficult,
            ImproveNext = session.ImproveNext,
            CreatedAt = session.CreatedAt
        };
    }

    /// <summary>
    /// Validates required flashcard text fields.
    /// </summary>
    /// <param name="title">The flashcard title.</param>
    /// <param name="question">The flashcard question.</param>
    /// <param name="explanation">The flashcard explanation.</param>
    /// <returns>A validation message when invalid; otherwise, <see langword="null"/>.</returns>
    private static string? ValidateFlashcardRequest(string title, string question, string explanation)
    {
        if (!EndpointValidation.HasText(title))
        {
            return "Title is required.";
        }

        if (!EndpointValidation.HasText(question))
        {
            return "Question is required.";
        }

        return EndpointValidation.HasText(explanation) ? null : "Explanation is required.";
    }

    /// <summary>
    /// Validates all cards in a flashcard batch import.
    /// </summary>
    /// <param name="flashcards">The requested flashcards.</param>
    /// <returns>A validation message when invalid; otherwise, <see langword="null"/>.</returns>
    private static string? ValidateFlashcardBatchRequest(IEnumerable<CreateFlashcardRequest?> flashcards)
    {
        var errors = flashcards
            .Select((flashcard, index) => new
            {
                Index = index + 1,
                Message = flashcard is null
                    ? "Flashcard object is required."
                    : ValidateFlashcardRequest(flashcard.Title, flashcard.Question, flashcard.Explanation)
            })
            .Where(result => result.Message is not null)
            .Select(result => $"Flashcard {result.Index}: {result.Message}")
            .ToArray();

        return errors.Length == 0 ? null : string.Join(Environment.NewLine, errors);
    }

    /// <summary>
    /// Creates a flashcard aggregate from an incoming create request.
    /// </summary>
    /// <param name="request">The create request.</param>
    /// <param name="createdAt">The creation timestamp.</param>
    /// <returns>The untracked flashcard entity.</returns>
    private static Flashcard CreateFlashcardEntity(CreateFlashcardRequest request, DateTime createdAt)
    {
        var item = new LearningItem
        {
            Id = Guid.NewGuid(),
            Type = LearningItemType.Flashcard,
            Title = request.Title.Trim(),
            Description = TrimOptional(request.Description),
            Status = LearningItemStatus.NotStarted,
            Difficulty = request.Difficulty,
            CreatedAt = createdAt,
            UpdatedAt = createdAt
        };

        return new Flashcard
        {
            LearningItemId = item.Id,
            LearningItem = item,
            Question = request.Question.Trim(),
            Explanation = request.Explanation.Trim(),
            Source = TrimOptional(request.Source),
            CreatedAt = createdAt,
            UpdatedAt = createdAt
        };
    }

    /// <summary>
    /// Updates saved learning session metadata after a completed run.
    /// </summary>
    /// <param name="deck">The saved learning session definition.</param>
    /// <param name="reviews">The submitted review results.</param>
    /// <param name="completedAt">The UTC completion timestamp.</param>
    private static void UpdateDeckAfterPractice(
        FlashcardDeck deck,
        IReadOnlyCollection<CompleteFlashcardReviewRequest> reviews,
        DateTime completedAt)
    {
        var averageConfidence = (int)Math.Round(reviews.Average(review => review.Confidence ?? (review.KnewAnswer ? 4 : 2)));
        var boundedConfidence = Math.Clamp(averageConfidence, 1, 5);

        deck.TotalRuns++;
        deck.LastPracticedAt = completedAt;
        deck.NextReviewAt = ConfidenceReviewSchedule.CalculateNextReviewAt(completedAt, boundedConfidence);
        deck.UpdatedAt = completedAt;
    }

    /// <summary>
    /// Returns whether the default saved session size is valid.
    /// </summary>
    /// <param name="defaultSessionSize">The requested session size.</param>
    /// <returns><see langword="true"/> when valid; otherwise, <see langword="false"/>.</returns>
    private static bool IsValidDefaultSessionSize(int defaultSessionSize)
    {
        return defaultSessionSize is >= 1 and <= 200;
    }

    /// <summary>
    /// Normalizes one-based page numbers from query string input.
    /// </summary>
    /// <param name="page">The requested page number.</param>
    /// <returns>A page number greater than zero.</returns>
    private static int NormalizePage(int page)
    {
        return Math.Max(1, page);
    }

    /// <summary>
    /// Normalizes page size query string input.
    /// </summary>
    /// <param name="pageSize">The requested page size.</param>
    /// <returns>A bounded page size.</returns>
    private static int NormalizePageSize(int pageSize)
    {
        return Math.Clamp(pageSize, 1, 100);
    }

    /// <summary>
    /// Trims optional text and converts empty strings to null.
    /// </summary>
    /// <param name="value">The text value.</param>
    /// <returns>The trimmed value when present; otherwise, <see langword="null"/>.</returns>
    private static string? TrimOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
