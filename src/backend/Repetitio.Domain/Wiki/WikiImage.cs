namespace Repetitio.Domain.Wiki;

/// <summary>
/// Represents a locally stored image embedded in wiki markdown.
/// </summary>
public sealed class WikiImage
{
    /// <summary>
    /// Gets or sets the image identifier used by markdown references.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Gets or sets the original sanitized file name.
    /// </summary>
    public string FileName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the image media type.
    /// </summary>
    public string ContentType { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the SHA-256 digest used to deduplicate screenshots.
    /// </summary>
    public string Sha256 { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the image size in bytes.
    /// </summary>
    public long SizeBytes { get; set; }

    /// <summary>
    /// Gets or sets the binary image contents.
    /// </summary>
    public byte[] Data { get; set; } = [];

    /// <summary>
    /// Gets or sets the date and time when the image was created.
    /// </summary>
    public DateTime CreatedAt { get; set; }
}
