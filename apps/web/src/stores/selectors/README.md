# Selector Pattern Guide

Use selectors as the single place for derived Redux view data.

- Keep base selectors simple and focused on one slice field.
- Build derived selectors with `createSelector` and reuse them across screens.
- Avoid expensive sorting/aggregation/filtering directly inside React components.
- Prefer parameterized lookup selectors (`selectById`) for repeated list access.

This keeps renders predictable and minimizes recomputation hotspots.
