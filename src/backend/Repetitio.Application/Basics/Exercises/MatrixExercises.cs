using Repetitio.Domain.LearningItems;

namespace Repetitio.Application.Basics.Exercises;

/// <summary>Exercises for rectangular C# arrays, from indexing to staircase search.</summary>
public static class MatrixExercises
{
    public static BasicExerciseResponse ReadAndUpdate { get; } = BasicExerciseFactory.Create(
        "matrix-read-and-update",
        "Matrix Basics: Read and Update a Cell",
        LearningDifficulty.Easy,
        "Read a cell, replace its value, and return the previous value using int[,] indexing.",
        """
Implement ReadAndUpdate for a rectangular C# array (int[,]). Read the value at matrix[row, col], replace it with newValue, and return the previous value. Modify only the selected cell in the original matrix.

The first index is the row (top to bottom); the second is the column (left to right). Both start at zero. For example, a 2-by-3 matrix has row indexes 0..1 and column indexes 0..2.

C# reminders:
- matrix.GetLength(0) is the number of rows.
- matrix.GetLength(1) is the number of columns.
- matrix.Length is the total number of cells, not the number of rows.
- Use matrix[row, col] for int[,]; matrix[row][col] belongs to jagged arrays (int[][]).
""",
        """
Example 1:
int[,] matrix = { { 1, 2, 3 }, { 4, 5, 6 } };
ReadAndUpdate(matrix, 1, 2, 99) => 6
Matrix afterwards:
1  2   3
4  5  99

Example 2:
int[,] matrix = { { -5 } };
ReadAndUpdate(matrix, 0, 0, 7) => -5
Matrix afterwards: {{7}}
""",
        """
- matrix is not null; 1 <= rows, cols <= 100.
- All supplied indexes are valid: 0 <= row < rows, 0 <= col < cols.
- Values and newValue are between -10000 and 10000.
- Update the original array; leave all other cells unchanged.
- Time: O(1). Extra space: O(1).
""",
        """
ReadAndUpdate({{1,2,3},{4,5,6}}, 1, 2, 99) => 6; only [1,2] becomes 99.
ReadAndUpdate({{1,2,3},{4,5,6}}, 0, 1, -7) => 2; only [0,1] becomes -7.
Also tested: one row, one column, one cell, negative values, same-value updates, and consecutive updates to the same cell.
Tests verify the returned old value AND every cell of the modified matrix.
""",
        "Save matrix[row, col] in a local variable before overwriting it. Assign newValue to that position and return the saved value. No loop is needed.",
        "public static int ReadAndUpdate(int[,] matrix, int row, int col, int newValue)",
        ["array", "matrix", "multidimensional-array", "indexing"],
        """
public static class Solution
{
    public static int ReadAndUpdate(int[,] matrix, int row, int col, int newValue)
    {
        // Update the original cell and return its previous value.
        return 0;
    }
}
""",
        """
public static class Solution
{
    public static int ReadAndUpdate(int[,] matrix, int row, int col, int newValue)
    {
        int previousValue = matrix[row, col];
        matrix[row, col] = newValue;
        return previousValue;
    }
}
""");

