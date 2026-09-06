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
        results.Add(RunInt("example mixed", 8, () => Solution.MaxSubArray([2, -3, 4, -2, 2, 1, -1, 4])));
        results.Add(RunInt("single negative", -1, () => Solution.MaxSubArray([-1])));
        results.Add(RunInt("all negative keeps largest", -2, () => Solution.MaxSubArray([-5, -2, -8])));
        results.Add(RunInt("all positive takes whole array", 10, () => Solution.MaxSubArray([1, 2, 3, 4])));
        results.Add(RunInt("restart after loss", 6, () => Solution.MaxSubArray([5, -10, 6])));
        results.Add(RunInt("all zero", 0, () => Solution.MaxSubArray([0, 0, 0])));
        results.Add(RunInt("classic kadane", 6, () => Solution.MaxSubArray([-2, 1, -3, 4, -1, 2, 1, -5, 4])));
        results.Add(RunInt("prefix remains useful", 147, () => Solution.MaxSubArray([100, -1, -2, 50])));
"""),
            new BasicExerciseHarness("linked-list-insert-at-head", """
        results.Add(RunList("insert head into empty", [1], () => Solution.InsertAtHead(BuildList([]), 1)));
        results.Add(RunList("insert head into existing", [1, 2, 3], () => Solution.InsertAtHead(BuildList([2, 3]), 1)));
        results.Add(RunList("insert before single node", [5, 10], () => Solution.InsertAtHead(BuildList([10]), 5)));
        results.Add(RunList("insert negative value", [-2, -1, 0], () => Solution.InsertAtHead(BuildList([-1, 0]), -2)));
""", includeLinkedListHelpers: true),
            new BasicExerciseHarness("linked-list-insert-at-end", """
        results.Add(RunList("insert end into empty", [1], () => Solution.InsertAtEnd(BuildList([]), 1)));
        results.Add(RunList("insert end into existing", [1, 2, 3], () => Solution.InsertAtEnd(BuildList([1, 2]), 3)));
        results.Add(RunList("insert after single node", [7, 8], () => Solution.InsertAtEnd(BuildList([7]), 8)));
        results.Add(RunList("insert after negative values", [-2, 0, 5], () => Solution.InsertAtEnd(BuildList([-2, 0]), 5)));
""", includeLinkedListHelpers: true),
            new BasicExerciseHarness("linked-list-insert-at-index", """
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
"""),
            new BasicExerciseHarness("binary-search-tree-search-node", """
        TreeNode BuildSearchTree()
        {
            return new TreeNode
            {
                Value = 8,
                Left = new TreeNode
                {
                    Value = 3,
                    Left = new TreeNode { Value = 1 },
                    Right = new TreeNode
                    {
                        Value = 6,
                        Left = new TreeNode { Value = 4 },
                        Right = new TreeNode { Value = 7 }
                    }
                },
                Right = new TreeNode
                {
                    Value = 10,
                    Right = new TreeNode
                    {
                        Value = 14,
                        Left = new TreeNode { Value = 13 }
                    }
                }
            };
        }

        results.Add(RunBool("empty tree", false, () => Solution.SearchNode(null, 5)));
        results.Add(RunBool("root found", true, () => Solution.SearchNode(BuildSearchTree(), 8)));
        results.Add(RunBool("left leaf found", true, () => Solution.SearchNode(BuildSearchTree(), 1)));
        results.Add(RunBool("right subtree found", true, () => Solution.SearchNode(BuildSearchTree(), 13)));
        results.Add(RunBool("missing between nodes", false, () => Solution.SearchNode(BuildSearchTree(), 5)));
        results.Add(RunBool("missing greater than max", false, () => Solution.SearchNode(BuildSearchTree(), 15)));
        results.Add(RunBool("single found", true, () => Solution.SearchNode(new TreeNode { Value = 42 }, 42)));
        results.Add(RunBool("single missing", false, () => Solution.SearchNode(new TreeNode { Value = 42 }, 7)));
