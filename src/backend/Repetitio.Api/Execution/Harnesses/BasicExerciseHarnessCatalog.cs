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
            new BasicExerciseHarness("linked-list-insert", """
        results.Add(RunList("insert head into empty", [1], () => Solution.InsertAtHead(BuildList([]), 1)));
        results.Add(RunList("insert head into existing", [1, 2, 3], () => Solution.InsertAtHead(BuildList([2, 3]), 1)));
        results.Add(RunList("insert end into empty", [1], () => Solution.InsertAtEnd(BuildList([]), 1)));
        results.Add(RunList("insert end into existing", [1, 2, 3], () => Solution.InsertAtEnd(BuildList([1, 2]), 3)));
        results.Add(RunList("insert in middle", [1, 2, 3], () => Solution.InsertAtIndex(BuildList([1, 3]), 1, 2)));
        results.Add(RunList("insert at zero", [1, 2, 3], () => Solution.InsertAtIndex(BuildList([2, 3]), 0, 1)));
        results.Add(RunList("insert at length", [1, 2, 3], () => Solution.InsertAtIndex(BuildList([1, 2]), 2, 3)));
        results.Add(RunList("invalid insert unchanged", [1, 2], () => Solution.InsertAtIndex(BuildList([1, 2]), 5, 9)));
        results.Add(RunList("negative index unchanged", [1, 2], () => Solution.InsertAtIndex(BuildList([1, 2]), -1, 9)));
""", includeLinkedListHelpers: true),
            new BasicExerciseHarness("linked-list-get", """
        results.Add(RunNullableInt("get first value", 4, () => Solution.GetByIndex(BuildList([4, 5, 6]), 0)));
        results.Add(RunNullableInt("get existing index", 6, () => Solution.GetByIndex(BuildList([4, 5, 6]), 2)));
        results.Add(RunNullableInt("get missing index", null, () => Solution.GetByIndex(BuildList([4, 5, 6]), 3)));
        results.Add(RunNullableInt("get from empty", null, () => Solution.GetByIndex(BuildList([]), 0)));
        results.Add(RunNullableInt("negative index", null, () => Solution.GetByIndex(BuildList([7]), -1)));
        results.Add(RunNullableInt("negative node value", -2, () => Solution.GetByIndex(BuildList([0, -2, 5]), 1)));
""", includeLinkedListHelpers: true),
            new BasicExerciseHarness("fast-slow-detect-linked-list-cycle", """
        results.Add(RunBool("empty list", false, () => Solution.HasCycle(null)));
        results.Add(RunBool("single node without cycle", false, () => Solution.HasCycle(BuildCyclicList([1], -1))));
        results.Add(RunBool("single node self cycle", true, () => Solution.HasCycle(BuildCyclicList([1], 0))));
        results.Add(RunBool("two nodes without cycle", false, () => Solution.HasCycle(BuildCyclicList([1, 2], -1))));
        results.Add(RunBool("cycle starts at head", true, () => Solution.HasCycle(BuildCyclicList([1, 2], 0))));
        results.Add(RunBool("cycle starts in middle", true, () => Solution.HasCycle(BuildCyclicList([1, 2, 3, 4], 2))));
        results.Add(RunBool("duplicate values in cyclic list", true, () => Solution.HasCycle(BuildCyclicList([3, -2, -2, 4], 1))));
        results.Add(RunBool("long acyclic list", false, () => Solution.HasCycle(BuildCyclicList([1, 2, 3, 4], -1))));
""", includeLinkedListHelpers: true),
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
            new BasicExerciseHarness("insertion-sort", """
        results.Add(RunArray("unsorted", [1, 2, 3, 5], () => Solution.Sort([5, 2, 3, 1])));
        results.Add(RunArray("empty", [], () => Solution.Sort([])));
        results.Add(RunArray("single", [1], () => Solution.Sort([1])));
        results.Add(RunArray("duplicates", [1, 2, 4, 4], () => Solution.Sort([4, 1, 4, 2])));
        results.Add(RunArray("negative values", [-3, -2, 0, 5], () => Solution.Sort([-3, 0, -2, 5])));
        results.Add(RunArray("all equal", [2, 2, 2], () => Solution.Sort([2, 2, 2])));
        results.Add(RunArray("does not mutate input", [3, 1, 2], () => { var input = new[] { 3, 1, 2 }; _ = Solution.Sort(input); return input; }));
"""),
            new BasicExerciseHarness("merge-sort", """
        results.Add(RunArray("duplicates negatives", [-1, 2, 2, 10], () => Solution.Sort([10, -1, 2, 2])));
        results.Add(RunArray("descending", [1, 2, 3], () => Solution.Sort([3, 2, 1])));
        results.Add(RunArray("empty", [], () => Solution.Sort([])));
        results.Add(RunArray("single", [7], () => Solution.Sort([7])));
        results.Add(RunArray("mixed zeroes", [-5, 0, 0, 3], () => Solution.Sort([0, -5, 0, 3])));
        results.Add(RunArray("does not mutate input", [3, 1, 2], () => { var input = new[] { 3, 1, 2 }; _ = Solution.Sort(input); return input; }));
"""),
            new BasicExerciseHarness("quick-sort", """
        results.Add(RunArray("descending", [3, 5, 7, 9], () => Solution.Sort([9, 7, 5, 3])));
        results.Add(RunArray("all equal", [1, 1, 1], () => Solution.Sort([1, 1, 1])));
        results.Add(RunArray("empty", [], () => Solution.Sort([])));
        results.Add(RunArray("negative values", [-2, -2, 0, 4], () => Solution.Sort([-2, 4, 0, -2])));
        results.Add(RunArray("mixed values", [1, 2, 5, 6, 9], () => Solution.Sort([6, 2, 9, 1, 5])));
        results.Add(RunArray("does not mutate input", [3, 1, 2], () => { var input = new[] { 3, 1, 2 }; _ = Solution.Sort(input); return input; }));
"""),
            new BasicExerciseHarness("bucket-sort", """
        results.Add(RunArray("positive values", [0, 1, 2, 5, 5], () => Solution.Sort([5, 0, 2, 5, 1])));
        results.Add(RunArray("negative values", [-3, -3, 0, 2], () => Solution.Sort([-3, 0, 2, -3])));
        results.Add(RunArray("empty", [], () => Solution.Sort([])));
        results.Add(RunArray("single", [4], () => Solution.Sort([4])));
        results.Add(RunArray("full range", [-1000, 0, 1000], () => Solution.Sort([0, 1000, -1000])));
        results.Add(RunArray("duplicates", [1, 1, 2, 2], () => Solution.Sort([2, 1, 2, 1])));
        results.Add(RunArray("does not mutate input", [3, 1, 2], () => { var input = new[] { 3, 1, 2 }; _ = Solution.Sort(input); return input; }));
"""),
            new BasicExerciseHarness("radix-sort", """
        results.Add(RunArray("positive values", [2, 24, 45, 66, 75, 90, 170, 802], () => Solution.Sort([170, 45, 75, 90, 802, 24, 2, 66])));
        results.Add(RunArray("negative and positive values", [-12, -3, 0, 5, 5], () => Solution.Sort([-12, 5, -3, 0, 5])));
        results.Add(RunArray("empty", [], () => Solution.Sort([])));
        results.Add(RunArray("single", [7], () => Solution.Sort([7])));
        results.Add(RunArray("integer boundaries", [int.MinValue, 0, int.MaxValue], () => Solution.Sort([int.MaxValue, int.MinValue, 0])));
        results.Add(RunArray("duplicates", [1, 2, 10, 10], () => Solution.Sort([10, 1, 10, 2])));
        results.Add(RunArray("does not mutate input", [3, 1, 2], () => { var input = new[] { 3, 1, 2 }; _ = Solution.Sort(input); return input; }));
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
""")
        ];
    }
}
