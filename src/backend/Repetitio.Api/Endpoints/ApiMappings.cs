using Repetitio.Application.Dashboard;
using Repetitio.Application.LearningItems;
using Repetitio.Application.Practice;
using Repetitio.Application.Tags;
using Repetitio.Domain.LearningItems;
using Repetitio.Domain.Practice;
using Repetitio.Domain.Tags;

namespace Repetitio.Api.Endpoints;

/// <summary>
/// Maps domain entities into API response contracts.
/// </summary>
internal static class ApiMappings
{
    /// <summary>
    /// Converts a learning item into a response contract.
    /// </summary>
    /// <param name="item">The learning item.</param>
    /// <returns>The learning item response.</returns>
    public static LearningItemResponse ToResponse(LearningItem item)
    {
        ArgumentNullException.ThrowIfNull(item);

        return new LearningItemResponse
        {
            Id = item.Id,
            Type = item.Type,
            Title = item.Title,
            Description = item.Description,
            Status = item.Status,
            Difficulty = item.Difficulty,
            Confidence = item.Confidence,
            CreatedAt = item.CreatedAt,
            UpdatedAt = item.UpdatedAt,
            LastPracticedAt = item.LastPracticedAt,
            NextReviewAt = item.NextReviewAt,
            Tags = item.Tags.Select(itemTag => itemTag.Tag.Name).Order(StringComparer.Ordinal).ToArray(),
            TotalAttempts = item.PracticeSessions.Count
        };
    }

    /// <summary>
    /// Converts a tag into a response contract.
    /// </summary>
    /// <param name="tag">The tag.</param>
    /// <returns>The tag response.</returns>
    public static TagResponse ToResponse(Tag tag)
    {
        ArgumentNullException.ThrowIfNull(tag);

        return new TagResponse
        {
            Id = tag.Id,
            Name = tag.Name,
            CreatedAt = tag.CreatedAt
        };
    }

    /// <summary>
    /// Converts a practice session into a response contract.
    /// </summary>
    /// <param name="session">The practice session.</param>
    /// <returns>The practice session response.</returns>
    public static PracticeSessionResponse ToResponse(PracticeSession session)
    {
        ArgumentNullException.ThrowIfNull(session);

        return new PracticeSessionResponse
        {
            Id = session.Id,
            LearningItemId = session.LearningItemId,
            LearningItemTitle = session.LearningItem.Title,
            StartedAt = session.StartedAt,
            CompletedAt = session.CompletedAt,
            DurationMs = session.DurationMs,
            Outcome = session.Outcome,
            Confidence = session.Confidence,
            Notes = session.Notes,
            WhatHelped = session.WhatHelped,
            WhatWasDifficult = session.WhatWasDifficult,
            ImproveNext = session.ImproveNext,
            CreatedAt = session.CreatedAt
        };
    }

    /// <summary>
    /// Converts a learning item into a due review response contract.
    /// </summary>
    /// <param name="item">The learning item.</param>
    /// <returns>The due review response.</returns>
    public static DueReviewItemResponse ToDueReviewResponse(LearningItem item)
    {
        ArgumentNullException.ThrowIfNull(item);

        return new DueReviewItemResponse
        {
            Id = item.Id,
            Title = item.Title,
            Type = item.Type,
            LastPracticedAt = item.LastPracticedAt,
            NextReviewAt = item.NextReviewAt,
            Confidence = item.Confidence
        };
    }
}
