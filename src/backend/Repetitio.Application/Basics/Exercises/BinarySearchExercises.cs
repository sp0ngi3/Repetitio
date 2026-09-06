using Repetitio.Domain.LearningItems;

namespace Repetitio.Application.Basics.Exercises;

/// <summary>
/// Provides built-in Basics exercises for binary search.
/// </summary>
public static class BinarySearchExercises
{
    /// <summary>
    /// Gets the sorted array binary search exercise.
    /// </summary>
    public static BasicExerciseResponse SearchSortedArray { get; } = BasicExerciseFactory.Create(
        "binary-search-sorted-array",
        "Binary Search: Search Sorted Array",
        LearningDifficulty.Easy,
        "Search a sorted array in O(log n) time.",
        """
Given an array of distinct integers sorted in ascending order and an integer target, return the index of target.

Return -1 if target does not exist in nums.
""",
        """
Example 1:
Input: nums = [-1,0,2,4,6,8], target = 4
Output: 3

Example 2:
Input: nums = [-1,0,2,4,6,8], target = 3
Output: -1
""",
        """
- 1 <= nums.length <= 10000.
- -10000 < nums[i], target < 10000.
- All values in nums are unique.
- nums is sorted in ascending order.
- Target time complexity: O(log n).
""",
        """
Search([-1,0,2,4,6,8], 4) => 3
Search([-1,0,2,4,6,8], 3) => -1
Search([1], 1) => 0
Search([1], 2) => -1
Search([1,2], 1) => 0
Search([1,2], 2) => 1
Search([-10,-3,0,5,9], -10) => 0
Search([-10,-3,0,5,9], 9) => 4
Search([2,5,7,11,15], 6) => -1
Search([2,5,7,11,15], 11) => 3
""",
        """
Keep low and high indexes. Compare target with the middle value and discard half of the remaining range each step.
""",
        "public static int Search(int[] nums, int target)",
        ["array", "binary-search", "sorted-array"],
        IntStarter("Search", "int[] nums, int target"),
        """
public static class Solution
{
    /// <summary>
    /// Searches a sorted array for a target value.
    /// </summary>
    /// <param name="nums">The sorted input values.</param>
    /// <param name="target">The target value.</param>
    /// <returns>The target index, or -1 when the target is missing.</returns>
    public static int Search(int[] nums, int target)
    {
        var low = 0;
        var high = nums.Length - 1;

        while (low <= high)
        {
            var middle = low + ((high - low) / 2);

            if (nums[middle] == target)
            {
                return middle;
            }

            if (nums[middle] < target)
            {
                low = middle + 1;
            }
            else
            {
                high = middle - 1;
            }
        }

        return -1;
    }
}
""");

    /// <summary>
    /// Gets the binary search tree node search exercise.
    /// </summary>
    public static BasicExerciseResponse SearchBinarySearchTreeNode { get; } = BasicExerciseFactory.Create(
        "binary-search-tree-search-node",
        "Binary Search Tree: Search Node",
        LearningDifficulty.Easy,
        "Search for a value in a binary search tree.",
        """
Given the root of a binary search tree and an integer target, return true when the tree contains target.

Return false when the tree is empty or target does not exist in the tree.
""",
        """
Example 1:
Input: root = 8,3,10,1,6,null,14,null,null,4,7,13, target = 7
Output: true

Example 2:
Input: root = 8,3,10,1,6,null,14,null,null,4,7,13, target = 5
Output: false
""",
        """
- The tree may be empty.
- TreeNode.Value stores the node value.
- TreeNode.Left contains smaller values.
- TreeNode.Right contains larger values.
- Target time complexity: O(h), where h is the tree height.
- Target extra space complexity: O(h) for recursion, or O(1) for an iterative solution.
""",
        """
SearchNode(null, 5) => false
SearchNode([8,3,10,1,6,null,14,null,null,4,7,13], 8) => true
SearchNode([8,3,10,1,6,null,14,null,null,4,7,13], 1) => true
SearchNode([8,3,10,1,6,null,14,null,null,4,7,13], 13) => true
SearchNode([8,3,10,1,6,null,14,null,null,4,7,13], 5) => false
SearchNode([8,3,10,1,6,null,14,null,null,4,7,13], 15) => false
SearchNode([42], 42) => true
SearchNode([42], 7) => false
""",
        """
Compare target with the current node value. Go right when target is larger, go left when target is smaller, and stop when you find the value or run out of nodes.
""",
        "public static bool SearchNode(TreeNode? root, int target)",
        ["binary-search-tree", "binary-tree", "search", "recursion"],
        BinarySearchTreeSearchStarter(),
        BinarySearchTreeSearchReference());