    public static BasicExerciseResponse RowAndColumnSums { get; } = BasicExerciseFactory.Create(
        "matrix-row-and-column-sums",
        "Matrix Traversal: Row and Column Sums",
        LearningDifficulty.Easy,
        "Use nested loops to compute the sum of each row and each column of an int[,] matrix.",
        """
Implement both methods for a rectangular C# array:
- SumRows returns an int[] containing the sum of each row, in row order.
- SumColumns returns an int[] containing the sum of each column, in column order.

Do not modify the input matrix. Use nested loops to practice accessing matrix[row, col].

matrix.GetLength(0) gives rows, matrix.GetLength(1) gives columns, and matrix.Length gives the total number of cells. The result of SumRows must have rows entries; the result of SumColumns must have cols entries. Rows and columns do not have to be equal.

Empty dimensions are allowed: a 3-by-0 array has three empty rows, so its row sums are [0,0,0] and its column sums are []. A 0-by-3 array has row sums [] and column sums [0,0,0].
""",
        """
Example 1:
int[,] matrix = { { 1, 2, 3 }, { 4, 5, 6 } };
SumRows(matrix) => [6,15]
SumColumns(matrix) => [5,7,9]

Example 2:
int[,] matrix = { { 2, -2 }, { -5, 1 }, { 0, 4 } };
SumRows(matrix) => [0,-4,4]
SumColumns(matrix) => [-3,3]

Example 3:
SumRows(new int[0, 3]) => []
SumColumns(new int[0, 3]) => [0,0,0]
""",
        """
- matrix is not null; 0 <= rows, cols <= 100.
- -10000 <= matrix[row, col] <= 10000.
- Implement BOTH methods and leave the input unchanged.
- Time per method: O(rows * cols + result length), including empty dimensions.
- Extra space: O(rows) for row sums; O(cols) for column sums (the returned arrays).
""",
        """
{{1,2,3},{4,5,6}} => rows [6,15], columns [5,7,9].
{{2,-2},{-5,1},{0,4}} => rows [0,-4,4], columns [-3,3].
Also tested: one row, one column, one cell, all zeros, negative values, 0-by-0, 0-by-3 and 3-by-0 arrays.
Both methods are checked independently, including preservation of the original matrix.
""",
        """
For SumRows, allocate one result per row. Keep row fixed in the outer loop and traverse columns in the inner loop, adding to sums[row]. For SumColumns, allocate one result per column, keep col fixed in the outer loop and traverse rows in the inner loop, adding to sums[col]. Initial int[] values are zero, so each result starts with a fresh sum.
""",
        "public static int[] SumRows(int[,] matrix)\npublic static int[] SumColumns(int[,] matrix)",
        ["array", "matrix", "multidimensional-array", "iteration"],
        """
public static class Solution
{
    public static int[] SumRows(int[,] matrix)
    {
        return new int[0];
    }

    public static int[] SumColumns(int[,] matrix)
    {
        return new int[0];
    }
}
""",
        """
public static class Solution
{
    public static int[] SumRows(int[,] matrix)
    {
        int rows = matrix.GetLength(0);
        int cols = matrix.GetLength(1);
        int[] sums = new int[rows];

        for (int row = 0; row < rows; row++)
        {
            for (int col = 0; col < cols; col++)
            {
                sums[row] += matrix[row, col];
            }
        }

        return sums;
    }

    public static int[] SumColumns(int[,] matrix)
    {
        int rows = matrix.GetLength(0);
        int cols = matrix.GetLength(1);
        int[] sums = new int[cols];

        for (int col = 0; col < cols; col++)
        {
            for (int row = 0; row < rows; row++)
            {
                sums[col] += matrix[row, col];
            }
        }

        return sums;
    }
}
""");

    public static BasicExerciseResponse SwapRowsAndColumns { get; } = BasicExerciseFactory.Create(
        "matrix-swap-rows-and-columns",
        "Matrix Manipulation: Swap Rows and Columns",
        LearningDifficulty.Easy,
        "Swap two rows or two columns in place without creating a copy of the matrix.",
        """
Implement both methods for a rectangular C# array:
- SwapRows exchanges every cell of firstRow with the corresponding cell of secondRow.
- SwapColumns exchanges every cell of firstCol with the corresponding cell of secondCol.

Both methods modify the original int[,] array and return nothing. Preserve all cells outside the selected rows or columns. Swapping an index with itself must leave the matrix unchanged.

To swap rows, walk across the columns (GetLength(1)). To swap columns, walk down the rows (GetLength(0)). Use matrix[row, col], not matrix[col, row].
""",
        """
Original matrix (each example starts from this original):
1  2  3
4  5  6

SwapRows(matrix, 0, 1) produces:
4  5  6
1  2  3

SwapColumns(matrix, 0, 2) produces:
3  2  1
6  5  4

SwapRows(matrix, 1, 1) leaves the original unchanged.
""",
        """
- matrix is not null; 0 <= rows, cols <= 100.
- All supplied indexes are valid for the selected dimension.
- SwapRows requires at least one row, but that row may contain zero columns.
- SwapColumns requires at least one column, but that column may contain zero rows.
- -10000 <= matrix[row, col] <= 10000.
- SwapRows time: O(cols). SwapColumns time: O(rows). Extra space: O(1).
- Do not allocate another matrix, row array, or column array.
""",
        """
SwapRows({{1,2,3},{4,5,6}}, 0, 1) => {{4,5,6},{1,2,3}}.
SwapColumns({{1,2,3},{4,5,6}}, 0, 2) => {{3,2,1},{6,5,4}}.
Also tested: tall and wide rectangles, middle indexes, identical indexes, reversed index order, one row, one column, and empty opposite dimensions.
Tests inspect every cell in the original array after the call.
""",
        "Use a single loop and a temporary int. Save the first cell, overwrite it with the second cell, then write the saved value into the second cell. Keep row indexes fixed when swapping rows, and column indexes fixed when swapping columns.",
        "public static void SwapRows(int[,] matrix, int firstRow, int secondRow)\npublic static void SwapColumns(int[,] matrix, int firstCol, int secondCol)",
        ["array", "matrix", "multidimensional-array", "in-place", "swapping"],
        """
public static class Solution
{
    public static void SwapRows(int[,] matrix, int firstRow, int secondRow)
    {
        // Modify the original matrix.
    }

    public static void SwapColumns(int[,] matrix, int firstCol, int secondCol)
    {
        // Modify the original matrix.
    }
}
""",
        """
public static class Solution
{
    public static void SwapRows(int[,] matrix, int firstRow, int secondRow)
    {
        for (int col = 0; col < matrix.GetLength(1); col++)
        {
            int temporary = matrix[firstRow, col];
            matrix[firstRow, col] = matrix[secondRow, col];
            matrix[secondRow, col] = temporary;
        }
    }

    public static void SwapColumns(int[,] matrix, int firstCol, int secondCol)
    {
        for (int row = 0; row < matrix.GetLength(0); row++)
        {
            int temporary = matrix[row, firstCol];
            matrix[row, firstCol] = matrix[row, secondCol];
            matrix[row, secondCol] = temporary;
        }
    }
}
""");

