using Microsoft.EntityFrameworkCore;
using Repetitio.Domain.Dsa;
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
    /// Gets the DSA problems table.
    /// </summary>
    public DbSet<DsaProblem> DsaProblems => Set<DsaProblem>();

    /// <summary>
    /// Gets the DSA solutions table.
    /// </summary>
    public DbSet<DsaSolution> DsaSolutions => Set<DsaSolution>();

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

        modelBuilder.Entity<DsaProblem>(entity =>
        {
            entity.HasKey(problem => problem.LearningItemId);
            entity.Property(problem => problem.Source).HasMaxLength(120);
            entity.Property(problem => problem.ExternalUrl).HasMaxLength(1000);
            entity.Property(problem => problem.ProblemStatement).HasMaxLength(8000);
            entity.Property(problem => problem.TestCases).HasMaxLength(8000);
            entity.Property(problem => problem.Assumptions).HasMaxLength(4000);
            entity.Property(problem => problem.Approach).HasMaxLength(8000);
            entity.Property(problem => problem.Notes).HasMaxLength(8000);
            entity.Property(problem => problem.WhatHelped).HasMaxLength(4000);
            entity.Property(problem => problem.WhatWasDifficult).HasMaxLength(4000);
            entity.Property(problem => problem.ImproveNext).HasMaxLength(4000);
            entity.Property(problem => problem.KnowledgeChecklist).HasMaxLength(4000);
            entity.Property(problem => problem.QuestionsToAsk).HasMaxLength(4000);
            entity.Property(problem => problem.MissedMentalSteps).HasMaxLength(4000);
            entity.Property(problem => problem.ExpectedTimeComplexity).HasMaxLength(80);
            entity.Property(problem => problem.ExpectedSpaceComplexity).HasMaxLength(80);
            entity.Property(problem => problem.CreatedAt).IsRequired();
            entity.Property(problem => problem.UpdatedAt).IsRequired();
            entity.HasOne(problem => problem.LearningItem)
                .WithOne()
                .HasForeignKey<DsaProblem>(problem => problem.LearningItemId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DsaSolution>(entity =>
        {
            entity.HasKey(solution => solution.Id);
            entity.Property(solution => solution.Language).HasMaxLength(80).IsRequired();
            entity.Property(solution => solution.SourceCode).HasMaxLength(20000).IsRequired();
            entity.Property(solution => solution.Explanation).HasMaxLength(8000);
            entity.Property(solution => solution.TimeComplexity).HasMaxLength(80);
            entity.Property(solution => solution.SpaceComplexity).HasMaxLength(80);
            entity.Property(solution => solution.CreatedAt).IsRequired();
            entity.HasIndex(solution => solution.LearningItemId);
            entity.HasOne(solution => solution.Problem)
                .WithMany(problem => problem.Solutions)
                .HasForeignKey(solution => solution.LearningItemId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
