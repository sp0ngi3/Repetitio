namespace Repetitio.Api.Execution;

/// <summary>
/// Provides constants shared by Basics execution harnesses and the execution parser.
/// </summary>
public static class BasicExerciseExecutionMarkers
{
    /// <summary>
    /// Marker used to locate serialized harness results in process output.
    /// </summary>
    public const string ResultsMarker = "REPETITIO_TEST_RESULTS:";
}
