package ui

import "github.com/charmbracelet/lipgloss"

// ── Colour palette ─────────────────────────────────────────────────────────────
var (
	ColorCyan    = lipgloss.Color("#00D9FF")
	ColorGreen   = lipgloss.Color("#39FF14")
	ColorYellow  = lipgloss.Color("#FFD60A")
	ColorMagenta = lipgloss.Color("#FF2D78")
	ColorGray    = lipgloss.Color("#888888")
	ColorDimGray = lipgloss.Color("#555555")
	ColorWhite   = lipgloss.Color("#FFFFFF")
	ColorBlack   = lipgloss.Color("#000000")
	ColorRed     = lipgloss.Color("#FF4444")
	ColorBgDark  = lipgloss.Color("#0D0D0D")
)

// ── Header ─────────────────────────────────────────────────────────────────────
var HeaderStyle = lipgloss.NewStyle().
	BorderStyle(lipgloss.NormalBorder()).
	BorderForeground(ColorCyan).
	BorderBottom(true).
	PaddingLeft(2).
	PaddingRight(2)

var HeaderBrandStyle = lipgloss.NewStyle().
	Foreground(ColorCyan).
	Bold(true)

var HeaderDimStyle = lipgloss.NewStyle().
	Foreground(ColorDimGray)

var HeaderSessionStyle = lipgloss.NewStyle().
	Foreground(ColorWhite)

// ── Footer ─────────────────────────────────────────────────────────────────────
var FooterBoxStyle = lipgloss.NewStyle().
	BorderStyle(lipgloss.RoundedBorder()).
	BorderForeground(ColorCyan).
	PaddingLeft(1).
	PaddingRight(1).
	MarginLeft(1).
	MarginRight(1)

var FooterBoxLoadingStyle = lipgloss.NewStyle().
	BorderStyle(lipgloss.RoundedBorder()).
	BorderForeground(ColorGray).
	PaddingLeft(1).
	PaddingRight(1).
	MarginLeft(1).
	MarginRight(1)

var FooterPromptStyle = lipgloss.NewStyle().
	Foreground(ColorCyan).
	Bold(true)

var FooterPromptLoadingStyle = lipgloss.NewStyle().
	Foreground(ColorGray).
	Bold(true)

var FooterHintStyle = lipgloss.NewStyle().
	Foreground(ColorDimGray).
	PaddingLeft(3)

var FooterCursorStyle = lipgloss.NewStyle().
	Foreground(ColorCyan)

var FooterInputStyle = lipgloss.NewStyle().
	Foreground(ColorWhite)

// ── Chat messages ──────────────────────────────────────────────────────────────
var UserBubbleStyle = lipgloss.NewStyle().
	Background(ColorCyan).
	Foreground(ColorBlack).
	Bold(true).
	PaddingLeft(2).
	PaddingRight(2).
	PaddingTop(0).
	PaddingBottom(0).
	MarginBottom(1)

var AssistantStyle = lipgloss.NewStyle().
	Foreground(ColorWhite).
	PaddingLeft(1).
	MarginBottom(1)

var AssistantLabelStyle = lipgloss.NewStyle().
	Foreground(ColorGray).
	PaddingLeft(1)

var TerminalBoxStyle = lipgloss.NewStyle().
	BorderStyle(lipgloss.RoundedBorder()).
	BorderForeground(ColorGray).
	PaddingLeft(1).
	PaddingRight(1).
	MarginLeft(2).
	MarginBottom(1)

var TerminalLabelStyle = lipgloss.NewStyle().
	Foreground(ColorDimGray).
	Bold(true)

var TerminalOutputStyle = lipgloss.NewStyle().
	Foreground(ColorGray)

var SystemMsgStyle = lipgloss.NewStyle().
	Foreground(ColorYellow).
	Italic(true).
	PaddingLeft(2).
	MarginBottom(1)

var ErrorMsgStyle = lipgloss.NewStyle().
	Foreground(ColorRed).
	PaddingLeft(2).
	MarginBottom(1)

var ThinkingBoxStyle = lipgloss.NewStyle().
	BorderStyle(lipgloss.NormalBorder()).
	BorderForeground(ColorGray).
	Foreground(ColorGray).
	Italic(true).
	PaddingLeft(1).
	MarginBottom(1)

