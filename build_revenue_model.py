from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = Workbook()

BLUE = Font(color="0000FF")
BOLD = Font(bold=True)
HEAD = Font(bold=True, color="FFFFFF")
HEAD_FILL = PatternFill("solid", fgColor="1F2937")
INPUT_FILL = PatternFill("solid", fgColor="FFF7E0")
TOTAL_TOP = Border(top=Side(style="thin"))
GBP = '£#,##0.00;[Red]-£#,##0.00'
GBP0 = '£#,##0;[Red]-£#,##0'
GBP3 = '£#,##0.000'
PCT = '0.0%'
NUM = '#,##0'
GREY = Font(italic=True, color="6B7280")

# ---------- Assumptions ----------
a = wb.active
a.title = "Assumptions"
a["A1"] = "Assumptions"
a["A1"].font = Font(bold=True, size=14)
a["A2"] = "Blue cells on a yellow background are inputs. Change them and every sheet updates."
a["A2"].font = GREY

rows = [
    (4, "Share of account holders who pay", 0.15, PCT, "Assumption. Replace with your real conversion rate."),
    (5, "Paying mix: Standard", 0.50, PCT, "Share of paying users on each tier. Must add to 100%."),
    (6, "Paying mix: Premium", 0.30, PCT, ""),
    (7, "Paying mix: Business", 0.15, PCT, ""),
    (8, "Paying mix: Corporate", 0.05, PCT, ""),
    (9, "Standard price a month (ex VAT)", 29.99, GBP, "Current prices, which exclude VAT."),
    (10, "Premium price a month (ex VAT)", 44.99, GBP, ""),
    (11, "Business price a month (ex VAT)", 59.99, GBP, ""),
    (12, "Corporate price a month (ex VAT)", 179.99, GBP, ""),
    (13, "Are prices shown including VAT? (Yes / No)", "No", None, "Currently No. Set to Yes once VAT is added at £90k."),
    (14, "VAT rate", 0.20, PCT, "UK standard rate."),
    (15, "Stripe fee as a share of payments", 0.015, PCT, "Assumes UK standard card rate. Check Stripe's current rate."),
    (16, "Stripe fixed fee per payment", 0.20, GBP, "Assumes UK standard card rate. Check Stripe's current rate."),
    (17, "AI cost per chatbot message", 0.015, GBP3, "Midpoint of £0.01 to £0.02 per message."),
    (18, "Share of free users who use the chatbot", 0.10, PCT, "Assumption."),
    (19, "Chatbot messages a day: active free user", 5, NUM, "Assumption. The free limit is 10 a day."),
    (20, "Chatbot messages a day: paying user", 15, NUM, "Typical use. Plan limits are Standard 30, Premium 50, Business 60, Corporate 150."),
    (21, "Website changes a month: paying user", 10, NUM, "Typical use. Plan limits are Standard 20, Premium 40, Business 60, Corporate 150."),
    (22, "AI cost per website change", 0.175, GBP3, "Midpoint of £0.15 to £0.20. A change regenerates the page, so it costs about ten chat messages."),
    (23, "Logo generations a month: paying user", 1, NUM, "Assumption."),
    (24, "AI cost per logo generation", 0.05, GBP3, "From your cost figures."),
    (25, "New websites a month: paying user", 1, NUM, "Assumption. Corporate can run up to five sites."),
    (26, "AI cost per new website", 0.12, GBP3, "From your cost figures."),
]
a["A3"], a["B3"], a["C3"] = "Input", "Value", "Note"
for c in ("A3", "B3", "C3"):
    a[c].font = HEAD
    a[c].fill = HEAD_FILL
for r, label, value, fmt, note in rows:
    a[f"A{r}"] = label
    a[f"B{r}"] = value
    a[f"B{r}"].font = BLUE
    a[f"B{r}"].fill = INPUT_FILL
    if fmt:
        a[f"B{r}"].number_format = fmt
    a[f"C{r}"] = note
    a[f"C{r}"].font = GREY

a["A28"] = "Check: paying mix adds to"
a["A28"].font = BOLD
a["B28"] = "=SUM(B5:B8)"
a["B28"].number_format = PCT
a["C28"] = '=IF(ROUND(B28,4)=1,"OK","Mix must add to 100%")'

a.column_dimensions["A"].width = 46
a.column_dimensions["B"].width = 14
a.column_dimensions["C"].width = 90