    /// <summary>
    /// Gets the binary search tree insertion exercise.
    /// </summary>
    public static BasicExerciseResponse InsertBinarySearchTreeNode { get; } = BasicExerciseFactory.Create(
        "binary-search-tree-insert-node",
        "Binary Search Tree: Insert Node",
        LearningDifficulty.Easy,
        "Insert a new value into a binary search tree and return the root.",
        """
Given the root of a binary search tree and an integer val, insert val into the tree and return the root node.

Use the binary search tree ordering rule: values smaller than a node go left, and values larger than a node go right. If val already exists, leave the tree unchanged.
""",
        """
Example 1:
Input: root = [8,3,10,1,6,null,14,null,null,4,7,13], val = 5
Output in-order: [1,3,4,5,6,7,8,10,13,14]

Example 2:
Input: root = null, val = 5
Output in-order: [5]
""",
        """
- The tree may be empty.
- TreeNode.Value stores the node value.
- TreeNode.Left contains smaller values.
- TreeNode.Right contains larger values.
- Duplicate values should not be inserted.
- Target time complexity: O(h), where h is the tree height.
- Target extra space complexity: O(h) for recursion, or O(1) for an iterative solution.
""",
        """
Insert(null, 5) => [5]
Insert([8,3,10,1,6,null,14,null,null,4,7,13], 5) => [1,3,4,5,6,7,8,10,13,14]
Insert([8,3,10,1,6,null,14,null,null,4,7,13], 0) => [0,1,3,4,6,7,8,10,13,14]
Insert([8,3,10,1,6,null,14,null,null,4,7,13], 15) => [1,3,4,6,7,8,10,13,14,15]
Insert([8,3,10,1,6,null,14,null,null,4,7,13], 6) => [1,3,4,6,7,8,10,13,14]
""",
        """
Walk down the tree using the BST comparison. When you find a null child position, create the new node there, then return the original root back up the recursion.
""",
        "public static TreeNode Insert(TreeNode? root, int val)",
        ["binary-search-tree", "binary-tree", "insertion", "recursion"],
        BinarySearchTreeInsertStarter(),
        BinarySearchTreeInsertReference());

    /// <summary>
    /// Gets the binary search tree minimum node exercise.
    /// </summary>
    public static BasicExerciseResponse MinBinarySearchTreeNode { get; } = BasicExerciseFactory.Create(
        "binary-search-tree-min-value-node",
        "Binary Search Tree: Minimum Value Node",
        LearningDifficulty.Easy,
        "Find the node with the smallest value in a binary search tree.",
        """
Given the non-empty root of a binary search tree, return the node with the minimum value.

In a binary search tree, the smallest value is found by following left children until there is no more left child.
""",
        """
Example 1:
Input: root = [8,3,10,1,6,null,14,null,null,4,7,13]
Output: node with value 1

Example 2:
Input: root = [8,null,10]
Output: node with value 8
""",
        """
- The tree is non-empty.
- Return the TreeNode itself, not only its value.
- TreeNode.Left contains smaller values.
- Target time complexity: O(h), where h is the tree height.
- Target extra space complexity: O(1).
""",
        """
MinValueNode([8,3,10,1,6,null,14,null,null,4,7,13]) => node with value 1
MinValueNode([8,null,10]) => node with value 8
MinValueNode([42]) => node with value 42
MinValueNode([5,2,9,1]) => node with value 1
""",
        """
Start at root. While the current node has a left child, move left. The first node without a left child is the minimum value node.
""",
        "public static TreeNode MinValueNode(TreeNode root)",
        ["binary-search-tree", "binary-tree", "minimum", "iteration"],
        BinarySearchTreeMinValueStarter(),
        BinarySearchTreeMinValueReference());

