using Repetitio.Application.Basics.Exercises;

namespace Repetitio.Api.Execution.Harnesses;

/// <summary>Tests rectangular-array results and mutations using the shared C# runner.</summary>
internal static class MatrixExerciseHarnesses
{
    public static IReadOnlyCollection<IBasicExerciseHarness> GetAll() =>
    [
        new BasicExerciseHarness(MatrixExercises.ReadAndUpdate.Slug, """
        void CheckUpdate(string name, int[,] matrix, int row, int col, int value, int previous, int[,] expected)
        {
            // One call must satisfy both the return-value and mutation contracts.
            int actualPrevious = 0;
            results.Add(RunMatrix(name + " / changed cells", expected, () => {
                actualPrevious = Solution.ReadAndUpdate(matrix, row, col, value);
                return matrix;
            }));
            results.Add(RunInt(name + " / previous value", previous, () => actualPrevious));
        }

        CheckUpdate("wide last cell", new int[,] { { 1, 2, 3 }, { 4, 5, 6 } }, 1, 2, 99, 6, new int[,] { { 1, 2, 3 }, { 4, 5, 99 } });
        CheckUpdate("row and column differ", new int[,] { { 1, 2, 3 }, { 4, 5, 6 } }, 0, 1, -7, 2, new int[,] { { 1, -7, 3 }, { 4, 5, 6 } });
        CheckUpdate("tall matrix", new int[,] { { 1, 2 }, { 3, 4 }, { 5, 6 } }, 2, 0, 0, 5, new int[,] { { 1, 2 }, { 3, 4 }, { 0, 6 } });
        CheckUpdate("single negative", new int[,] { { -5 } }, 0, 0, 7, -5, new int[,] { { 7 } });
        CheckUpdate("one row", new int[,] { { 3, -2, 8 } }, 0, 1, 4, -2, new int[,] { { 3, 4, 8 } });
        CheckUpdate("one column", new int[,] { { 3 }, { -2 }, { 8 } }, 1, 0, 4, -2, new int[,] { { 3 }, { 4 }, { 8 } });
        CheckUpdate("same value", new int[,] { { 0, 2 } }, 0, 1, 2, 2, new int[,] { { 0, 2 } });
        var repeated = new int[,] { { 1, 2 } };
        CheckUpdate("first update", repeated, 0, 0, 9, 1, new int[,] { { 9, 2 } });
        CheckUpdate("second update", repeated, 0, 0, -9, 9, new int[,] { { -9, 2 } });
"""),
        new BasicExerciseHarness(MatrixExercises.RowAndColumnSums.Slug, """
        void CheckSums(string name, int[,] original, int[] rowSums, int[] columnSums)
        {
            var rowsInput = (int[,])original.Clone();
            results.Add(RunArray(name + " / row sums", rowSums, () => Solution.SumRows(rowsInput)));
            results.Add(RunMatrix(name + " / rows preserve input", original, () => rowsInput));
            var columnsInput = (int[,])original.Clone();
            results.Add(RunArray(name + " / column sums", columnSums, () => Solution.SumColumns(columnsInput)));
            results.Add(RunMatrix(name + " / columns preserve input", original, () => columnsInput));
        }

        CheckSums("wide", new int[,] { { 1, 2, 3 }, { 4, 5, 6 } }, [6, 15], [5, 7, 9]);
        CheckSums("tall mixed", new int[,] { { 2, -2 }, { -5, 1 }, { 0, 4 } }, [0, -4, 4], [-3, 3]);
        CheckSums("one row", new int[,] { { 3, -2, 8 } }, [9], [3, -2, 8]);
        CheckSums("one column", new int[,] { { 3 }, { -2 }, { 8 } }, [3, -2, 8], [9]);
        CheckSums("single", new int[,] { { -7 } }, [-7], [-7]);
        CheckSums("all zero", new int[2, 3], [0, 0], [0, 0, 0]);
        CheckSums("empty", new int[0, 0], [], []);
        CheckSums("zero rows", new int[0, 3], [], [0, 0, 0]);
        CheckSums("zero columns", new int[3, 0], [0, 0, 0], []);
        CheckSums("maximum values", new int[,] { { 10000, 10000 }, { -10000, 10000 } }, [20000, 0], [0, 20000]);
"""),
        new BasicExerciseHarness(MatrixExercises.SwapRowsAndColumns.Slug, """
        void CheckSwap(string name, int[,] matrix, int[,] expected, Action<int[,]> swap)
        {
            results.Add(RunMatrix(name, expected, () => { swap(matrix); return matrix; }));
        }

        CheckSwap("swap rows in wide matrix", new int[,] { { 1, 2, 3 }, { 4, 5, 6 } }, new int[,] { { 4, 5, 6 }, { 1, 2, 3 } }, m => Solution.SwapRows(m, 0, 1));
        CheckSwap("swap columns in wide matrix", new int[,] { { 1, 2, 3 }, { 4, 5, 6 } }, new int[,] { { 3, 2, 1 }, { 6, 5, 4 } }, m => Solution.SwapColumns(m, 0, 2));
        CheckSwap("middle row reversed indexes", new int[,] { { 1, 2 }, { 3, 4 }, { 5, 6 }, { 7, 8 } }, new int[,] { { 1, 2 }, { 7, 8 }, { 5, 6 }, { 3, 4 } }, m => Solution.SwapRows(m, 3, 1));
        CheckSwap("middle column reversed indexes", new int[,] { { 1, 2, 3, 4 }, { 5, 6, 7, 8 } }, new int[,] { { 1, 4, 3, 2 }, { 5, 8, 7, 6 } }, m => Solution.SwapColumns(m, 3, 1));
        CheckSwap("tall column swap", new int[,] { { 1, 2 }, { -3, 4 }, { 5, 0 } }, new int[,] { { 2, 1 }, { 4, -3 }, { 0, 5 } }, m => Solution.SwapColumns(m, 0, 1));
        CheckSwap("same row", new int[,] { { 1, 2, 3 }, { 4, 5, 6 } }, new int[,] { { 1, 2, 3 }, { 4, 5, 6 } }, m => Solution.SwapRows(m, 1, 1));
        CheckSwap("same column", new int[,] { { 1, 2 }, { 3, 4 } }, new int[,] { { 1, 2 }, { 3, 4 } }, m => Solution.SwapColumns(m, 0, 0));
        CheckSwap("one row", new int[,] { { -1, 0, 3 } }, new int[,] { { 3, 0, -1 } }, m => Solution.SwapColumns(m, 0, 2));
        CheckSwap("one column", new int[,] { { -1 }, { 0 }, { 3 } }, new int[,] { { 3 }, { 0 }, { -1 } }, m => Solution.SwapRows(m, 0, 2));
        CheckSwap("single row identity", new int[,] { { 7 } }, new int[,] { { 7 } }, m => Solution.SwapRows(m, 0, 0));
        CheckSwap("single column identity", new int[,] { { 7 } }, new int[,] { { 7 } }, m => Solution.SwapColumns(m, 0, 0));
        CheckSwap("rows without columns", new int[3, 0], new int[3, 0], m => Solution.SwapRows(m, 0, 2));
        CheckSwap("columns without rows", new int[0, 3], new int[0, 3], m => Solution.SwapColumns(m, 0, 2));
        var composed = new int[,] { { 1, 2, 3 }, { 4, 5, 6 } };
        CheckSwap("compose row then column swaps", composed, new int[,] { { 6, 5, 4 }, { 3, 2, 1 } }, m => { Solution.SwapRows(m, 0, 1); Solution.SwapColumns(m, 0, 2); });
"""),
        new BasicExerciseHarness(MatrixExercises.StaircaseSearch.Slug, """
        void CheckSearch(string name, int[,] original, int target, bool expected)
        {
            var matrix = (int[,])original.Clone();
            results.Add(RunBool(name, expected, () => Solution.StaircaseSearch(matrix, target)));
            results.Add(RunMatrix(name + " / preserves input", original, () => matrix));
        }

        var square = new int[,] { { 1, 4, 7 }, { 2, 5, 8 }, { 3, 6, 9 } };
        CheckSearch("example found", square, 6, true);
        CheckSearch("greater than maximum", square, 10, false);
        CheckSearch("less than minimum", square, 0, false);
        foreach (var target in new[] { 1, 7, 3, 9 }) CheckSearch("corner " + target, square, target, true);
        var wide = new int[,] { { 1, 4, 7, 11 }, { 2, 5, 8, 12 } };
        CheckSearch("wide interior", wide, 5, true);
        CheckSearch("wide missing between values", wide, 6, false);
        CheckSearch("tall bottom", new int[,] { { 1, 5 }, { 2, 6 }, { 3, 7 }, { 4, 8 } }, 4, true);
        CheckSearch("negative duplicates", new int[,] { { -5, -2, -2 }, { -3, -2, 0 } }, -2, true);
        CheckSearch("negative missing", new int[,] { { -5, -2, -2 }, { -3, -2, 0 } }, -4, false);
        CheckSearch("one row found", new int[,] { { 1, 3, 5 } }, 3, true);
        CheckSearch("one row missing", new int[,] { { 1, 3, 5 } }, 4, false);
        CheckSearch("one column found", new int[,] { { 1 }, { 3 }, { 5 } }, 3, true);
        CheckSearch("one column missing", new int[,] { { 1 }, { 3 }, { 5 } }, 4, false);
        CheckSearch("single found", new int[,] { { 7 } }, 7, true);
        CheckSearch("single missing", new int[,] { { 7 } }, 6, false);
        CheckSearch("empty", new int[0, 0], 1, false);
        CheckSearch("zero rows", new int[0, 3], 1, false);
        CheckSearch("zero columns", new int[3, 0], 1, false);
""")
    ];
}