    public static BasicExerciseResponse StaircaseSearch { get; } = BasicExerciseFactory.Create(
        "matrix-staircase-search",
        "Staircase Search in a Sorted Matrix",
        LearningDifficulty.Easy,
        "Search a row-and-column sorted matrix by eliminating one row or column at each step.",
        """
Given a rectangular int[,] matrix and an integer target, return true if the target appears in the matrix, otherwise false.

Each row is sorted in nondecreasing order from left to right. Each column is sorted in nondecreasing order from top to bottom. Duplicates are allowed. An empty matrix contains no target.

Use staircase search: start at the top-right corner and move left or down after each comparison. Avoid visiting every cell. Rows and columns can have different lengths; this is not a square-matrix-only problem.

For a 2-by-3 matrix, GetLength(0) is 2 and GetLength(1) is 3. The top-right position is row 0, column GetLength(1) - 1. Each column being sorted does not mean the first value of a row is greater than the last value of the previous row, so a flattened binary search is not appropriate.
""",
        """
Example 1:
int[,] matrix = { { 1, 4, 7 }, { 2, 5, 8 }, { 3, 6, 9 } };
StaircaseSearch(matrix, 6) => true
One possible search path: 7 -> 4 -> 5 -> 6.

Example 2:
The same matrix, target = 10 => false.

Example 3:
int[,] matrix = { { 1, 4, 7, 11 }, { 2, 5, 8, 12 } };
StaircaseSearch(matrix, 5) => true
""",
        """
- matrix is not null; 0 <= rows, cols <= 100.
- Rows and columns are sorted in nondecreasing order; duplicates are allowed.
- Matrix values and target are between -10000 and 10000.
- Do not modify the matrix.
- Target time: O(rows + cols). Extra space: O(1).
""",
        """
{{1,4,7},{2,5,8},{3,6,9}}, target 6 => true; target 10 => false.
Also tested: wide/tall matrices, a missing value between existing values, duplicates, negative values, all four corners, one row, one column, one cell, 0-by-0, 0-by-3 and 3-by-0 arrays.
Tests also verify that the input stays unchanged.
""",
        """
Start at row = 0 and col = matrix.GetLength(1) - 1. Continue while row < matrix.GetLength(0) and col >= 0. If the current value equals target, return true. If it is too large, move left: all remaining values below it in that column are also too large. If it is too small, move down: all remaining values to its left in that row are also too small. Each step removes one row or column from consideration. Return false when you leave the matrix.
""",
        "public static bool StaircaseSearch(int[,] matrix, int target)",
        ["array", "matrix", "multidimensional-array", "search", "staircase-search"],
        """
public static class Solution
{
    public static bool StaircaseSearch(int[,] matrix, int target)
    {
        return false;
    }
}
""",
        """
public static class Solution
{
    public static bool StaircaseSearch(int[,] matrix, int target)
    {
        int row = 0;
        int col = matrix.GetLength(1) - 1;

        while (row < matrix.GetLength(0) && col >= 0)
        {
            int current = matrix[row, col];
            if (current == target)
            {
                return true;
            }

            if (current > target)
            {
                col--;
            }
            else
            {
                row++;
            }
        }

        return false;
    }
}
""");
}