# ---------- Plan economics ----------
p = wb.create_sheet("Plan economics")
p["A1"] = "Margin per plan per month"
p["A1"].font = Font(bold=True, size=14)
p["A2"] = "Caps are the daily chat and monthly website-change limits set in the code. Blue cells are inputs."
p["A2"].font = GREY

heads = ["Plan", "Price (ex VAT)", "Stripe fee", "Chat cap a day", "Website changes cap a month",
         "AI cost at cap", "Margin at cap", "AI cost, typical use", "Margin, typical use"]
for i, h in enumerate(heads, start=1):
    c = p.cell(row=4, column=i, value=h)
    c.font = HEAD
    c.fill = HEAD_FILL
    c.alignment = Alignment(wrap_text=True, vertical="center")
p.row_dimensions[4].height = 32

plans = [
    ("Standard", "=Assumptions!B9", 30, 20),
    ("Premium", "=Assumptions!B10", 50, 40),
    ("Business", "=Assumptions!B11", 60, 60),
    ("Corporate", "=Assumptions!B12", 150, 150),
]
for i, (name, price, chat_cap, change_cap) in enumerate(plans, start=5):
    p[f"A{i}"] = name
    p[f"B{i}"] = price
    p[f"C{i}"] = f"=B{i}*Assumptions!$B$15+Assumptions!$B$16"
    p[f"D{i}"] = chat_cap
    p[f"E{i}"] = change_cap
    for col in ("D", "E"):
        p[f"{col}{i}"].font = BLUE
        p[f"{col}{i}"].fill = INPUT_FILL
        p[f"{col}{i}"].number_format = NUM
    # At cap: every day's chat limit and every monthly change used, plus one logo and one new site.
    p[f"F{i}"] = (f"=D{i}*30*Assumptions!$B$17+E{i}*Assumptions!$B$22"
                  f"+Assumptions!$B$23*Assumptions!$B$24+Assumptions!$B$25*Assumptions!$B$26")
    p[f"G{i}"] = f"=(B{i}-C{i}-F{i})/B{i}"
    # Typical: the typical use inputs on the Assumptions sheet.
    p[f"H{i}"] = ("=Assumptions!$B$20*30*Assumptions!$B$17+Assumptions!$B$21*Assumptions!$B$22"
                  "+Assumptions!$B$23*Assumptions!$B$24+Assumptions!$B$25*Assumptions!$B$26")
    p[f"I{i}"] = f"=(B{i}-C{i}-H{i})/B{i}"
    for col in ("B", "C", "F", "H"):
        p[f"{col}{i}"].number_format = GBP
    for col in ("G", "I"):
        p[f"{col}{i}"].number_format = PCT

p["A10"] = "Free plan (no revenue)"
p["A10"].font = BOLD
p["A11"] = "Chat cap a day"
p["D11"] = 10
p["A12"] = "Website changes cap a month"
p["E12"] = 5
p["A13"] = "AI cost at cap, a month"
p["F13"] = "=D11*30*Assumptions!$B$17+E12*Assumptions!$B$22"
p["F13"].number_format = GBP
for cell in ("D11", "E12"):
    p[cell].font = BLUE
    p[cell].fill = INPUT_FILL

p["A15"] = ("Corporate can run up to five websites, so its typical and cap figures understate the build cost "
            "by about four new sites a month. Hosting, email and support are not included.")
p["A15"].font = GREY
p.column_dimensions["A"].width = 24
for col in "BCDEFGHI":
    p.column_dimensions[col].width = 16

# ---------- Scenarios ----------
s = wb.create_sheet("Scenarios")
s["A1"] = "Monthly revenue and costs by number of account holders"
s["A1"].font = Font(bold=True, size=14)
s["A2"] = "Each column is one scenario. Figures are per month unless stated. Typical use, not the caps."
s["A2"].font = GREY

users = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000]
cols = [get_column_letter(i) for i in range(2, 2 + len(users))]

