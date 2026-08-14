# NetPlan calculation methodology

This document describes in full how the tool gets from imported data to a
recommendation. Every formula corresponds to the code in `js/sim.js`
(calculation core) and `js/dashboard.js` (aggregation across the network).

*Die deutsche Fassung dieses Dokuments: [`berechnungslogik.md`](berechnungslogik.md).*

**Contents**

1. [The calculation path at a glance](#1-the-calculation-path-at-a-glance)
2. [Step 1: From a data row to a pallet](#2-step-1-from-a-data-row-to-a-pallet)
3. [Step 2: Period length and demand per day](#3-step-2-period-length-and-demand-per-day)
4. [Step 3: Target stock](#4-step-3-target-stock)
5. [Step 4: Distance, transit time, cost](#5-step-4-distance-transit-time-cost)
6. [Step 5: The three sub-scores](#6-step-5-the-three-sub-scores)
7. [Step 6: Weighting and total score](#7-step-6-weighting-and-total-score)
8. [What the weighting actually does – measured](#8-what-the-weighting-actually-does--measured)
9. [Single allocation and splitting](#9-single-allocation-and-splitting)
10. [History, forecast and both combined](#10-history-forecast-and-both-combined)
11. [Limits: time horizon and data volume](#11-limits-time-horizon-and-data-volume)
12. [What the model does not do](#12-what-the-model-does-not-do)

---

## 1. The calculation path at a glance

```
Imported rows
   │  quantity logic (pallets per row)
   ▼
Demand per category and customer region  ──►  demand per day  ──►  target stock
   │                                                                    │
   │  for each DC / region pair:                                        │ occupies positions
   │  distance → transport cost, transit time                           │
   ▼                                                                    ▼
Sub-score transport        Sub-score target coverage        Sub-score capacity
   └──────────────────────────────┬─────────────────────────────────────┘
                    weighted sum → total score per DC
                                  │
                    ranking → recommendation (single or split)
```

The calculation always runs for **one product category** and for the **data
basis** and **period range** selected in the simulation. Allocations already
applied for other categories occupy capacity and therefore influence the result
for the next category.

---

## 2. Step 1: From a data row to a pallet

Capacity is measured in pallet positions, so the tool converts every data row
into pallets. The **first available** figure wins:

```
Pallets = pallet equivalent                    if > 0
        → else pallets                         if > 0
        → else volume ÷ volume per pallet      if > 0
        → else quantity ÷ units per pallet
```

*Why this order:* The pallet equivalent is the most accurate figure in business
terms, because it already reflects packing density and stackability. Deriving
from quantity is the crudest, because it assumes a uniform unit size across the
whole category.

Both conversion factors live under *Data & Import → Quantity logic* and apply
globally. Where categories differ strongly in packing density, pallets should be
supplied in the data rather than derived from quantity.

---

## 3. Step 2: Period length and demand per day

The analysis period is derived from the **periods actually contained** in the
data, not from the number of rows:

```
Period length in days = sum of the days of all distinct periods in the filter
```

Each period counts with its real length: a month with 28 to 31 days, a quarter
with 91.3, a calendar week with 7, a year with 365. Where a period cannot be
resolved, 30.44 days are assumed (an average month).

```
Demand per day = pallets in the period ÷ period length in days
```

*Important:* Demand per day is an **average over the selected period**. Seasonal
peaks are smoothed out by it. To size for the peak, restrict the period range to
the peak months — demand per day then rises, and with it the target stock.

The value can also be set explicitly under *Analysis period (days)*, for example
when the data has gaps.

---

## 4. Step 3: Target stock

Target stock is the **capacity-relevant figure** — it occupies pallet positions:

```
Target stock = demand per day × target coverage × stock safety factor
```

* **Target coverage** in days, set per category or globally
* **Stock safety factor** as an uplift (1.0 = none, 1.1 = 10 % buffer)

Target coverage acts **linearly**: doubling it from 21 to 42 days doubles the
positions required. It is therefore the single strongest lever in the whole
model — stronger than any weighting.

**Example** (demo data, category Refrigeration, forecast over 12 months):

| Figure | Value |
|---|---|
| Pallets in the period | 140,016 |
| Period length | 365 days |
| Demand per day | 383.6 pallets |
| Target coverage | 28 days |
| Target stock | 10,741 positions |

---

## 5. Step 4: Distance, transit time, cost

### Distance

```
Distance = great-circle distance (Haversine) × 1.28
```

The factor 1.28 is a flat detour factor approximating road distance against the
great-circle line. Where a region has no coordinates, the **average known
distance in the network** is substituted and the row is marked “estimated” in
the interface.

### Transport cost

```
Cost per pallet = base cost + cost per km × distance
```

A **region-specific flat rate stored on the DC overrides this calculation
entirely** for that region. This is the recommended route where real freight
rates are available: the distance-based formula is only a stand-in as long as no
tariffs are on file.

```
Total transport cost = Σ (pallets of the region × cost per pallet)
```

### Transit time

```
Transit time = fixed handling time + distance ÷ transport performance per day
```

Defaults: 0.5 days handling and 500 km/day.

### Storage, handling and fixed cost

```
Storage cost  = target stock × cost per position and month × months in the period
Handling cost = pallets in the period × cost per pallet
Fixed cost    = fixed cost per period × number of periods
```

Storage cost is a **stock figure** (it follows target stock), handling cost a
**throughput figure** (it follows volume). This is why a longer target coverage
affects storage cost only, never handling.

Fixed costs feed into the network key figures on the dashboard, **not** into the
site score of an individual category — otherwise the first category allocated
would carry a site's entire fixed cost.

---

## 6. Step 5: The three sub-scores

Each sub-score runs from 0 to 100. All three are shown individually in the
ranking table and in the “Score composition” chart.

### 6.1 Capacity and balance

What matters is utilisation **after** the allocation:

```
Utilisation after = (already occupied + target stock) ÷ capacity
```

“Already occupied” covers the DC's base occupancy plus every allocation already
applied for other categories.

```
Utilisation ≤ limit:      Score = 100 − 50 × (utilisation ÷ limit)
limit < utilisation ≤ 1:  Score = 50 × (1 − (utilisation − limit) ÷ (1 − limit))
Utilisation > 1:          Score = 0
```

With the default limit of 85 %:

| Utilisation after | Score |
|---|---|
| 0 % (empty) | 100 |
| 42.5 % | 75 |
| 85 % (limit) | 50 |
| 92.5 % | 25 |
| 100 % | 0 |
| above | 0 |

The curve is continuous and monotonically decreasing. It rewards **headroom**
and therefore acts as a balancing force: full sites become unattractive before
they overflow. The utilisation limit is the point beyond which the penalty
doubles in pace.

### 6.2 Transport and distance

```
Score = 100 × lowest cost per pallet in the field ÷ own cost per pallet
```

A **ratio scale**: the cheapest site always scores 100, twice the cost scores
50, three times the cost 33. Two consequences follow:

* The score is **relative to the field of candidates**. Remove a very cheap DC
  from the network and every remaining score rises.
* It is **scale-invariant**: multiply all cost rates uniformly and the ranking
  does not change.

### 6.3 Target coverage and stock

```
Stock capability = free positions ÷ target stock       (capped at 1)
Responsiveness   = 1 − transit time ÷ target coverage  (clamped to 0…1)

Score = 100 × (0.7 × stock capability + 0.3 × responsiveness)
```

The 70/30 split is fixed in the calculation core and not adjustable through the
interface. The reasoning: whether the target stock fits into the warehouse at
all matters more than a day more or less of transit time.

Responsiveness relates transit time to target coverage. At 35 days of coverage,
2 days of transit barely register (0.94); at 5 days of coverage the same transit
weighs heavily (0.60).

---

## 7. Step 6: Weighting and total score

The three slider values are first normalised to sum to 1:

```
w_i = slider_i ÷ (slider_capacity + slider_transport + slider_coverage)
```

Only the **ratio** of the sliders matters, therefore: 30/45/25 gives exactly the
same result as 60/90/50. If all three are set to 0, the tool falls back to one
third each.

```
Total score = w_capacity × score_capacity
            + w_transport × score_transport
            + w_coverage × score_coverage
```

The ranking table shows the total score per site; the bar chart shows the three
**contributions** (w_i × score_i), which add up to the total. It is therefore
always visible which criterion carried the decision.

---

## 8. What the weighting actually does – measured

The table below comes from a run over the bundled demo data set (category
Refrigeration, data basis forecast, single allocation, empty network). “Gap” is
the lead of the first-placed site over the second.

| Weights (cap./transp./cov.) | Recommendation | Score | Gap | Avg. distance |
|---|---|---|---|---|
| 100 / 0 / 0 | **DC Poznań** | 68.9 | 0.4 | 868 km |
| 0 / 100 / 0 | DC Duisburg | 100.0 | 13.5 | 628 km |
| 0 / 0 / 100 | DC Duisburg | 98.1 | 0.1 | 628 km |
| 30 / 45 / 25 (default) | DC Duisburg | 90.1 | 6.1 | 628 km |
| 60 / 20 / 20 | DC Duisburg | 80.7 | 2.5 | 628 km |
| 20 / 60 / 20 | DC Duisburg | 93.3 | 8.1 | 628 km |
| 20 / 20 / 60 | DC Duisburg | 92.6 | 2.9 | 628 km |
| 50 / 0 / 50 | DC Duisburg | 83.3 | 0.0 | 628 km |

Four patterns emerge that hold generally:

**First: the weighting decides less often than you would expect.** In eight of
ten combinations tested the same site wins. In a transport-cost-dominated
network — and most are — proximity to customers overrides the other criteria
almost every time. The recommendation only changes at 100 % capacity weight, and
then by 0.4 points, which is effectively a tie.

**Second: the gap says more than the score.** A result with an 8.1-point lead is
robust; one with a 0.0 to 0.4-point lead is a coin toss where other criteria
should decide. Always check the row below the winner in the ranking.

**Third: capacity weight lowers the level, not the order.** Because the capacity
score already sits well below 100 at moderate utilisation, the total score drops
as soon as you raise that criterion (90.1 → 80.7 at 60 % weight). That is not a
worse result, it is a different scale.

**Fourth: the coverage score separates weakly while capacity suffices.** At
0/0/100 the top three sites lie within 0.1 points of each other, because stock
capability is 1.0 for all of them and only transit time differentiates. This
criterion only develops its effect once capacity becomes scarce — then stock
capability falls below 1 and the score drops quickly.

### Which weighting to use when

| Situation | Recommended emphasis |
|---|---|
| Freight cost dominates, warehouses are well utilised | Transport high (50–70 %) |
| One site is overflowing, the network needs balancing | Capacity high (50–70 %) |
| Short delivery times promised, stock is tight | Coverage high (40–60 %) |
| First orientation without a prior commitment | Default 30 / 45 / 25 |

A sound approach is to run the same configuration with **two or three
weightings** and save each as a scenario. If the allocation stays put, it is
robust. If it flips, the scenario comparison shows what the alternative costs —
and the decision gets made deliberately instead of by a slider.

---

## 9. Single allocation and splitting

### Single allocation

Every active DC is evaluated against the **full** demand of the category. The
ranking follows the total score; the first place is the recommendation.

### Splitting

Splitting works **region by region and greedily**:

1. First, all DCs are evaluated as in the single allocation. The best *n* form
   the candidate pool (*n* = “Max. number of DCs in the split”).
2. Customer regions are sorted by volume, largest first.
3. For each region the pool is evaluated again — using the **region-specific**
   transport cost and the capacity still **free** at that moment.
4. The region goes to the highest-scoring DC with free capacity. If that is not
   enough for the whole region, the fitting share is allocated and the remainder
   passes to the next-best DC in the following round.
5. If volume remains at the end because no capacity is free anywhere in the
   pool, it goes to the highest-scoring DC and is reported as overflow.

The procedure is **heuristic, not optimal**. It produces traceable, geographically
sensible splits and respects capacity limits, but it does not guarantee a cost
minimum in the sense of mathematical optimisation. For a deliberate deviation
the shares can be overridden in the table and recalculated; each DC then serves
the given percentage of **every** region.

### Order in “Simulate all categories”

Categories are processed by volume, largest first. The highest-volume category
therefore chooses first and finds an empty network; later categories compete for
what remains. This order is deliberate, because misplacing the largest category
would be the most expensive mistake. It also means: **the result depends on the
order.** To set different priorities, allocate the categories individually in the
order you want.

---

## 10. History, forecast and both combined

Both data sets use the same schema and are processed identically. The difference
lies **solely in which periods feed into demand per day**. The tool produces no
forecast of its own and does not extrapolate.

Measured on the demo data set (category Refrigeration, default weighting):

| Data basis | Periods | Length | Pallets | Demand/day | Target stock | Recommendation |
|---|---|---|---|---|---|---|
| History | 24 | 730 days | 276,190 | 378.3 | 10,594 | DC Duisburg |
| Forecast | 12 | 365 days | 140,016 | 383.6 | 10,741 | DC Duisburg |
| History + forecast | 35 | 1,064 days | 416,205 | 391.2 | 10,953 | DC Duisburg |

### What the choice does

**History only** reflects what actually happened: real customer structure, real
regional distribution, real seasonality. It is the most reliable basis for the
**regional allocation**, because it rests on measured shipments. Its weakness:
it knows nothing about growth, range shifts, or customers won and lost. Sizing a
network for the coming years on history alone tends to size it too small.

**Forecast only** reflects the planned future and is therefore the right choice
for an investment or site decision. The quality of the result is, however,
exactly the quality of the forecast. **Regional granularity** is the critical
point: many forecasts exist only at country or total level. Without the regional
split the distance calculation loses its basis and all sites converge in the
transport score.

**Both combined** averages across the whole period. Demand per day then lands
between the two values, weighted by the number of days — in the example the
history, being twice as long, pulls the figure down. That is useful for damping
outliers in the forecast, and misleading where history and forecast are
structurally different: an average of two different worlds describes neither.

### Recommended approach

1. Run **history** to understand the regional structure and the order of
   magnitude, and to calibrate the cost rates.
2. Run **forecast**, because the decision concerns the future — save it as a
   scenario.
3. Compare both scenarios. Where the allocations differ lies the real insight:
   the network is not robust against how demand develops. A split variant or a
   capacity adjustment is then worth examining.

The “both” combination is mainly useful when the forecast spans only a few
periods and would otherwise be dominated by a single season.

---

## 11. Limits: time horizon and data volume

The figures below were measured on the standard Chromium of the build
environment.

### Time horizon

**There is no limit on the number of forecast periods.** A data set of 10 years
of history (2016-01 to 2025-12) and 10 years of forecast (2026-01 to 2035-12)
was tested — 240 monthly periods, processed without error, simulated across the
full 3,652 forecast days.

Limits exist only in **period recognition**:

| Notation | Valid range |
|---|---|
| `2035-06`, `2035-06-15` | practically unlimited (tested to year 2500) |
| `15.06.2035`, `06/2035` | as above |
| `2035-Q3`, `2035-KW26` | as above |
| `Jun 2035` | as above |
| bare year: `2035` | **1900 to 2200** |
| Excel date value | approx. 1954 to 2064 (serial numbers 20,000–60,000) |

The practical limit is a business one: a forecast beyond three to five years
rarely carries a site decision, and the longer the selected period, the more the
average smooths out seasonality.

### Historical data volume

Here too there is **no fixed row limit**. Measured values:

| Records | Simulating one category | All categories | Project size | Browser cache |
|---|---|---|---|---|
| 5,000 | 2 ms | 1.2 s | 1.4 MB | works |
| 25,000 | 6 ms | 0.8 s | 6.7 MB | **limit exceeded** |
| 100,000 | 44 ms | 1.3 s | 26.7 MB | limit exceeded |
| 250,000 | 109 ms | 2.6 s | 66.7 MB | limit exceeded |

**Computation time is not the constraint**: even 250,000 records are evaluated
in fractions of a second. The real limit is the browser's **localStorage at
about 5 MB**, roughly **15,000 to 18,000 records**. Beyond that the built-in
fallback takes over: configuration, allocations and scenarios continue to be
saved, raw data is not, and a corresponding notice appears. Nothing is lost —
the working state simply has to be secured via *Export & Project → Save project
as JSON*.

Two things ease the pressure:

* On import, files with more than 2,000 rows are automatically condensed to the
  dimension combination (period × customer × region × category). A million
  individual deliveries often collapse into a few tens of thousands of records.
* The simulation works on the aggregated level anyway. Condensing before import
  costs no accuracy as long as the dimensions are preserved.

**Recommendation:** if the file yields more than roughly 20,000 condensed
records, switch off automatic caching and work with the project file instead.

### Format for the forecast upload

The forecast uses **exactly the same format as the history** — there is no
separate forecast schema. The only distinction is the *Data set type: Forecast*
switch in the import area.

Required per row:

| Field | Example |
|---|---|
| Product category | Refrigeration |
| Period | 2027-03 |
| one quantity measure | quantity, pallets, pallet equivalent, volume or revenue |
| one location reference | region, country or customer |

Optional: customer, country, quantity, revenue, volume, pallets, pallet
equivalent, latitude and longitude.

File types: `.xlsx`, `.xlsm`, `.xls`, `.csv`, `.txt`. Column names are free —
they are mapped during import and common labels are detected automatically.
Ready-to-fill templates sit in `vorlagen/`; the Excel workbook contains a
dedicated “Forecast” sheet for this.

Two notes from practice:

* **Supply the regional split.** A forecast at country level works, but makes
  the distance evaluation coarse. The finer the regions, the more reliable the
  site recommendation.
* **Forecast in pallets or pallet equivalents where possible.** If planning is
  done in units or revenue only, the entire capacity requirement hangs on a
  single global conversion factor.

---

## 12. What the model does not do

So that the results are placed correctly:

* **No mathematical optimisation.** Splitting is a traceable heuristic, not a
  solver. It finds good solutions, not provably optimal ones.
* **No route planning.** Distances are great-circle times a detour factor. For
  reliable freight costs the region-specific flat rates per DC are the intended
  route.
* **No forecasting.** The forecast is produced externally and only read in.
* **No inventory optimisation.** Target stock follows the coverage you specify;
  safety stock derived from service level and forecast error is not calculated.
  The stock safety factor is a flat stand-in for that.
* **No time dynamics.** The calculation is an average across the selected
  period, not a profile over the periods. Seasonal capacity peaks only become
  visible if you restrict the period accordingly.
* **No multi-echelon view.** What is modelled is the customer region ← DC leg.
  Inbound cost from plants or central warehouses into the DCs is not part of the
  model; it can be approximated through the handling cost per pallet.
