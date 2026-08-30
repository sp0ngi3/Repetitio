using Microsoft.EntityFrameworkCore;
using Repetitio.Domain.LearningItems;
using Repetitio.Domain.Practice;
using Repetitio.Domain.Tags;

namespace Repetitio.Infrastructure.Persistence;

/// <summary>
/// Entity Framework database context for Repetitio persistence.
/// </summary>
public sealed class RepetitioDbContext : DbContext
{
    /// <summary>
    /// Initializes a new instance of the <see cref="RepetitioDbContext"/> class.
    /// </summary>
    /// <param name="options">The database context options.</param>
    public RepetitioDbContext(DbContextOptions<RepetitioDbContext> options)
        : base(options)
    {
    }

    /// <summary>
    /// Gets the learning items table.
    /// </summary>
    public DbSet<LearningItem> LearningItems => Set<LearningItem>();

    /// <summary>
    /// Gets the tags table.
    /// </summary>
    public DbSet<Tag> Tags => Set<Tag>();

    /// <summary>
    /// Gets the learning item tags join table.
    /// </summary>
    public DbSet<LearningItemTag> LearningItemTags => Set<LearningItemTag>();

    /// <summary>
    /// Gets the practice sessions table.
    /// </summary>
    public DbSet<PracticeSession> PracticeSessions => Set<PracticeSession>();

    /// <summary>
    /// Configures the database model.
    /// </summary>
    /// <param name="modelBuilder">The model builder.</param>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);

        modelBuilder.Entity<LearningItem>(entity =>
        {
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Title).HasMaxLength(200).IsRequired();
            entity.Property(item => item.Description).HasMaxLength(4000);
            entity.Property(item => item.Type).HasConversion<string>().HasMaxLength(32).IsRequired();
            entity.Property(item => item.Status).HasConversion<string>().HasMaxLength(32).IsRequired();
            entity.Property(item => item.Difficulty).HasConversion<string>().HasMaxLength(32).IsRequired();
            entity.Property(item => item.CreatedAt).IsRequired();
            entity.Property(item => item.UpdatedAt).IsRequired();
            entity.HasIndex(item => item.Type);
            entity.HasIndex(item => item.Status);
            entity.HasIndex(item => item.NextReviewAt);
        });

        modelBuilder.Entity<Tag>(entity =>
        {
            entity.HasKey(tag => tag.Id);
            entity.Property(tag => tag.Name).HasMaxLength(80).IsRequired();
            entity.Property(tag => tag.CreatedAt).IsRequired();
            entity.HasIndex(tag => tag.Name).IsUnique();
        });

        modelBuilder.Entity<LearningItemTag>(entity =>
        {
            entity.HasKey(itemTag => new { itemTag.LearningItemId, itemTag.TagId });
            entity.HasOne(itemTag => itemTag.LearningItem)
                .WithMany(item => item.Tags)
                .HasForeignKey(itemTag => itemTag.LearningItemId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(itemTag => itemTag.Tag)
                .WithMany(tag => tag.LearningItems)
                .HasForeignKey(itemTag => itemTag.TagId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PracticeSession>(entity =>
        {
            entity.HasKey(session => session.Id);
            entity.Property(session => session.Outcome).HasConversion<string>().HasMaxLength(32).IsRequired();
            entity.Property(session => session.Notes).HasMaxLength(4000);
            entity.Property(session => session.WhatHelped).HasMaxLength(2000);
            entity.Property(session => session.WhatWasDifficult).HasMaxLength(2000);
            entity.Property(session => session.ImproveNext).HasMaxLength(2000);
            entity.Property(session => session.StartedAt).IsRequired();
            entity.Property(session => session.CreatedAt).IsRequired();
            entity.HasIndex(session => session.LearningItemId);
            entity.HasIndex(session => session.CreatedAt);
            entity.HasOne(session => session.LearningItem)
                .WithMany(item => item.PracticeSessions)
                .HasForeignKey(session => session.LearningItemId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
