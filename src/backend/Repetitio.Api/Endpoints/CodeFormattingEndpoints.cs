using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace Repetitio.Api.Endpoints;

public static class CodeFormattingEndpoints
{
    public static IEndpointRouteBuilder MapCodeFormattingEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/code/format-csharp", FormatCSharp).WithTags("Code");
        return app;
    }

    // Formatting only parses syntax. It never compiles, runs, or persists submitted code.
    public static IResult FormatCSharp(FormatCodeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.SourceCode)) return Results.Ok(new FormatCodeResponse(request.SourceCode ?? ""));
        var options = CSharpParseOptions.Default.WithLanguageVersion(LanguageVersion.Preview);
        SyntaxNode original = CSharpSyntaxTree.ParseText(request.SourceCode, options).GetRoot();
        if (original.ContainsDiagnostics)
        {
            var member = SyntaxFactory.ParseMemberDeclaration(request.SourceCode, options: options);
            if (member is null || member.ContainsDiagnostics)
                return Results.BadRequest("Fix the C# syntax errors before formatting. Your code has not been changed.");
            original = member;
        }
        var formatted = original.NormalizeWhitespace(indentation: "    ", eol: "\n").ToFullString();
        SyntaxNode reparsed = original is Microsoft.CodeAnalysis.CSharp.Syntax.CompilationUnitSyntax
            ? CSharpSyntaxTree.ParseText(formatted, options).GetRoot()
            : SyntaxFactory.ParseMemberDeclaration(formatted, options: options)!;
        if (reparsed.ContainsDiagnostics || !original.DescendantTokens().Select(token => (token.RawKind, token.ValueText))
                .SequenceEqual(reparsed.DescendantTokens().Select(token => (token.RawKind, token.ValueText))))
            return Results.BadRequest("Formatting could change the code's tokens. Your original code has been retained.");
        return Results.Ok(new FormatCodeResponse(formatted));
    }
}

public sealed record FormatCodeRequest(string SourceCode);
public sealed record FormatCodeResponse(string SourceCode);
