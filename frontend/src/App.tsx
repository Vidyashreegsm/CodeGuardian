
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  LayoutDashboard,
  Code2,
  History,
  Settings,
  CircleHelp,
  Search,
  Bell,
  ChevronDown,
  Play,
  Upload,
  Copy,
  RotateCcw,
  Sparkles,
  Bug,
  CheckCircle2,
  Zap,
  FileCode2,
  Menu,
  X,
} from "lucide-react";
import "./App.css";

const initialCode = `def divide(a, b):
    return a / b

def calculate_average(numbers):
    total = sum(numbers)
    return total / len(numbers)

result = divide(10, 0)
print(result)`;

type Finding = {
  type: string;
  title: string;
  message: string;
  line: number;
  suggestion?: string;
};

type ReviewResult = {
  success: boolean;
  language: string;
  score: number;
  total_issues: number;
  findings: Finding[];
  summary: string;
};

function App() {
  const [code, setCode] = useState(initialCode);
  const [activePage, setActivePage] = useState("Dashboard");
  const [apiStatus, setApiStatus] = useState("Checking...");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const [reviewResult, setReviewResult] =
    useState<ReviewResult | null>(null);

  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [copiedFixIndex, setCopiedFixIndex] = useState<number | null>(null);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/api/health"
        );

        if (!response.ok) {
          throw new Error("Backend unavailable");
        }

        const data = await response.json();

        setApiStatus(
          data.status === "healthy" ? "Connected" : "Offline"
        );
      } catch {
        setApiStatus("Offline");
      }
    };

    checkBackend();
  }, []);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const copyFix = async (suggestion: string, index: number) => {
    try {
      await navigator.clipboard.writeText(suggestion);
      setCopiedFixIndex(index);
      window.setTimeout(() => {
        setCopiedFixIndex((current) =>
          current === index ? null : current
        );
      }, 2000);
    } catch {
      setReviewError(
        "Unable to copy the suggestion. Please check clipboard permissions."
      );
    }
  };

  const resetCode = () => {
    setCode(initialCode);
    setReviewResult(null);
    setReviewError("");
    setCopiedFixIndex(null);
  };

  const analyzeCode = async () => {
    if (!code.trim() || isReviewing) {
      return;
    }

    setIsReviewing(true);
    setReviewError("");
    setReviewResult(null);
    setCopiedFixIndex(null);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/review",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
            language: "python",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Code review failed."
        );
      }

      setReviewResult(data);
      setActivePage("Code Review");
    } catch (error) {
      setReviewError(
        error instanceof Error
          ? error.message
          : "Unable to connect to CodeGuardian backend."
      );
    } finally {
      setIsReviewing(false);
    }
  };

  const navigation = [
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "Code Review", icon: Code2 },
    { name: "Review History", icon: History },
  ];

  return (
    <div className="app-shell">
      {mobileMenu && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <aside
        className={`sidebar ${
          mobileMenu ? "sidebar-open" : ""
        }`}
      >
        <div className="brand">
          <div className="brand-icon">
            <ShieldCheck size={23} />
          </div>

          <div>
            <h2>CodeGuardian</h2>
            <span>YOUR AI CODING MENTOR</span>
          </div>

          <button
            className="mobile-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>

        <div className="workspace-switch">
          <div className="workspace-avatar">CG</div>

          <div className="workspace-info">
            <strong>My Workspace</strong>
            <span>Personal account</span>
          </div>

          <ChevronDown size={16} />
        </div>

        <div className="nav-section">
          <p className="nav-label">WORKSPACE</p>

          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={`nav-item ${
                  activePage === item.name ? "active" : ""
                }`}
                onClick={() => {
                  setActivePage(item.name);
                  setMobileMenu(false);
                }}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>

        <div className="nav-section">
          <p className="nav-label">PREFERENCES</p>

          <button
            className="nav-item"
            onClick={() => setActivePage("Settings")}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>

          <button
            className="nav-item"
            onClick={() => setActivePage("Help")}
          >
            <CircleHelp size={18} />
            <span>Help & Support</span>
          </button>
        </div>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-icon">
              <Sparkles size={18} />
            </div>

            <strong>Your coding journey</strong>

            <p>
              Write better code. Understand every mistake.
              Keep improving.
            </p>
          </div>

          <div className="profile">
            <div className="profile-avatar">V</div>

            <div className="profile-info">
              <strong>Developer</strong>
              <span>Free workspace</span>
            </div>

            <Settings size={17} />
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu-button"
              onClick={() => setMobileMenu(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            <div className="breadcrumb">
              <span>Workspace</span>
              <span className="breadcrumb-separator">/</span>
              <strong>{activePage}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <div
              className={`api-status ${
                apiStatus === "Connected"
                  ? "online"
                  : apiStatus === "Offline"
                  ? "offline"
                  : ""
              }`}
            >
              <span className="status-dot" />
              API {apiStatus}
            </div>

            <button className="icon-button" aria-label="Search">
              <Search size={19} />
            </button>

            <button
              className="icon-button notification-button"
              aria-label="Notifications"
            >
              <Bell size={19} />
              <span />
            </button>

            <div className="topbar-divider" />

            <div className="topbar-user">
              <div className="profile-avatar small">V</div>
              <ChevronDown size={15} />
            </div>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-section">
            <div>
              <div className="eyebrow">
                <Sparkles size={14} />
                YOUR PERSONAL AI CODING MENTOR
              </div>

              <h1>
                Code smarter.
                <span> Build better.</span>
              </h1>

              <p>
                Analyze your code, discover issues, and become
                a better developer with CodeGuardian.
              </p>
            </div>

            <div className="welcome-decoration">
              <div className="decoration-circle">
                <ShieldCheck size={46} />
              </div>
            </div>
          </section>

          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-top">
                <span>Code Quality</span>
                <div className="stat-icon purple">
                  <Zap size={18} />
                </div>
              </div>

              <h2>
                {reviewResult ? reviewResult.score : "--"}
                <small>/ 100</small>
              </h2>

              <p>
                {reviewResult
                  ? "Latest review score"
                  : "Waiting for your first review"}
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span>Issues Detected</span>
                <div className="stat-icon orange">
                  <Bug size={18} />
                </div>
              </div>

              <h2>
                {reviewResult
                  ? reviewResult.total_issues
                  : "--"}
              </h2>

              <p>
                {reviewResult
                  ? "Findings in latest review"
                  : "Run an analysis to get started"}
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span>Code Improvements</span>
                <div className="stat-icon green">
                  <CheckCircle2 size={18} />
                </div>
              </div>

              <h2>
                {reviewResult
                  ? reviewResult.findings.filter(
                      (finding) => finding.type === "info"
                    ).length
                  : "--"}
              </h2>

              <p>
                {reviewResult
                  ? "Suggestions in latest review"
                  : "Your improvement journey starts here"}
              </p>
            </div>
          </section>

          <section className="editor-section">
            <div className="section-heading">
              <div>
                <h2>Code workspace</h2>
                <p>Write or paste your code to get started.</p>
              </div>

              <div className="file-badge">
                <FileCode2 size={16} />
                main.py
              </div>
            </div>

            <div className="editor-card">
              <div className="editor-toolbar">
                <div className="editor-file">
                  <span className="python-icon">Py</span>
                  <strong>main.py</strong>
                  <span className="unsaved-dot" />
                </div>

                <div className="editor-actions">
                  <span className="language-label">Python</span>

                  <button
                    className="editor-icon-button"
                    onClick={copyCode}
                    title="Copy code"
                  >
                    <Copy size={15} />
                    {copied ? "Copied!" : "Copy"}
                  </button>

                  <button
                    className="editor-icon-button"
                    onClick={resetCode}
                    title="Reset code"
                  >
                    <RotateCcw size={15} />
                    Reset
                  </button>

                  <button
                    className="editor-icon-button"
                    title="File upload coming soon"
                    disabled
                  >
                    <Upload size={15} />
                    Upload
                  </button>
                </div>
              </div>

              <div className="code-editor">
                <div
                  className="line-numbers"
                  aria-hidden="true"
                >
                  {code.split("\n").map((_, index) => (
                    <span key={index}>{index + 1}</span>
                  ))}
                </div>

                <textarea
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value);
                    setReviewResult(null);
                    setReviewError("");
                    setCopiedFixIndex(null);
                  }}
                  spellCheck={false}
                  aria-label="Python code editor"
                  placeholder="Write or paste your Python code here..."
                />
              </div>

              <div className="editor-footer">
                <div className="editor-footer-left">
                  <span className="footer-indicator" />
                  Python source
                  <span className="footer-divider">|</span>
                  {code.split("\n").length} lines
                  <span className="footer-divider">|</span>
                  {code.length} characters
                </div>

                <span>UTF-8</span>
              </div>

              <div className="analyze-footer">
                <div className="analyze-note">
                  <Sparkles size={16} />
                  Code review powered by CodeGuardian API
                </div>

                <button
                  className="analyze-button"
                  onClick={analyzeCode}
                  disabled={!code.trim() || isReviewing}
                >
                  <Play size={16} fill="currentColor" />
                  {isReviewing
                    ? "Analyzing..."
                    : "Analyze Code"}
                </button>
              </div>
            </div>
          </section>

          <section className="review-preview">
            <div className="review-heading">
              <div>
                <h2>Review insights</h2>

                <p>
                  {reviewResult
                    ? reviewResult.summary
                    : "Your code analysis results will appear here."}
                </p>
              </div>

              <span className="preview-badge">
                {reviewResult ? "COMPLETED" : "REVIEW"}
              </span>
            </div>

            {reviewError && (
              <div className="empty-review">
                <div className="empty-review-icon">
                  <Bug size={27} />
                </div>

                <h3>Review failed</h3>
                <p>{reviewError}</p>
              </div>
            )}

            {!reviewResult && !reviewError && (
              <div className="empty-review">
                <div className="empty-review-icon">
                  <Code2 size={27} />
                </div>

                <h3>Ready to review your code?</h3>

                <p>
                  Click Analyze Code to detect potential
                  issues and receive code quality feedback.
                </p>

                <div className="review-features">
                  <span>
                    <Bug size={14} /> Bug detection
                  </span>

                  <span>
                    <Sparkles size={14} /> Code insights
                  </span>

                  <span>
                    <CheckCircle2 size={14} /> Code improvements
                  </span>
                </div>
              </div>
            )}

            {reviewResult && (
              <div className="review-results">
                <div className="review-result-score">
                  <span>Code quality score</span>

                  <strong>
                    {reviewResult.score}
                    <small>/100</small>
                  </strong>
                </div>

                <div className="review-result-count">
                  <span>Total findings</span>
                  <strong>
                    {reviewResult.total_issues}
                  </strong>
                </div>

                {reviewResult.findings.length === 0 ? (
                  <div className="empty-review">
                    <div className="empty-review-icon">
                      <CheckCircle2 size={27} />
                    </div>

                    <h3>No issues detected!</h3>
                    <p>
                      Your code passed the current basic checks.
                    </p>
                  </div>
                ) : (
                  <div className="findings-list">
                    {reviewResult.findings.map(
                      (finding, index) => (
                        <div
                          className="finding-card"
                          key={`${finding.line}-${index}`}
                        >
                          <div className="finding-top">
                            <strong>{finding.title}</strong>

                            <span
                              className={`finding-type ${finding.type}`}
                            >
                              {finding.type.toUpperCase()}
                            </span>
                          </div>

                          <p>{finding.message}</p>

                          <span className="finding-line">
                            Line {finding.line}
                          </span>

                          {finding.suggestion && (
                            <div className="suggestion-box">
                              <div className="suggestion-header">
                                <div>
                                  <Sparkles size={15} />
                                  <strong>Suggested Fix</strong>
                                </div>

                                <button
                                  className="copy-fix-button"
                                  onClick={() =>
                                    copyFix(finding.suggestion!, index)
                                  }
                                >
                                  <Copy size={14} />
                                  {copiedFixIndex === index
                                    ? "Copied!"
                                    : "Copy Fix"}
                                </button>
                              </div>

                              <pre className="suggestion-code">
                                <code>{finding.suggestion}</code>
                              </pre>
                            </div>
                          )}

                          {!finding.suggestion && (
                            <p className="no-suggestion">
                              No automated suggestion is available for this finding.
                            </p>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          <footer className="page-footer">
            <span>© 2026 CodeGuardian</span>
            <span>
              Built for developers, powered by intelligence.
            </span>

            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
