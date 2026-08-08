# FlowStock — Quick start

Thanks for your purchase. This takes five minutes, and then you're running.

## 1. Open it

Double-click **FlowStock.html**. It opens in your default browser. Nothing is
installed and nothing is uploaded.

Tip: put the file somewhere you'll find it again — your desktop, or a "Bookkeeping"
folder. A browser bookmark to the file works too.

Recommended browsers: a current Chrome, Edge, Firefox or Safari.

## 2. Try it before you trust it

Click **"Explore with demo data"**. FlowStock builds a realistic example shop with
180 days of sales history and twelve products, so you can see what you're getting
before touching your own numbers.

**"New file"** in the top right takes you back at any time.

## 3. Get your sales export

**Etsy:** Shop Manager → Settings → Options → Download Data → "Order Items",
pick the year, download the CSV.

**Shopify:** Analytics → Reports → Sales by product → Export. Or Orders → Export →
"Orders by line item".

**eBay:** Seller Hub → Orders → Download reports.

**Amazon Seller Central:** Reports → Payments → Transaction view, or the order reports.

**Your own shop / WooCommerce:** any export with one row per sold line item.

All that really matters is **one row per sold item**, containing a date and an
amount. Everything else sharpens the analysis but isn't required.

## 4. Load it

Drag the CSV onto the big drop area, or click **"Choose sales file"**.

FlowStock then shows you which column it thinks is which. Give it a quick check —
especially date, revenue and quantity. If something is mapped wrong, change it in
the dropdown beside it. Then hit **"Run the analysis"**.

German numbers (`1.234,56`) and English ones (`1,234.56`) are both recognised, as
are dates with dots, dashes or slashes, and currency symbols.

## 5. Add your stock list (recommended)

Without stock data FlowStock knows your revenue but not your replenishment, and the
restock plan stays empty.

Build a small table in Excel, Numbers or LibreOffice and save it as CSV. It only
needs these columns:

| SKU | Product | Stock | Unit cost | Lead time | MOQ | Supplier |
|---|---|---|---|---|---|---|
| KER-001 | Ceramic Mug Sand | 42 | 7.20 | 21 | 20 | Pottery Studio |

Only **SKU** and **Stock** are required. The SKU has to match the one in your sales
export — otherwise FlowStock can't connect the two.

There's a ready-made example in the `samples` folder to copy from.

If a product has no lead time, FlowStock falls back to the default in Settings.

## 6. Fill in the settings

This is the step that turns statistics into a forecast. Top right, **"Settings"**:

- **Opening balance** — what's actually in the business account today.
- **Fixed costs per month** — rent, tools, subscriptions, insurance. Everything
  that leaves even in a month with no sales.
- **Forecast horizon** — 90 days is a good start.
- **Lead time** — the default for products without their own value.
- **Target cover** — how many days one order should last. 45 days means you order
  less often but tie up more capital.
- **Safety stock** — the buffer for weeks that run hotter than usual.
- **Assumed cost of goods** — only kicks in when your data has no unit cost. Set it
  honestly, or your margin is fiction.

## 7. Reading it

**Projected balance** (the big number): what's left at the end of the horizon,
after every restock that falls due has been paid for.

**Lowest point:** the number that actually matters. If it's negative you have a
problem, however healthy the end figure looks.

**Runway:** days until zero. "beyond 90 days" means there's no hole inside the
horizon.

**Restock plan:** work top to bottom. "Order by" is the last day an order still
arrives in time.

**Product overview:** click a column header to sort. Sort by "Cover" ascending once
— the top rows are your next problems.

A `~` next to gross profit means the unit cost was estimated, not read from your data.

## 8. Taking it further

- **Export CSV** — key figures, history and forecast as a file, e.g. for your accountant.
- **Export plan** — the restock plan, ready to hand to a supplier.
- **Print / PDF** — prints the dashboard cleanly, without the controls.

## 9. If you use it regularly

Switch on **"Keep this dataset in the browser"** in Settings, and everything is
back next time you open the file. The data lives only on your device and can be
deleted again from the same dialog.

A sensible rhythm: pull a fresh export once a week, update your stock numbers,
work through the restock plan.

---

## When something doesn't work

**"No valid rows found"** — nine times out of ten the date column is mapped wrong.
Reload the file and check that the mapping dialog really points at the sale date.

**Revenue looks too high** — you probably have both revenue *and* unit price mapped
while revenue already includes the quantity. Set "Unit price" to "not mapped".

**The restock plan stays empty** — the stock list is missing, or the SKUs don't
match between the two files.

**The margin looks unrealistic** — unit cost is missing. Either add it to the stock
list or adjust the assumed cost of goods in Settings.

**The charts are empty** — the period filter is set to a window with no sales in it.
Set it back to "Whole export".

If you're stuck, message me on Etsy — ideally with the first line of your CSV (the
column names). That's usually enough for me to spot it immediately.