"""),
            new BasicExerciseHarness("binary-search-tree-insert-node", """
        TreeNode BuildSearchTree()
        {
            return new TreeNode
            {
                Value = 8,
                Left = new TreeNode
                {
                    Value = 3,
                    Left = new TreeNode { Value = 1 },
                    Right = new TreeNode
                    {
                        Value = 6,
                        Left = new TreeNode { Value = 4 },
                        Right = new TreeNode { Value = 7 }
                    }
                },
                Right = new TreeNode
                {
                    Value = 10,
                    Right = new TreeNode
                    {
                        Value = 14,
                        Left = new TreeNode { Value = 13 }
                    }
                }
            };
        }

        int[] InOrder(TreeNode? root)
        {
            var values = new List<int>();

            void Walk(TreeNode? node)
            {
                if (node is null)
                {
                    return;
                }

                Walk(node.Left);
                values.Add(node.Value);
                Walk(node.Right);
            }

            Walk(root);
            return values.ToArray();
        }

        results.Add(RunArray("insert into empty", [5], () => InOrder(Solution.Insert(null, 5))));
        results.Add(RunArray("insert left subtree", [1, 3, 4, 5, 6, 7, 8, 10, 13, 14], () => InOrder(Solution.Insert(BuildSearchTree(), 5))));
        results.Add(RunArray("insert new minimum", [0, 1, 3, 4, 6, 7, 8, 10, 13, 14], () => InOrder(Solution.Insert(BuildSearchTree(), 0))));
        results.Add(RunArray("insert new maximum", [1, 3, 4, 6, 7, 8, 10, 13, 14, 15], () => InOrder(Solution.Insert(BuildSearchTree(), 15))));
        results.Add(RunArray("duplicate unchanged", [1, 3, 4, 6, 7, 8, 10, 13, 14], () => InOrder(Solution.Insert(BuildSearchTree(), 6))));
"""),
            new BasicExerciseHarness("binary-search-tree-min-value-node", """
        TreeNode BuildSearchTree()
        {
            return new TreeNode
            {
                Value = 8,
                Left = new TreeNode
                {
                    Value = 3,
                    Left = new TreeNode { Value = 1 },
                    Right = new TreeNode
                    {
                        Value = 6,
                        Left = new TreeNode { Value = 4 },
                        Right = new TreeNode { Value = 7 }
                    }
                },
                Right = new TreeNode
                {
                    Value = 10,
                    Right = new TreeNode
                    {
                        Value = 14,
                        Left = new TreeNode { Value = 13 }
                    }
                }
            };
        }

        results.Add(RunInt("full tree minimum", 1, () => Solution.MinValueNode(BuildSearchTree()).Value));
        results.Add(RunInt("root is minimum", 8, () => Solution.MinValueNode(new TreeNode { Value = 8, Right = new TreeNode { Value = 10 } }).Value));
        results.Add(RunInt("single node", 42, () => Solution.MinValueNode(new TreeNode { Value = 42 }).Value));
        results.Add(RunInt("deep left chain", -5, () => Solution.MinValueNode(new TreeNode { Value = 5, Left = new TreeNode { Value = 2, Left = new TreeNode { Value = -5 } } }).Value));
"""),
            new BasicExerciseHarness("binary-search-tree-remove-node", """
        TreeNode BuildSearchTree()
        {
            return new TreeNode
            {
                Value = 8,
                Left = new TreeNode
                {
                    Value = 3,
                    Left = new TreeNode { Value = 1 },
                    Right = new TreeNode
                    {
                        Value = 6,
                        Left = new TreeNode { Value = 4 },
                        Right = new TreeNode { Value = 7 }
                    }
                },
                Right = new TreeNode
                {
                    Value = 10,
                    Right = new TreeNode
                    {
                        Value = 14,
                        Left = new TreeNode { Value = 13 }
                    }
                }
            };
        }

        int[] InOrder(TreeNode? root)
        {
            var values = new List<int>();

            void Walk(TreeNode? node)
            {
                if (node is null)
                {
                    return;
                }

                Walk(node.Left);
                values.Add(node.Value);
                Walk(node.Right);
            }

            Walk(root);
            return values.ToArray();
        }

        results.Add(RunArray("remove from empty", [], () => InOrder(Solution.Remove(null, 5))));
        results.Add(RunArray("remove leaf", [3, 4, 6, 7, 8, 10, 13, 14], () => InOrder(Solution.Remove(BuildSearchTree(), 1))));
        results.Add(RunArray("remove one child", [1, 3, 4, 6, 7, 8, 10, 13], () => InOrder(Solution.Remove(BuildSearchTree(), 14))));
        results.Add(RunArray("remove two children", [1, 4, 6, 7, 8, 10, 13, 14], () => InOrder(Solution.Remove(BuildSearchTree(), 3))));
        results.Add(RunArray("remove root", [1, 3, 4, 6, 7, 10, 13, 14], () => InOrder(Solution.Remove(BuildSearchTree(), 8))));
        results.Add(RunArray("missing unchanged", [1, 3, 4, 6, 7, 8, 10, 13, 14], () => InOrder(Solution.Remove(BuildSearchTree(), 99))));
