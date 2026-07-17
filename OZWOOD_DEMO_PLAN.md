# Ozwood AI Flooring Demo — Product and Experience Plan

Updated: 2026-07-17 (Australia/Sydney)

## 1. Goal

Create an independent desktop-browser concept demo for Ozwood Australia while preserving every existing demo file. The experience combines:

- a high-fidelity one-click floor visualiser;
- five recognisable Ozwood product directions;
- an offline-safe guided AI consultant;
- official product facts, timber stories, selection knowledge and showroom actions;
- the existing “large room + bottom product strip + right consultant” layout direction.

Primary entry: `ozwood-demo.html`.

## 2. Experience structure

### Main visualiser

- Three controlled room types: Living Room, Bedroom and Home Office.
- Five consistent floor treatments in each room, for a 15-image visual matrix.
- Floor changes are pre-rendered so the demo is instant, realistic and reliable.
- Every generated room is labelled **CONCEPT VISUAL**. Official Ozwood product and story photography is labelled separately.
- Compare mode lets the customer select either side A or side B, change both floors independently from the bottom strip, then drag the split line. Switching rooms preserves both selected products.

### Product strip

1. European Oak 5106 — engineered timber, warm and balanced.
2. Australian Spotted Gum SG1443-185 — native character and visible tonal variation.
3. Engineered Oak Herringbone 4301 — premium architectural statement.
4. OZ2628 White Oak — light, click-lock, value-oriented laminate.
5. Hybrid Grey Oak — waterproof, AC4, value and lifestyle practicality.

### Product detail

Each product has three decision layers:

- Why it fits: room, style and lifestyle use cases.
- Timber story: a human explanation rather than a technical product dump.
- Install & care: subfloor, moisture, layout, wastage and maintenance notes.

### Ozwood stories

The story drawer translates the strongest official-site material into a customer journey:

- “Our Expertise, Your Confidence” and 10,000+ Sydney families.
- Ozwood’s story of learning to appreciate Spotted Gum in Australian homes.
- Healthy-home and material-emissions thinking.
- Choosing → Installing → Maintaining.
- Auburn and Castle Hill showrooms, sample and quote actions.

## 3. AI consultant design

The consultant asks nine fixed-contract questions, with four clickable answers every time:

1. House, apartment or commercial.
2. Room / whole-home scope.
3. Approximate floor area.
4. Desired visual character.
5. Children, pets, foot traffic or investment use.
6. Concrete, tiles, timber or unknown subfloor.
7. Waterproof / moisture requirement.
8. Supply only, supply + installation, sample or showroom.
9. Material budget per square metre.

Customers can also type a full sentence. Recognised facts are filled immediately, so already-answered questions are skipped rather than repeated. If the input is a flooring question rather than an answer, the interface answers it first and then restores the current question and choices without losing progress.

The final response contains:

- one top match and two alternatives;
- a human-readable recommendation reason;
- material or concept supply-and-install estimate in AU$ where a price reference exists;
- automatic application of the recommended floor to the current room;
- product-detail and Ozwood-story next steps.

The recommender is intentionally deterministic and entirely local. This removes model-format, timeout, failed-fetch and duplicate-question risks during a live presentation. Free-form product questions use a constrained Ozwood AI knowledge endpoint when available and fall back to an embedded local knowledge base when the endpoint is unavailable. The language model never controls the question contract, final product constraints or pricing logic.

## 4. Data and pricing rules

- Price references are taken from official Ozwood product/sale pages and clearly marked as requiring confirmation.
- Quote-only products remain quote-only; the demo does not invent a material price.
- Concept estimates apply a product-specific wastage allowance and an illustrative installation rate.
- “Water resistant” and “waterproof” are treated as different claims.
- Final live quoting still requires current stock, batch, exact product certificate, site measure, moisture and subfloor assessment.

## 5. Official references used

- Homepage and services: <https://ozwoodaustralia.com.au/>
- Engineered flooring range and installation guidance: <https://ozwoodaustralia.com.au/engineered-floor/>
- Parquetry and herringbone: <https://ozwoodaustralia.com.au/parquetry/>
- Laminate range: <https://ozwoodaustralia.com.au/laminate-floor/>
- Knowledge base: <https://ozwoodaustralia.com.au/knowledgebase/?id=tab_choosing>
- Spotted Gum story: <https://ozwoodaustralia.com.au/2018/04/21/the-spotted-gum-i-know/>
- Healthy-home article: <https://ozwoodaustralia.com.au/2017/11/15/for/>
- European Oak 5106: <https://ozwoodaustralia.com.au/product/oak-5106-france-78-m2/>
- White Oak OZ2628: <https://ozwoodaustralia.com.au/product/oz2618-bordeaux-oak/>
- Hybrid Grey Oak: <https://ozwoodaustralia.com.au/product/hybrid-grey-oak/>
- Contact and showroom details: <https://ozwoodaustralia.com.au/contact/>

## 6. Content cautions

- Ozwood’s official site contains some duplicated products and price references that differ across pages. The demo therefore presents prices as official-page references, not a binding quote.
- Historical company stories contain different older figures and founder names. The customer-facing demo uses the current homepage’s “10,000+ Sydney families” statement and avoids unconfirmed historical naming.
- Generated room visuals are not presented as Ozwood completed projects.

## 7. Future production path

1. Confirm the final live SKU list, current prices, warranties and product certificates with Ozwood.
2. Replace concept scenes with approved Ozwood project photography where licensing permits.
3. Connect a language model only for free-text extraction; retain the deterministic question, recommendation and pricing contract.
4. Add live sample/quote lead capture and CRM handoff.
5. Add true customer-photo floor segmentation after the controlled demo has been approved.
