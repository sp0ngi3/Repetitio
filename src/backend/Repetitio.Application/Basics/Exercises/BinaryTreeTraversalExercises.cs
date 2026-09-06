using Repetitio.Domain.LearningItems;

namespace Repetitio.Application.Basics.Exercises;

/// <summary>
/// Provides built-in Basics exercises for binary tree traversals.
/// </summary>
public static class BinaryTreeTraversalExercises
{
    /// <summary>
    /// Gets the inorder traversal exercise.
    /// </summary>
    public static BasicExerciseResponse InOrderTraversal { get; } = CreateTraversalDefinition(
        "binary-tree-inorder-traversal",
        "Binary Tree Traversal: InOrder",
        "Print the values of a binary tree using inorder traversal.",
        """
Given the root of a binary tree, print each node value using inorder traversal.

Inorder traversal visits the left subtree first, then the current node, then the right subtree.
""",
        """
Example:
Input tree:
    1
   / \
  2   3
 / \   \
4   5   6

Output lines:
4
2
5
1
3
6
""",
        """
InOrder([1,2,3,4,5,null,6]) prints 4, 2, 5, 1, 3, 6
InOrder([]) prints nothing
InOrder([7]) prints 7
InOrder([3,2,null,1]) prints 1, 2, 3
""",
        """
For each node: recursively traverse root.Left, print root.Value, then recursively traverse root.Right.
""",
        "public static void InOrder(TreeNode? root)",
        ["binary-tree", "traversal", "dfs", "recursion", "inorder"],
        "InOrder",
        "left, node, right",
        """
        InOrder(root.Left);
        Console.WriteLine(root.Value);
        InOrder(root.Right);
""");

    /// <summary>
    /// Gets the preorder traversal exercise.
    /// </summary>
    public static BasicExerciseResponse PreOrderTraversal { get; } = CreateTraversalDefinition(
        "binary-tree-preorder-traversal",
        "Binary Tree Traversal: PreOrder",
        "Print the values of a binary tree using preorder traversal.",
        """
Given the root of a binary tree, print each node value using preorder traversal.

Preorder traversal visits the current node first, then the left subtree, then the right subtree.
""",
        """
Example:
Input tree:
    1
   / \
  2   3
 / \   \
4   5   6

Output lines:
1
2
4
5
3
6
""",
        """
PreOrder([1,2,3,4,5,null,6]) prints 1, 2, 4, 5, 3, 6
PreOrder([]) prints nothing
PreOrder([7]) prints 7
PreOrder([3,2,null,1]) prints 3, 2, 1
""",
        """
For each node: print root.Value, recursively traverse root.Left, then recursively traverse root.Right.
""",
        "public static void PreOrder(TreeNode? root)",
        ["binary-tree", "traversal", "dfs", "recursion", "preorder"],
        "PreOrder",
        "node, left, right",
        """
        Console.WriteLine(root.Value);
        PreOrder(root.Left);
        PreOrder(root.Right);
""");

    /// <summary>
    /// Gets the postorder traversal exercise.
    /// </summary>
    public static BasicExerciseResponse PostOrderTraversal { get; } = CreateTraversalDefinition(
        "binary-tree-postorder-traversal",
        "Binary Tree Traversal: PostOrder",
        "Print the values of a binary tree using postorder traversal.",
        """
Given the root of a binary tree, print each node value using postorder traversal.

Postorder traversal visits the left subtree first, then the right subtree, then the current node.
""",
        """
Example:
Input tree:
    1
   / \
  2   3
 / \   \
4   5   6

Output lines:
4
5
2
6
3
1
""",
        """
PostOrder([1,2,3,4,5,null,6]) prints 4, 5, 2, 6, 3, 1
PostOrder([]) prints nothing
PostOrder([7]) prints 7
PostOrder([3,2,null,1]) prints 1, 2, 3
""",
        """
For each node: recursively traverse root.Left, recursively traverse root.Right, then print root.Value.
""",
        "public static void PostOrder(TreeNode? root)",
        ["binary-tree", "traversal", "dfs", "recursion", "postorder"],
        "PostOrder",
        "left, right, node",
        """
        PostOrder(root.Left);
        PostOrder(root.Right);
        Console.WriteLine(root.Value);
""");

