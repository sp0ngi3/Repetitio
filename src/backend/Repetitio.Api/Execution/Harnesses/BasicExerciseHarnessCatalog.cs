namespace Repetitio.Api.Execution.Harnesses;

/// <summary>
/// Provides execution harnesses for built-in Basics exercises.
/// </summary>
public static class BasicExerciseHarnessCatalog
{
    /// <summary>
    /// Gets reusable Basics execution harnesses.
    /// </summary>
    /// <returns>The Basics exercise harnesses.</returns>
    public static IReadOnlyCollection<IBasicExerciseHarness> GetAll()
    {
        return
        [
            new BasicExerciseHarness("kadane-maximum-subarray", """
        results.Add(RunInt("classic mixed input", 6, () => Solution.MaxSubArray([-2, 1, -3, 4, -1, 2, 1, -5, 4])));
        results.Add(RunInt("single value", 1, () => Solution.MaxSubArray([1])));
        results.Add(RunInt("all positive values", 23, () => Solution.MaxSubArray([5, 4, -1, 7, 8])));
        results.Add(RunInt("all negative values", -2, () => Solution.MaxSubArray([-5, -2, -8])));
        results.Add(RunInt("all zeroes", 0, () => Solution.MaxSubArray([0, 0, 0])));
        results.Add(RunInt("whole array is best", 9, () => Solution.MaxSubArray([5, -1, 5])));
        results.Add(RunInt("middle range wins", 8, () => Solution.MaxSubArray([-1, 5, -2, 5, -10])));
        results.Add(RunInt("earliest best remains best", 9, () => Solution.MaxSubArray([9, -10, 8])));
        results.Add(RunException<ArgumentNullException>("null input throws", () => Solution.MaxSubArray(null!)));
        results.Add(RunException<ArgumentException>("empty input throws", () => Solution.MaxSubArray([])));
"""),
            new BasicExerciseHarness("kadane-max-subarray-range", """
        results.Add(RunArray("classic mixed input", [3, 6], () => Solution.FindMaxSubarrayRange(new CustomDynamicArray<int>([-2, 1, -3, 4, -1, 2, 1, -5, 4]))));
        results.Add(RunArray("all positive values", [0, 2], () => Solution.FindMaxSubarrayRange(new CustomDynamicArray<int>([1, 2, 3]))));
        results.Add(RunArray("all negative values", [1, 1], () => Solution.FindMaxSubarrayRange(new CustomDynamicArray<int>([-5, -2, -8]))));
        results.Add(RunArray("single value", [0, 0], () => Solution.FindMaxSubarrayRange(new CustomDynamicArray<int>([7]))));
        results.Add(RunArray("all zeroes earliest range", [0, 0], () => Solution.FindMaxSubarrayRange(new CustomDynamicArray<int>([0, 0, 0]))));
        results.Add(RunArray("whole array is best", [0, 2], () => Solution.FindMaxSubarrayRange(new CustomDynamicArray<int>([5, -1, 5]))));
        results.Add(RunArray("middle range wins", [1, 3], () => Solution.FindMaxSubarrayRange(new CustomDynamicArray<int>([-1, 5, -2, 5, -10]))));
        results.Add(RunArray("first element wins", [0, 0], () => Solution.FindMaxSubarrayRange(new CustomDynamicArray<int>([9, -10, 8]))));
        results.Add(RunException<ArgumentNullException>("null input throws", () => Solution.FindMaxSubarrayRange(null!)));
        results.Add(RunException<ArgumentException>("empty input throws", () => Solution.FindMaxSubarrayRange(new CustomDynamicArray<int>([]))));
"""),
            new BasicExerciseHarness("two-pointers-two-sum-sorted", """
        results.Add(RunArray("middle plus end", [1, 4], () => Solution.TwoSumSorted([1, 2, 4, 6, 8], 10)));
        results.Add(RunArray("no pair", [-1, -1], () => Solution.TwoSumSorted([1, 3, 5], 20)));
        results.Add(RunArray("negative plus positive", [0, 3], () => Solution.TwoSumSorted([-5, -2, 0, 7], 2)));
        results.Add(RunArray("duplicates", [0, 1], () => Solution.TwoSumSorted([2, 2, 3], 4)));
        results.Add(RunArray("empty", [-1, -1], () => Solution.TwoSumSorted([], 1)));
        results.Add(RunArray("single", [-1, -1], () => Solution.TwoSumSorted([5], 5)));
        results.Add(RunArray("duplicate at right side", [1, 2], () => Solution.TwoSumSorted([1, 4, 4], 8)));
        results.Add(RunArray("outer values", [0, 3], () => Solution.TwoSumSorted([-3, -1, 2, 4], 1)));
        results.Add(RunArray("zero target missing", [-1, -1], () => Solution.TwoSumSorted([0, 1, 2, 3], 0)));
        results.Add(RunArray("negative target", [0, 1], () => Solution.TwoSumSorted([-10, -4, -1], -14)));
"""),
            new BasicExerciseHarness("prefix-sum-range-query", """
        results.Add(RunInt("middle range", 7, () => Solution.RangeSum([2, -1, 3, 5], 1, 3)));
        results.Add(RunInt("single element array", 10, () => Solution.RangeSum([10], 0, 0)));
        results.Add(RunInt("all negative", -9, () => Solution.RangeSum([-2, -3, -4], 0, 2)));
        results.Add(RunInt("whole range", 10, () => Solution.RangeSum([1, 2, 3, 4], 0, 3)));
        results.Add(RunInt("one element range", 3, () => Solution.RangeSum([1, 2, 3, 4], 2, 2)));
        results.Add(RunInt("zero range", 0, () => Solution.RangeSum([5, 0, 0, 5], 1, 2)));
        results.Add(RunInt("prefix ending before last", 50, () => Solution.RangeSum([100, -50, 25], 0, 1)));
        results.Add(RunInt("tail range", 6, () => Solution.RangeSum([3, 3, 3], 1, 2)));
        results.Add(RunInt("balanced whole range", 0, () => Solution.RangeSum([-1, 1, -1, 1], 0, 3)));
        results.Add(RunInt("negative suffix", -1, () => Solution.RangeSum([8, 2, -5, 4], 2, 3)));
"""),
            new BasicExerciseHarness("prefix-sum-pivot-index", """
        results.Add(RunInt("classic pivot", 3, () => Solution.PivotIndex([1, 7, 3, 6, 5, 6])));
        results.Add(RunInt("missing pivot", -1, () => Solution.PivotIndex([1, 2, 3])));
        results.Add(RunInt("pivot at zero", 0, () => Solution.PivotIndex([2, 1, -1])));
        results.Add(RunInt("all zeroes earliest", 0, () => Solution.PivotIndex([0, 0, 0])));
        results.Add(RunInt("empty array", -1, () => Solution.PivotIndex([])));
        results.Add(RunInt("single value", 0, () => Solution.PivotIndex([5])));
        results.Add(RunInt("negative values", 0, () => Solution.PivotIndex([-1, -1, -1, 0, 1, 1])));
        results.Add(RunInt("pivot at end", 2, () => Solution.PivotIndex([1, -1, 0])));
        results.Add(RunInt("large middle pivot", 4, () => Solution.PivotIndex([3, 4, 8, -9, 20, 6])));
        results.Add(RunInt("another zero pivot", 0, () => Solution.PivotIndex([10, -10, 10])));
"""),
            new BasicExerciseHarness("sliding-window-max-average", """
        results.Add(RunDouble("classic fixed window", 12.75, () => Solution.FindMaxAverage([1, 12, -5, -6, 50, 3], 4)));
        results.Add(RunDouble("single element", 5, () => Solution.FindMaxAverage([5], 1)));
        results.Add(RunDouble("zeroes", 0, () => Solution.FindMaxAverage([0, 0, 0], 2)));
        results.Add(RunDouble("negative average", -6.5, () => Solution.FindMaxAverage([-1, -12, -5], 2)));
        results.Add(RunDouble("best first window", 3, () => Solution.FindMaxAverage([4, 2, 1, 3, 3], 2)));
        results.Add(RunDouble("whole array", 6, () => Solution.FindMaxAverage([9, 7, 3, 5], 4)));
        results.Add(RunDouble("k one", 100, () => Solution.FindMaxAverage([100, -100, 100], 1)));
        results.Add(RunDouble("flat values", 2, () => Solution.FindMaxAverage([2, 2, 2, 2], 3)));
        results.Add(RunDouble("repeated highs", 2.5, () => Solution.FindMaxAverage([-5, 10, -5, 10], 2)));
        results.Add(RunDouble("all values window", 3, () => Solution.FindMaxAverage([1, 2, 3, 4, 5], 5)));
"""),
            new BasicExerciseHarness("sliding-window-min-size-subarray-sum", """
        results.Add(RunInt("classic variable window", 2, () => Solution.MinSubArrayLen(7, [2, 3, 1, 2, 4, 3])));
        results.Add(RunInt("single value enough", 1, () => Solution.MinSubArrayLen(4, [1, 4, 4])));
        results.Add(RunInt("no solution", 0, () => Solution.MinSubArrayLen(11, [1, 1, 1, 1])));
        results.Add(RunInt("whole array only", 5, () => Solution.MinSubArrayLen(15, [1, 2, 3, 4, 5])));
        results.Add(RunInt("single exact", 1, () => Solution.MinSubArrayLen(5, [5])));
        results.Add(RunInt("single too small", 0, () => Solution.MinSubArrayLen(6, [5])));
        results.Add(RunInt("all ones exact", 3, () => Solution.MinSubArrayLen(3, [1, 1, 1])));
        results.Add(RunInt("three-length best", 3, () => Solution.MinSubArrayLen(8, [2, 3, 1, 2, 4, 3])));
        results.Add(RunInt("two values exact", 2, () => Solution.MinSubArrayLen(100, [50, 50])));
        results.Add(RunInt("tail pair", 2, () => Solution.MinSubArrayLen(9, [1, 2, 3, 4, 5])));
"""),
            new BasicExerciseHarness("linked-list-operations", """
        results.Add(RunList("insert head into empty", [1], () => Solution.InsertAtHead(BuildList([]), 1)));
        results.Add(RunList("insert head into existing", [1, 2, 3], () => Solution.InsertAtHead(BuildList([2, 3]), 1)));
        results.Add(RunList("insert end into empty", [1], () => Solution.InsertAtEnd(BuildList([]), 1)));
        results.Add(RunList("insert end into existing", [1, 2, 3], () => Solution.InsertAtEnd(BuildList([1, 2]), 3)));
        results.Add(RunList("insert in middle", [1, 2, 3], () => Solution.InsertAtIndex(BuildList([1, 3]), 1, 2)));
        results.Add(RunList("insert at zero", [1, 2, 3], () => Solution.InsertAtIndex(BuildList([2, 3]), 0, 1)));
        results.Add(RunList("insert at length", [1, 2, 3], () => Solution.InsertAtIndex(BuildList([1, 2]), 2, 3)));
        results.Add(RunList("invalid insert unchanged", [1, 2], () => Solution.InsertAtIndex(BuildList([1, 2]), 5, 9)));
        results.Add(RunNullableInt("get existing index", 6, () => Solution.GetByIndex(BuildList([4, 5, 6]), 2)));
        results.Add(RunNullableInt("get missing index", null, () => Solution.GetByIndex(BuildList([4, 5, 6]), 3)));
""", includeLinkedListHelpers: true),
            new BasicExerciseHarness("fast-slow-find-duplicate-number", """
        results.Add(RunInt("classic duplicate two", 2, () => Solution.FindDuplicate([1, 3, 4, 2, 2])));
        results.Add(RunInt("classic duplicate three", 3, () => Solution.FindDuplicate([3, 1, 3, 4, 2])));
        results.Add(RunInt("minimum length", 1, () => Solution.FindDuplicate([1, 1])));
        results.Add(RunInt("duplicate at front", 1, () => Solution.FindDuplicate([1, 1, 2])));
        results.Add(RunInt("many repeats", 2, () => Solution.FindDuplicate([2, 2, 2, 2, 2])));
        results.Add(RunInt("long cycle", 9, () => Solution.FindDuplicate([2, 5, 9, 6, 9, 3, 8, 9, 7, 1])));
        results.Add(RunInt("duplicate four", 4, () => Solution.FindDuplicate([4, 3, 1, 4, 2])));
        results.Add(RunInt("duplicate six", 6, () => Solution.FindDuplicate([1, 4, 6, 2, 6, 3, 5])));
        results.Add(RunInt("duplicate at end value", 5, () => Solution.FindDuplicate([5, 4, 3, 2, 1, 5])));
        results.Add(RunInt("small duplicate two", 2, () => Solution.FindDuplicate([2, 1, 2])));
"""),
            new BasicExerciseHarness("recursion-factorial", """
        results.Add(RunInt("zero", 1, () => Solution.FactorialOfNumber(0)));
        results.Add(RunInt("one", 1, () => Solution.FactorialOfNumber(1)));
        results.Add(RunInt("two", 2, () => Solution.FactorialOfNumber(2)));
        results.Add(RunInt("three", 6, () => Solution.FactorialOfNumber(3)));
        results.Add(RunInt("four", 24, () => Solution.FactorialOfNumber(4)));
        results.Add(RunInt("five", 120, () => Solution.FactorialOfNumber(5)));
        results.Add(RunInt("six", 720, () => Solution.FactorialOfNumber(6)));
        results.Add(RunInt("seven", 5040, () => Solution.FactorialOfNumber(7)));
        results.Add(RunInt("ten", 3628800, () => Solution.FactorialOfNumber(10)));
        results.Add(RunInt("twelve", 479001600, () => Solution.FactorialOfNumber(12)));
"""),
            new BasicExerciseHarness("recursion-fibonacci", """
        results.Add(RunInt("zero", 0, () => Solution.FibonacciSeries(0)));
        results.Add(RunInt("one", 1, () => Solution.FibonacciSeries(1)));
        results.Add(RunInt("two", 1, () => Solution.FibonacciSeries(2)));
        results.Add(RunInt("three", 2, () => Solution.FibonacciSeries(3)));
        results.Add(RunInt("four", 3, () => Solution.FibonacciSeries(4)));
        results.Add(RunInt("five", 5, () => Solution.FibonacciSeries(5)));
        results.Add(RunInt("six", 8, () => Solution.FibonacciSeries(6)));
        results.Add(RunInt("seven", 13, () => Solution.FibonacciSeries(7)));
        results.Add(RunInt("ten", 55, () => Solution.FibonacciSeries(10)));
        results.Add(RunInt("twenty", 6765, () => Solution.FibonacciSeries(20)));
"""),
            new BasicExerciseHarness("sorting-algorithms", """
        results.Add(RunArray("insertion unsorted", [1, 2, 3, 5], () => Solution.InsertionSort([5, 2, 3, 1])));
        results.Add(RunArray("insertion empty", [], () => Solution.InsertionSort([])));
        results.Add(RunArray("insertion single", [1], () => Solution.InsertionSort([1])));
        results.Add(RunArray("merge duplicates negatives", [-1, 2, 2, 10], () => Solution.MergeSort([10, -1, 2, 2])));
        results.Add(RunArray("merge descending", [1, 2, 3], () => Solution.MergeSort([3, 2, 1])));
        results.Add(RunArray("quick descending odd", [3, 5, 7, 9], () => Solution.QuickSort([9, 7, 5, 3])));
        results.Add(RunArray("quick all equal", [1, 1, 1], () => Solution.QuickSort([1, 1, 1])));
        results.Add(RunArray("bucket positive", [0, 1, 2, 5, 5], () => Solution.BucketSort([5, 0, 2, 5, 1])));
        results.Add(RunArray("bucket negatives", [-3, -3, 0, 2], () => Solution.BucketSort([-3, 0, 2, -3])));
        results.Add(RunArray("quick does not mutate input", [3, 1, 2], () => { var input = new[] { 3, 1, 2 }; _ = Solution.QuickSort(input); return input; }));
"""),
            new BasicExerciseHarness("binary-search-sorted-array", """
        results.Add(RunInt("found middle", 3, () => Solution.Search([-1, 0, 2, 4, 6, 8], 4)));
        results.Add(RunInt("missing middle", -1, () => Solution.Search([-1, 0, 2, 4, 6, 8], 3)));
        results.Add(RunInt("single found", 0, () => Solution.Search([1], 1)));
        results.Add(RunInt("single missing", -1, () => Solution.Search([1], 2)));
        results.Add(RunInt("two first", 0, () => Solution.Search([1, 2], 1)));
        results.Add(RunInt("two second", 1, () => Solution.Search([1, 2], 2)));
        results.Add(RunInt("first value", 0, () => Solution.Search([-10, -3, 0, 5, 9], -10)));
        results.Add(RunInt("last value", 4, () => Solution.Search([-10, -3, 0, 5, 9], 9)));
        results.Add(RunInt("between values missing", -1, () => Solution.Search([2, 5, 7, 11, 15], 6)));
        results.Add(RunInt("right half found", 3, () => Solution.Search([2, 5, 7, 11, 15], 11)));
"""),
            new BasicExerciseHarness("binary-search-first-passing-version", """
        results.Add(RunInt("middle answer", 6, () => { RepetitioVersionApi.FirstPassing = 6; return Solution.FirstPassingVersion(10); }));
        results.Add(RunInt("one version", 1, () => { RepetitioVersionApi.FirstPassing = 1; return Solution.FirstPassingVersion(1); }));
        results.Add(RunInt("first of two", 1, () => { RepetitioVersionApi.FirstPassing = 1; return Solution.FirstPassingVersion(2); }));
        results.Add(RunInt("second of two", 2, () => { RepetitioVersionApi.FirstPassing = 2; return Solution.FirstPassingVersion(2); }));
        results.Add(RunInt("halfway", 50, () => { RepetitioVersionApi.FirstPassing = 50; return Solution.FirstPassingVersion(100); }));
        results.Add(RunInt("last version", 100, () => { RepetitioVersionApi.FirstPassing = 100; return Solution.FirstPassingVersion(100); }));
        results.Add(RunInt("uneven range", 321, () => { RepetitioVersionApi.FirstPassing = 321; return Solution.FirstPassingVersion(999); }));
        results.Add(RunInt("large range", 999999, () => { RepetitioVersionApi.FirstPassing = 999999; return Solution.FirstPassingVersion(1000000); }));
        results.Add(RunInt("small inside range", 7, () => { RepetitioVersionApi.FirstPassing = 7; return Solution.FirstPassingVersion(77); }));
        results.Add(RunInt("even range", 250, () => { RepetitioVersionApi.FirstPassing = 250; return Solution.FirstPassingVersion(500); }));
""", """
public static class RepetitioVersionApi
{
    public static int FirstPassing { get; set; }

    public static bool IsPassing(int version)
    {
        return version >= FirstPassing;
    }
}
""")
        ];
    }
}