// ── Modal overlays ─────────────────────────────────────────────────────────────
var ModalStyle = lipgloss.NewStyle().
	BorderStyle(lipgloss.DoubleBorder()).
	BorderForeground(ColorYellow).
	Background(ColorBgDark).
	PaddingLeft(3).
	PaddingRight(3).
	PaddingTop(1).
	PaddingBottom(1)

var ModalSessionsStyle = lipgloss.NewStyle().
	BorderStyle(lipgloss.DoubleBorder()).
	BorderForeground(ColorCyan).
	Background(ColorBgDark).
	PaddingLeft(2).
	PaddingRight(2).
	PaddingTop(1).
	PaddingBottom(1)

var ModalTitleStyle = lipgloss.NewStyle().
	Foreground(ColorYellow).
	Bold(true).
	MarginBottom(1)

var ModalSessionsTitleStyle = lipgloss.NewStyle().
	Foreground(ColorCyan).
	Bold(true).
	MarginBottom(1)

var ModalHintStyle = lipgloss.NewStyle().
	Foreground(ColorDimGray).
	MarginTop(1)

var ModalDividerStyle = lipgloss.NewStyle().
	Foreground(ColorDimGray)

// ── Session list items ─────────────────────────────────────────────────────────
var SessionActiveStyle = lipgloss.NewStyle().
	BorderStyle(lipgloss.RoundedBorder()).
	BorderForeground(ColorCyan).
	PaddingLeft(1).
	PaddingRight(1).
	MarginBottom(1)

var SessionInactiveStyle = lipgloss.NewStyle().
	PaddingLeft(1).
	PaddingRight(1).
	MarginBottom(1)

var SessionNameActiveStyle = lipgloss.NewStyle().
	Foreground(ColorWhite).
	Bold(true)

var SessionNameInactiveStyle = lipgloss.NewStyle().
	Foreground(ColorGray)

var SessionSummaryStyle = lipgloss.NewStyle().
	Foreground(ColorDimGray)

var SessionTimeStyle = lipgloss.NewStyle().
	Foreground(ColorDimGray)

var SessionCursorActive = lipgloss.NewStyle().
	Foreground(ColorCyan)

var NewSessionActiveStyle = lipgloss.NewStyle().
	BorderStyle(lipgloss.RoundedBorder()).
	BorderForeground(ColorGreen).
	PaddingLeft(1).
	PaddingRight(1).
	MarginBottom(1)

var NewSessionInactiveStyle = lipgloss.NewStyle().
	PaddingLeft(1).
	PaddingRight(1).
	MarginBottom(1)

var NewSessionTextActive = lipgloss.NewStyle().
	Foreground(ColorGreen).
	Bold(true)

var NewSessionTextInactive = lipgloss.NewStyle().
	Foreground(ColorGray)

// ── Spinner ────────────────────────────────────────────────────────────────────
var SpinnerStyle = lipgloss.NewStyle().
	Foreground(ColorMagenta).
	PaddingLeft(2)

var SpinnerTextStyle = lipgloss.NewStyle().
	Foreground(ColorYellow).
	PaddingLeft(1)

// ── Welcome screen ─────────────────────────────────────────────────────────────
var WelcomeBannerStyle = lipgloss.NewStyle().
	BorderStyle(lipgloss.RoundedBorder()).
	BorderForeground(ColorGreen).
	Foreground(ColorGreen).
	PaddingLeft(4).
	PaddingRight(4).
	PaddingTop(1).
	PaddingBottom(1).
	AlignHorizontal(lipgloss.Center)

var WelcomeSubtitleStyle = lipgloss.NewStyle().
	Foreground(ColorDimGray)

var WelcomeCyanStyle = lipgloss.NewStyle().
	Foreground(ColorCyan)

var WelcomeInputBoxStyle = lipgloss.NewStyle().
	BorderStyle(lipgloss.RoundedBorder()).
	BorderForeground(ColorCyan).
	PaddingLeft(2).
	PaddingRight(2).
	PaddingTop(1).
	PaddingBottom(1)

var WelcomeHintStyle = lipgloss.NewStyle().
	Foreground(ColorDimGray).
	PaddingLeft(3)