    /// <summary>
    /// Gets the breadth-first search traversal exercise.
    /// </summary>
    public static BasicExerciseResponse BreadthFirstSearchTraversal { get; } = BasicExerciseFactory.Create(
        "binary-tree-breadth-first-search",
        "Binary Tree Traversal: Breadth-First Search",
        LearningDifficulty.Easy,
        "Print a binary tree level by level using breadth-first search.",
        """
Given the root of a binary tree, print each level from top to bottom using breadth-first search.

Use a queue to process nodes in the order they are discovered. Before printing each level's values, print a header in the exact format: level X:
""",
        """
Example:
Input tree:
    1
   / \
  2   3
 / \   \
4   5   6

Output lines:
level 0:
1

level 1:
2
3

level 2:
4
5
6
""",
        """
- The tree may be empty.
- Print one value per line with Console.WriteLine.
- Before each level, print exactly "level " + level + ": ".
- Print a blank line after each level.
- Target time complexity: O(n), where n is the number of nodes.
- Target extra space complexity: O(w), where w is the maximum tree width.
""",
        """
BfsTraversal([1,2,3,4,5,null,6]) prints level 0: 1, then level 1: 2, 3, then level 2: 4, 5, 6
BfsTraversal([]) prints nothing
BfsTraversal([7]) prints level 0: 7
BfsTraversal([3,2,null,1]) prints level 0: 3, then level 1: 2, then level 2: 1
""",
        """
Use a Queue<TreeNode>. At the start of each while-loop iteration, queue.Count is the number of nodes in the current level. Process exactly that many nodes, enqueue their children, then move to the next level.
""",
        "public static void BfsTraversal(TreeNode? root)",
        ["binary-tree", "traversal", "bfs", "queue", "level-order"],
        CreateBreadthFirstSearchStarter(),
        CreateBreadthFirstSearchReference());

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

    private static BasicExerciseResponse CreateTraversalDefinition(
        string slug,
        string title,
        string shortDescription,
        string problemStatement,
        string examples,
        string testCases,
        string hints,
        string functionSignature,
        string[] tags,
        string methodName,
        string orderDescription,
        string referenceBody)
    {
        return BasicExerciseFactory.Create(
            slug,
            title,
            LearningDifficulty.Easy,
            shortDescription,
            problemStatement,
            examples,
            """
- The tree may be empty.
- Print one value per line with Console.WriteLine.
- Do not return an array; the traversal is tested by captured console output.
- Target time complexity: O(n), where n is the number of nodes.
- Target extra space complexity: O(h), where h is the tree height.
""",
            testCases,
            hints,
            functionSignature,
            tags,
            CreateTraversalStarter(methodName, orderDescription),
            CreateTraversalReference(methodName, referenceBody));
    }

    private static string CreateTraversalStarter(string methodName, string orderDescription)
    {
        return TreeNodeSource + "\n\n" + $$"""
public static class Solution
{
    /// <summary>
    /// Prints a binary tree traversal in {{orderDescription}} order.
    /// </summary>
    /// <param name="root">The root node.</param>
    public static void {{methodName}}(TreeNode? root)
    {
        if (root is null)
        {
            return;
        }
    }
}
""";
    }

    private static string CreateTraversalReference(string methodName, string referenceBody)
    {
        return TreeNodeSource + "\n\n" + $$"""
public static class Solution
{
    /// <summary>
    /// Prints a binary tree traversal.
    /// </summary>
    /// <param name="root">The root node.</param>
    public static void {{methodName}}(TreeNode? root)
    {
        if (root is null)
        {
            return;
        }

{{referenceBody}}
    }
}
""";
    }

    private static string CreateBreadthFirstSearchStarter()
    {
        return TreeNodeSource + "\n\n" + """
public static class Solution
{
    /// <summary>
    /// Prints a binary tree level by level using breadth-first search.
    /// </summary>
    /// <param name="root">The root node.</param>
    public static void BfsTraversal(TreeNode? root)
    {
    }
}
""";
    }

    private static string CreateBreadthFirstSearchReference()
    {
        return TreeNodeSource + "\n\n" + """
public static class Solution
{
    /// <summary>
    /// Prints a binary tree level by level using breadth-first search.
    /// </summary>
    /// <param name="root">The root node.</param>
    public static void BfsTraversal(TreeNode? root)
    {
        var queue = new Queue<TreeNode>();

        if (root is not null)
        {
            queue.Enqueue(root);
        }

        var level = 0;

        while (queue.Count > 0)
        {
            Console.WriteLine("level " + level + ": ");
            var levelLength = queue.Count;

            for (var index = 0; index < levelLength; index++)
            {
                var current = queue.Dequeue();
                Console.WriteLine(current.Value);

                if (current.Left is not null)
                {
                    queue.Enqueue(current.Left);
                }

                if (current.Right is not null)
                {
                    queue.Enqueue(current.Right);
                }
            }

            level++;
            Console.WriteLine();
        }
    }
}
""";
    }
}
