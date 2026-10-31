using Microsoft.AspNetCore.Http;
using Repetitio.Api.Endpoints;

namespace Repetitio.UnitTests.Basics;

public sealed class CodeFormattingTests
{
    [Theory]
    [InlineData("public class Test{public int Sum(int a,int b){return a+b;}}", "return a + b;")]
    [InlineData("public int Sum(int a,int b){return a+b;}", "return a + b;")]
    [InlineData("class Test{string text=\"{ not code }\"; // retain comment\n}", "// retain comment")]
    [InlineData("class Test{string text=$\"value: {1+2}\";}", "value:")]
    [InlineData("class Test{string text=@\"first\nsecond\";}", "first\nsecond")]
    [InlineData("class Test{string text=\"\"\"\n    hello\n    world\n    \"\"\";}", "hello")]
    public void FormattingRetainsSyntaxTokensCommentsAndLiteralValues(string source, string expected)
    {
        var result = CodeFormattingEndpoints.FormatCSharp(new(source));
        Assert.Equal(200, ((IStatusCodeHttpResult)result).StatusCode);
        var formatted = Assert.IsType<FormatCodeResponse>(((IValueHttpResult)result).Value).SourceCode;
        Assert.Contains(expected, formatted);
        Assert.Contains("\n", formatted);
    }

    [Fact]
    public void IncompleteSyntaxIsRejectedRatherThanSilentlyRewritten()
    {
        var result = CodeFormattingEndpoints.FormatCSharp(new("class Test{ public int Sum("));
        Assert.Equal(400, ((IStatusCodeHttpResult)result).StatusCode);
        Assert.Contains("not been changed", Assert.IsType<string>(((IValueHttpResult)result).Value));
    }
}