lines = [
    (5, "Paying users", "={c}4*Assumptions!$B$4", NUM, False),
    (6, "  Standard", "={c}5*Assumptions!$B$5", NUM, False),
    (7, "  Premium", "={c}5*Assumptions!$B$6", NUM, False),
    (8, "  Business", "={c}5*Assumptions!$B$7", NUM, False),
    (9, "  Corporate", "={c}5*Assumptions!$B$8", NUM, False),
    (10, "Free users", "={c}4-{c}5", NUM, False),

    (12, "Revenue: Standard", "={c}6*Assumptions!$B$9", GBP0, False),
    (13, "Revenue: Premium", "={c}7*Assumptions!$B$10", GBP0, False),
    (14, "Revenue: Business", "={c}8*Assumptions!$B$11", GBP0, False),
    (15, "Revenue: Corporate", "={c}9*Assumptions!$B$12", GBP0, False),
    (16, "Total billed", "=SUM({c}12:{c}15)", GBP0, True),
    (17, "VAT taken out", '=IF(Assumptions!$B$13="Yes",{c}16*Assumptions!$B$14/(1+Assumptions!$B$14),0)', GBP0, False),
    (18, "Net revenue", "={c}16-{c}17", GBP0, True),

    (20, "Stripe fees", "={c}16*Assumptions!$B$15+{c}5*Assumptions!$B$16", GBP0, False),
    (21, "Chatbot AI cost", "=({c}10*Assumptions!$B$18*Assumptions!$B$19+{c}5*Assumptions!$B$20)*30*Assumptions!$B$17", GBP0, False),
    (22, "Website change AI cost", "={c}5*Assumptions!$B$21*Assumptions!$B$22", GBP0, False),
    (23, "Logo and website build AI cost", "={c}5*(Assumptions!$B$23*Assumptions!$B$24+Assumptions!$B$25*Assumptions!$B$26)", GBP0, False),
    (24, "Total variable costs", "=SUM({c}20:{c}23)", GBP0, True),
    (25, "Left after variable costs", "={c}18-{c}24", GBP0, True),
    (26, "Margin after variable costs", "=IF({c}18=0,0,{c}25/{c}18)", PCT, False),

    (28, "Annual net revenue", "={c}18*12", GBP0, False),
    (29, "Net revenue per account holder a month", "={c}18/{c}4", GBP, False),
]

s["A3"] = "Scenario"
s["A3"].font = HEAD
s["A3"].fill = HEAD_FILL
s["A4"] = "Monthly account holders"
s["A4"].font = BOLD
for col, n in zip(cols, users):
    s[f"{col}3"] = f"{n:,} users"
    s[f"{col}3"].font = HEAD
    s[f"{col}3"].fill = HEAD_FILL
    s[f"{col}3"].alignment = Alignment(horizontal="right")
    s[f"{col}4"] = n
    s[f"{col}4"].font = BLUE
    s[f"{col}4"].fill = INPUT_FILL
    s[f"{col}4"].number_format = NUM

for row, label, template, fmt, bold in lines:
    s[f"A{row}"] = label
    if bold:
        s[f"A{row}"].font = BOLD
    for col in cols:
        cell = s[f"{col}{row}"]
        cell.value = template.format(c=col)
        cell.number_format = fmt
        if bold:
            cell.font = BOLD
            cell.border = TOTAL_TOP

s["A31"] = "Hosting, email (Migadu), Railway, domains, support, staff, marketing and refunds are not included."
s["A31"].font = GREY

s.column_dimensions["A"].width = 38
for col in cols:
    s.column_dimensions[col].width = 15
s.freeze_panes = "B5"

# ---------- Notes ----------
n = wb.create_sheet("Notes")
notes = [
    ("How to use this model", True),
    ("1. Change the blue inputs on Assumptions, Plan economics and the scenario user counts. Everything else recalculates.", False),
    ("", False),
    ("What is included", True),
    ("- Plan prices (ex VAT), Stripe card fees, and AI costs for chat, website changes, logos and new websites.", False),
    ("- Margin at cap uses the daily chat limits and monthly website-change limits set in the code.", False),
    ("- Margin at typical use uses the typical-use inputs on Assumptions.", False),
    ("", False),
    ("What is not included", True),
    ("- Hosting, Railway, Cloudflare, Migadu mailboxes, domains, support, staff, marketing, refunds, failed payments and churn.", False),
    ("- VAT is off until the prices include it. Turning it on takes VAT out of revenue, so the net figures stay the same.", False),
    ("", False),
    ("Assumptions to check first", True),
    ("- The paying share (15%) and the tier mix are guesses. Replace them with real figures as they come in.", False),
    ("- Typical use (15 chats a day, 10 website changes a month) is an assumption. Check it against the usage logs after launch.", False),
    ("- Stripe fees assume the UK standard card rate. Check Stripe's current rate.", False),
]
for i, (text, bold) in enumerate(notes, start=1):
    n[f"A{i}"] = text
    if bold:
        n[f"A{i}"].font = BOLD
n.column_dimensions["A"].width = 110

wb.save("venture-pro-revenue-model.xlsx")
print("saved venture-pro-revenue-model.xlsx")
