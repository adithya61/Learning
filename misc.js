/*
Implement a basic paginated list endpoint using page and limit parameters.
Create GET /items?page=1&limit=10 that returns a slice of a hardcoded 50-item array
Default page=1, limit=10; cap limit at 100
Return { data, page, limit, total } in the response body
```
    const items = Array.from({ length: 50 }, (_, i) => ({ id: i+1, name: `Item ${i+1}` }));
    app.get('/items', (req, res) => {
    TODO : parse page & limit, slice items, return with metadata
    });
```
parseInt(req.query.page, 10) || 1 — the || 1 handles NaN from non-numeric inputs.
Use Math.min(limit, MAX_LIMIT) to cap page size. Never let clients request unlimited rows.

*/

const express = require("express");
const app = express();



const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(
    `server started and listening on port: ${PORT} vist: http://localhost:${PORT}/`,
  ),
);