    /// <summary>
    /// Gets the binary search tree removal exercise.
    /// </summary>
    public static BasicExerciseResponse RemoveBinarySearchTreeNode { get; } = BasicExerciseFactory.Create(
        "binary-search-tree-remove-node",
        "Binary Search Tree: Remove Node",
        LearningDifficulty.Medium,
        "Remove a value from a binary search tree and return the root.",
        """
Given the root of a binary search tree and an integer val, remove the node with value val and return the root node after deletion.

Handle all deletion cases: missing value, leaf node, node with one child, and node with two children. For the two-child case, replace the removed node with the minimum value from its right subtree.
""",
        """
Example 1:
Input: root = [8,3,10,1,6,null,14,null,null,4,7,13], val = 1
Output in-order: [3,4,6,7,8,10,13,14]

Example 2:
Input: root = [8,3,10,1,6,null,14,null,null,4,7,13], val = 3
Output in-order: [1,4,6,7,8,10,13,14]
""",
        """
- The tree may be empty.
- TreeNode.Left contains smaller values.
- TreeNode.Right contains larger values.
- If val does not exist, return the tree unchanged.
- When removing a node with two children, use the minimum node from the right subtree.
- Target time complexity: O(h), where h is the tree height.
- Target extra space complexity: O(h) for recursion, or O(1) for an iterative solution.
""",
        """
Remove(null, 5) => []
Remove([8,3,10,1,6,null,14,null,null,4,7,13], 1) => [3,4,6,7,8,10,13,14]
Remove([8,3,10,1,6,null,14,null,null,4,7,13], 14) => [1,3,4,6,7,8,10,13]
Remove([8,3,10,1,6,null,14,null,null,4,7,13], 3) => [1,4,6,7,8,10,13,14]
Remove([8,3,10,1,6,null,14,null,null,4,7,13], 8) => [1,3,4,6,7,10,13,14]
Remove([8,3,10,1,6,null,14,null,null,4,7,13], 99) => [1,3,4,6,7,8,10,13,14]
""",
        """
Search for val using normal BST comparisons. Once found, return the non-null child for zero or one child cases. For two children, copy the minimum value from the right subtree into the current node, then remove that duplicate from the right subtree.
""",
        "public static TreeNode? Remove(TreeNode? root, int val)",
        ["binary-search-tree", "binary-tree", "deletion", "recursion"],
        BinarySearchTreeRemoveStarter(),
        BinarySearchTreeRemoveReference());

    /// <summary>
    /// Creates an integer-returning starter.
    /// </summary>
    /// <param name="methodName">The method name.</param>
    /// <param name="parameters">The method parameters.</param>
    /// <returns>The starter code.</returns>
    private static string IntStarter(string methodName, string parameters)
    {
        return $$"""
public static class Solution
{
    /// <summary>
    /// Implements the {{methodName}} exercise.
    /// </summary>
    /// <param name="nums">The sorted input values.</param>
    /// <param name="target">The target value.</param>
    /// <returns>The computed index.</returns>
    public static int {{methodName}}({{parameters}})
    {
        return -1;
    }
}
""";
    }

    private const string TreeNodeSource = """
public sealed class TreeNode
{
    /// <summary>
    /// Initializes a new instance of the <see cref="TreeNode"/> class.
    /// </summary>
    public TreeNode()
    {
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="TreeNode"/> class.
    /// </summary>
    /// <param name="value">The node value.</param>
    public TreeNode(int value)
    {
        Value = value;
    }

    /// <summary>
    /// Gets or sets the node value.
    /// </summary>
    public int Value { get; set; }

    /// <summary>
    /// Gets or sets the left child.
    /// </summary>
    public TreeNode? Left { get; set; }

    /// <summary>
    /// Gets or sets the right child.
    /// </summary>
    public TreeNode? Right { get; set; }
}
""";

    /// <summary>
    /// Creates the binary search tree search starter.
    /// </summary>
    /// <returns>The starter code.</returns>
    private static string BinarySearchTreeSearchStarter()
    {
        return TreeNodeSource + "\n\n" + """
public static class Solution
{
    /// <summary>
    /// Searches a binary search tree for a target value.
    /// </summary>
    /// <param name="root">The root node.</param>
    /// <param name="target">The target value.</param>
    /// <returns>True when the target exists; otherwise, false.</returns>
    public static bool SearchNode(TreeNode? root, int target)
    {
        return false;
    }
}
""";
    }

    /// <summary>
    /// Creates the binary search tree search reference solution.
    /// </summary>
    /// <returns>The reference solution.</returns>
    private static string BinarySearchTreeSearchReference()
    {
        return TreeNodeSource + "\n\n" + """
public static class Solution
{
    /// <summary>
    /// Searches a binary search tree for a target value.
    /// </summary>
    /// <param name="root">The root node.</param>
    /// <param name="target">The target value.</param>
    /// <returns>True when the target exists; otherwise, false.</returns>
    public static bool SearchNode(TreeNode? root, int target)
    {
        if (root is null)
        {
            return false;
        }

        if (target > root.Value)
        {
            return SearchNode(root.Right, target);
        }

        if (target < root.Value)
        {
            return SearchNode(root.Left, target);
        }

        return true;
    }
}
""";
    }

    /// <summary>
    /// Creates the binary search tree insertion starter.
    /// </summary>
    /// <returns>The starter code.</returns>
    private static string BinarySearchTreeInsertStarter()
    {
        return TreeNodeSource + "\n\n" + """
public static class Solution
{
    /// <summary>
    /// Inserts a value into a binary search tree.
    /// </summary>
    /// <param name="root">The root node.</param>
    /// <param name="val">The value to insert.</param>
    /// <returns>The root node after insertion.</returns>
    public static TreeNode Insert(TreeNode? root, int val)
    {
        return new TreeNode(val);
    }
}
""";
    }