"""),
            new BasicExerciseHarness("binary-tree-inorder-traversal", """
        TreeNode BuildTree()
        {
            return new TreeNode
            {
                Value = 1,
                Left = new TreeNode
                {
                    Value = 2,
                    Left = new TreeNode { Value = 4 },
                    Right = new TreeNode { Value = 5 }
                },
                Right = new TreeNode
                {
                    Value = 3,
                    Right = new TreeNode { Value = 6 }
                }
            };
        }

        results.Add(RunConsoleLines("balanced tree", ["4", "2", "5", "1", "3", "6"], () => Solution.InOrder(BuildTree())));
        results.Add(RunConsoleLines("empty tree", [], () => Solution.InOrder(null)));
        results.Add(RunConsoleLines("single node", ["7"], () => Solution.InOrder(new TreeNode { Value = 7 })));
        results.Add(RunConsoleLines("left chain", ["1", "2", "3"], () => Solution.InOrder(new TreeNode { Value = 3, Left = new TreeNode { Value = 2, Left = new TreeNode { Value = 1 } } })));
"""),
            new BasicExerciseHarness("binary-tree-preorder-traversal", """
        TreeNode BuildTree()
        {
            return new TreeNode
            {
                Value = 1,
                Left = new TreeNode
                {
                    Value = 2,
                    Left = new TreeNode { Value = 4 },
                    Right = new TreeNode { Value = 5 }
                },
                Right = new TreeNode
                {
                    Value = 3,
                    Right = new TreeNode { Value = 6 }
                }
            };
        }

        results.Add(RunConsoleLines("balanced tree", ["1", "2", "4", "5", "3", "6"], () => Solution.PreOrder(BuildTree())));
        results.Add(RunConsoleLines("empty tree", [], () => Solution.PreOrder(null)));
        results.Add(RunConsoleLines("single node", ["7"], () => Solution.PreOrder(new TreeNode { Value = 7 })));
        results.Add(RunConsoleLines("left chain", ["3", "2", "1"], () => Solution.PreOrder(new TreeNode { Value = 3, Left = new TreeNode { Value = 2, Left = new TreeNode { Value = 1 } } })));
"""),
            new BasicExerciseHarness("binary-tree-postorder-traversal", """
        TreeNode BuildTree()
        {
            return new TreeNode
            {
                Value = 1,
                Left = new TreeNode
                {
                    Value = 2,
                    Left = new TreeNode { Value = 4 },
                    Right = new TreeNode { Value = 5 }
                },
                Right = new TreeNode
                {
                    Value = 3,
                    Right = new TreeNode { Value = 6 }
                }
            };
        }

        results.Add(RunConsoleLines("balanced tree", ["4", "5", "2", "6", "3", "1"], () => Solution.PostOrder(BuildTree())));
        results.Add(RunConsoleLines("empty tree", [], () => Solution.PostOrder(null)));
        results.Add(RunConsoleLines("single node", ["7"], () => Solution.PostOrder(new TreeNode { Value = 7 })));
        results.Add(RunConsoleLines("left chain", ["1", "2", "3"], () => Solution.PostOrder(new TreeNode { Value = 3, Left = new TreeNode { Value = 2, Left = new TreeNode { Value = 1 } } })));
"""),
            new BasicExerciseHarness("binary-tree-breadth-first-search", """
        TreeNode BuildTree()
        {
            return new TreeNode
            {
                Value = 1,
                Left = new TreeNode
                {
                    Value = 2,
                    Left = new TreeNode { Value = 4 },
                    Right = new TreeNode { Value = 5 }
                },
                Right = new TreeNode
                {
                    Value = 3,
                    Right = new TreeNode { Value = 6 }
                }
            };
        }

        results.Add(RunConsoleLines("balanced tree", ["level 0: ", "1", "", "level 1: ", "2", "3", "", "level 2: ", "4", "5", "6"], () => Solution.BfsTraversal(BuildTree())));
        results.Add(RunConsoleLines("empty tree", [], () => Solution.BfsTraversal(null)));
        results.Add(RunConsoleLines("single node", ["level 0: ", "7"], () => Solution.BfsTraversal(new TreeNode { Value = 7 })));
        results.Add(RunConsoleLines("left chain", ["level 0: ", "3", "", "level 1: ", "2", "", "level 2: ", "1"], () => Solution.BfsTraversal(new TreeNode { Value = 3, Left = new TreeNode { Value = 2, Left = new TreeNode { Value = 1 } } })));
""")
        ];
    }
}
