namespace Repetitio.Application.Wiki;

public sealed record WikiJsonUpdateRequest(
    IReadOnlyCollection<WikiJsonPageUpdate> Updates,
    bool AllowImageRemoval = false);

public sealed record WikiJsonPageUpdate(Guid Id, DateTime ExpectedUpdatedAt, UpdateWikiPageRequest Page);