    /// <summary>
    /// Creates the binary search tree insertion reference solution.
    /// </summary>
    /// <returns>The reference solution.</returns>
    private static string BinarySearchTreeInsertReference()
    {
        return TreeNodeSource + "\n\n" + """
public static class Solution
{
    /// <summary>
    /// Inserts a value into a binary search tree.
    /// </summary>
    /// <param name="root">The root node.</param>
    /// <param name="val">The value to insert.</param>
    /// <returns>The root node after insertion.</returns>
    public static TreeNode Insert(TreeNode? root, int val)
    {
        if (root is null)
        {
            return new TreeNode(val);
        }

        if (val > root.Value)
        {
            root.Right = Insert(root.Right, val);
        }
        else if (val < root.Value)
        {
            root.Left = Insert(root.Left, val);
        }

        return root;
    }
}
""";
    }

    /// <summary>
    /// Creates the binary search tree minimum node starter.
    /// </summary>
    /// <returns>The starter code.</returns>
    private static string BinarySearchTreeMinValueStarter()
    {
        return TreeNodeSource + "\n\n" + """
public static class Solution
{
    /// <summary>
    /// Finds the minimum value node in a binary search tree.
    /// </summary>
    /// <param name="root">The non-empty root node.</param>
    /// <returns>The node with the smallest value.</returns>
    public static TreeNode MinValueNode(TreeNode root)
    {
        return root;
    }
}
""";
    }

    /// <summary>
    /// Creates the binary search tree minimum node reference solution.
    /// </summary>
    /// <returns>The reference solution.</returns>
    private static string BinarySearchTreeMinValueReference()
    {
        return TreeNodeSource + "\n\n" + """
public static class Solution
{
    /// <summary>
    /// Finds the minimum value node in a binary search tree.
    /// </summary>
    /// <param name="root">The non-empty root node.</param>
    /// <returns>The node with the smallest value.</returns>
    public static TreeNode MinValueNode(TreeNode root)
    {
        var current = root;

        while (current.Left is not null)
        {
            current = current.Left;
        }

        return current;
    }
}
""";
    }

    /// <summary>
    /// Creates the binary search tree removal starter.
    /// </summary>
    /// <returns>The starter code.</returns>
    private static string BinarySearchTreeRemoveStarter()
    {
        return TreeNodeSource + "\n\n" + """
public static class Solution
{
    /// <summary>
    /// Finds the minimum value node in a binary search tree.
    /// </summary>
    /// <param name="root">The non-empty root node.</param>
    /// <returns>The node with the smallest value.</returns>
    public static TreeNode MinValueNode(TreeNode root)
    {
        return root;
    }

    /// <summary>
    /// Removes a value from a binary search tree.
    /// </summary>
    /// <param name="root">The root node.</param>
    /// <param name="val">The value to remove.</param>
    /// <returns>The root node after removal.</returns>
    public static TreeNode? Remove(TreeNode? root, int val)
    {
        return root;
    }
}
""";
    }

    /// <summary>
    /// Creates the binary search tree removal reference solution.
    /// </summary>
    /// <returns>The reference solution.</returns>
    private static string BinarySearchTreeRemoveReference()
    {
        return TreeNodeSource + "\n\n" + """
public static class Solution
{
    /// <summary>
    /// Finds the minimum value node in a binary search tree.
    /// </summary>
    /// <param name="root">The non-empty root node.</param>
    /// <returns>The node with the smallest value.</returns>
    public static TreeNode MinValueNode(TreeNode root)
    {
        var current = root;

        while (current.Left is not null)
        {
            current = current.Left;
        }

        return current;
    }

    /// <summary>
    /// Removes a value from a binary search tree.
    /// </summary>
    /// <param name="root">The root node.</param>
    /// <param name="val">The value to remove.</param>
    /// <returns>The root node after removal.</returns>
    public static TreeNode? Remove(TreeNode? root, int val)
    {
        if (root is null)
        {
            return null;
        }

        if (val > root.Value)
        {
            root.Right = Remove(root.Right, val);
        }
        else if (val < root.Value)
        {
            root.Left = Remove(root.Left, val);
        }
        else
        {
            if (root.Left is null)
            {
                return root.Right;
            }

            if (root.Right is null)
            {
                return root.Left;
            }

            var minNode = MinValueNode(root.Right);
            root.Value = minNode.Value;
            root.Right = Remove(root.Right, minNode.Value);
        }

        return root;
    }
}
""";
    }
}
