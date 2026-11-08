from pyflakes.api import check
import ast
import io
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pyflakes.api import check
from pyflakes.reporter import Reporter


app = FastAPI(
    title="CodeGuardian API",
    description="Static code analysis and beginner-friendly code review.",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CodeRequest(BaseModel):
    code: str
    language: str = "python"


class Finding(BaseModel):
    type: str
    title: str
    message: str
    line: int
    suggestion: str


def add_finding(
    findings: list[dict[str, Any]],
    issue_type: str,
    title: str,
    message: str,
    line: int,
    suggestion: str,
):
    findings.append({
        "type": issue_type,
        "title": title,
        "message": message,
        "line": max(1, line),
        "suggestion": suggestion,
    })


def find_division_functions(tree: ast.AST) -> dict[str, int]:
    """Find simple functions that divide by one of their parameters."""
    division_functions = {}

    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue

        parameters = node.args.args

        for child in ast.walk(node):
            if not isinstance(child, ast.BinOp):
                continue

            if not isinstance(child.op, (ast.Div, ast.FloorDiv)):
                continue

            if isinstance(child.right, ast.Name):
                for index, parameter in enumerate(parameters):
                    if parameter.arg == child.right.id:
                        division_functions[node.name] = index

    return division_functions


def detect_division_by_zero(
    tree: ast.AST,
    findings: list[dict[str, Any]],
):
    division_functions = find_division_functions(tree)

    for node in ast.walk(tree):
        if not isinstance(node, ast.BinOp):
            continue

        if not isinstance(node.op, (ast.Div, ast.FloorDiv)):
            continue

        if (
            isinstance(node.right, ast.Constant)
            and isinstance(node.right.value, (int, float))
            and node.right.value == 0
        ):
            add_finding(
                findings,
                "error",
                "Division By Zero",
                "This expression divides a value by zero and can raise ZeroDivisionError.",
                node.lineno,
                "Check that the denominator is not zero before performing division. "
                "For example:\n"
                "if denominator == 0:\n"
                '    raise ValueError("Denominator cannot be zero")\n'
                "result = numerator / denominator",
            )

        if not isinstance(node, ast.Call):
            continue

    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue

        if not isinstance(node.func, ast.Name):
            continue

        function_name = node.func.id

        if function_name not in division_functions:
            continue

        denominator_index = division_functions[function_name]

        if denominator_index >= len(node.args):
            continue

        argument = node.args[denominator_index]

        if (
            isinstance(argument, ast.Constant)
            and isinstance(argument.value, (int, float))
            and argument.value == 0
        ):
            add_finding(
                findings,
                "error",
                "Possible Division By Zero",
                f"The function '{function_name}' receives zero as its divisor. "
                "This may cause ZeroDivisionError.",
                node.lineno,
                "Validate the divisor inside the function before dividing. "
                "For example:\n"
                "if b == 0:\n"
                '    raise ValueError("Divisor cannot be zero")\n'
                "return a / b",
            )


def detect_pyflakes_issues(
    code: str,
    findings: list[dict[str, Any]],
):
    output = io.StringIO()
    errors = io.StringIO()

    reporter = Reporter(output, errors)
    check(code, "<submitted-code>", reporter)

    for line in (output.getvalue() + errors.getvalue()).splitlines():
        if ":" not in line:
            continue

        parts = line.split(":", 3)

        if len(parts) < 4:
            continue

        try:
            line_number = int(parts[1])
        except ValueError:
            continue

        message = parts[3].strip()

        if "undefined name" in message:
            add_finding(
                findings,
                "error",
                "Undefined Variable",
                message,
                line_number,
                "Make sure the variable is declared or imported before using it. "
                "Check the spelling and capitalization of its name.",
            )

        elif "imported but unused" in message:
            add_finding(
                findings,
                "warning",
                "Unused Import",
                message,
                line_number,
                "Remove the import if it is not needed. If you intended to use it, "
                "check whether the imported name is referenced in your code.",
            )


def detect_python_issues(
    code: str,
    tree: ast.AST,
    findings: list[dict[str, Any]],
):
    lines = code.splitlines()

    detect_division_by_zero(tree, findings)

    for line_number, line in enumerate(lines, start=1):
        stripped = line.strip()

        if "TODO" in stripped or "FIXME" in stripped:
            add_finding(
                findings,
                "info",
                "Pending Task",
                "This line contains a TODO or FIXME comment.",
                line_number,
                "Review this task and complete it before considering the code finished.",
            )

        if len(line) > 100:
            add_finding(
                findings,
                "info",
                "Long Line",
                f"This line contains {len(line)} characters.",
                line_number,
                "Consider splitting this line into smaller expressions or "
                "using intermediate variables to improve readability.",
            )

    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue

        if not isinstance(node.func, ast.Name):
            continue

        if node.func.id == "eval":
            add_finding(
                findings,
                "warning",
                "Use of eval()",
                "eval() executes dynamically supplied Python expressions and can "
                "create security risks with untrusted input.",
                node.lineno,
                "Avoid eval() with untrusted input. If you only need to parse "
                "Python literal values, consider ast.literal_eval() instead.",
            )

        elif node.func.id == "exec":
            add_finding(
                findings,
                "warning",
                "Use of exec()",
                "exec() executes dynamically supplied Python code and can create "
                "serious security risks.",
                node.lineno,
                "Avoid executing untrusted strings as code. Use explicit functions "
                "or a controlled mapping of permitted operations instead.",
            )

        elif node.func.id == "print":
            add_finding(
                findings,
                "info",
                "Debug Output",
                "Check whether this print statement is needed in your final application.",
                node.lineno,
                "Remove temporary print statements from production code, or use "
                "Python's logging module when you need application logs.",
            )


@app.get("/")
def root():
    return {
        "success": True,
        "message": "Welcome to CodeGuardian API",
    }


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "app": "CodeGuardian",
        "ai_configured": False,
    }


@app.post("/api/review")
def review_code(request: CodeRequest):
    if request.language.lower() != "python":
        return {
            "success": False,
            "language": request.language,
            "score": 0,
            "total_issues": 0,
            "findings": [],
            "summary": "Currently, CodeGuardian supports Python code analysis only.",
        }

    code = request.code
    findings: list[dict[str, Any]] = []

    try:
        tree = ast.parse(code)
    except SyntaxError as error:
        add_finding(
            findings,
            "error",
            "Syntax Error",
            error.msg,
            error.lineno or 1,
            "Check the reported line for missing colons, brackets, quotation marks, "
            "or incorrect indentation. Fix the syntax before running the code.",
        )

        return {
            "success": True,
            "language": "python",
            "score": 0,
            "total_issues": len(findings),
            "findings": findings,
            "summary": "Syntax errors were found. Fix them before further analysis.",
        }

    detect_python_issues(code, tree, findings)
    detect_pyflakes_issues(code, findings)

    findings.sort(key=lambda item: (item["line"], item["title"]))

    errors = sum(item["type"] == "error" for item in findings)
    warnings = sum(item["type"] == "warning" for item in findings)
    info = sum(item["type"] == "info" for item in findings)

    score = max(
        0,
        100 - (errors * 25) - (warnings * 15) - (info * 5),
    )

    if not findings:
        summary = "Great work! No issues were detected by the current static checks."
    else:
        summary = (
            f"Review completed. Found {len(findings)} potential issue(s): "
            f"{errors} error(s), {warnings} warning(s), and {info} improvement(s)."
        )

    return {
        "success": True,
        "language": "python",
        "score": score,
        "total_issues": len(findings),
        "findings": findings,
        "summary": summary,
    }
