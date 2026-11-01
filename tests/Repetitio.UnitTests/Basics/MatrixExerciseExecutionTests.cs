using Repetitio.Api.Execution;
using Repetitio.Api.Execution.Harnesses;
using Repetitio.Application.Basics;
using Repetitio.Application.Basics.Exercises;

namespace Repetitio.UnitTests.Basics;

public sealed class MatrixExerciseExecutionTests
{
    private static readonly BasicExerciseExecutionService Runner = new(
        [new ReverseLinkedListHarness(), .. BasicExerciseHarnessCatalog.GetAll()]);

    public static IEnumerable<object[]> AllExercises() =>
        BasicExerciseCatalog.GetAll().Select(exercise => new object[] { exercise.Slug });

    public static IEnumerable<object[]> MatrixSlugs() =>
        BasicExerciseCatalog.GetAll().Where(exercise => exercise.Tags.Contains("matrix"))
            .Select(exercise => new object[] { exercise.Slug });

    [Theory]
    [MemberData(nameof(AllExercises))]
    public async Task ReferenceSolutionsPassTheRealCompilerAndRunner(string slug)
    {
        var exercise = BasicExerciseCatalog.GetBySlug(slug)!;
        var result = await Runner.ExecuteAsync(exercise, new() { SourceCode = exercise.ReferenceSolution }, CancellationToken.None);

        Assert.True(result.Compiled, result.CompilerOutput);
        Assert.False(result.TimedOut, result.RuntimeOutput);
        Assert.NotEmpty(result.TestResults);
        Assert.True(result.Passed, string.Join("\n", result.TestResults.Where(test => !test.Passed)));
    }

    [Theory]
    [MemberData(nameof(MatrixSlugs))]
    public async Task UnimplementedStartersCompileButDoNotPass(string slug)
    {
        var exercise = BasicExerciseCatalog.GetBySlug(slug)!;
        await AssertRejected(exercise, exercise.StarterCode);
    }

    [Fact]
    public async Task ReadAndUpdateRequiresBothTheOriginalValueAndTheActualMutation()
    {
        var exercise = MatrixExercises.ReadAndUpdate;
        await AssertRejected(exercise, exercise.ReferenceSolution.Replace("matrix[row, col] = newValue;", ""));
        await AssertRejected(exercise, exercise.ReferenceSolution.Replace("return previousValue;", "return newValue;"));
    }

    [Fact]
    public async Task RowAndColumnTestsDetectSwappedDimensionsAndInputMutation()
    {
        var exercise = MatrixExercises.RowAndColumnSums;
        await AssertRejected(exercise, exercise.ReferenceSolution.Replace("int cols = matrix.GetLength(1);", "int cols = matrix.GetLength(0);"));
        // The sums are still correct, but the submitted solution corrupts its input.
        await AssertRejected(exercise, exercise.ReferenceSolution.Replace("return sums;", "if (matrix.Length > 0) matrix[0, 0] = -999; return sums;"));
    }

    [Fact]
    public async Task SwapTestsRejectOverwritingWithoutATemporaryValue()
    {
        var exercise = MatrixExercises.SwapRowsAndColumns;
        await AssertRejected(exercise, exercise.ReferenceSolution.Replace("int temporary = matrix[firstRow, col];", "int temporary = matrix[secondRow, col];"));
        await AssertRejected(exercise, exercise.ReferenceSolution.Replace("int temporary = matrix[row, firstCol];", "int temporary = matrix[row, secondCol];"));
    }

    [Fact]
    public async Task SearchTestsRejectWrongDirectionAndInputMutation()
    {
        var exercise = MatrixExercises.StaircaseSearch;
        await AssertRejected(exercise, exercise.ReferenceSolution.Replace("current > target", "current < target"));
        await AssertRejected(exercise, exercise.ReferenceSolution.Replace("return true;", "matrix[row, col] = -999; return true;"));
    }

    private static async Task AssertRejected(BasicExerciseResponse exercise, string source)
    {
        var result = await Runner.ExecuteAsync(exercise, new() { SourceCode = source }, CancellationToken.None);
        Assert.True(result.Compiled, result.CompilerOutput);
        Assert.False(result.TimedOut, result.RuntimeOutput);
        Assert.False(result.Passed);
        Assert.Contains(result.TestResults, test => !test.Passed);
    }
}
