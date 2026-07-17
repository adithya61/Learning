```jsx
res.set(key, val) res.get(key) // set and get response - headers.
/endpoint?key=val&sort=desc // req.query.key and req.query.sort - query string.
/user/123 // app.get(/users/:id, ...) => { req.params.id -> id is '123' - parameters.
```

```jsx
Errors and tips for production:
lang 'en' and 'EN' are same so normalize before checking lang.tolowerCase()
res.json() for json responses always nor res.send()
```

### Read and log request headers

```jsx

Build an Express route that reads common request headers and returns them in the response.
- Create GET /info that reads User-Agent, Accept, and Content-Type headers from req.headers
-Return a JSON response with those values, using null for any that are missing
- Test with curl and with a browser — note how User-Agent differs

```
    app.get('/info', (req, res) => {
    TODO : read User-Agent, Accept, Content-Type
    TODO : Return as JSON
    });
```
req.headers keys are always lowercased in Node.js — 'Content-Type' becomes 'content-type'.
Never expose all req.headers blindly in production — some may contain auth tokens. Whitelist only what you need.

Notes:
* res.send() for array, text, html objects, serilizes it (process of coverting a data structure to a format that is suitable for stroing or transmitting over the network.
* Dont hardcode port. see assignment solution
* use ... ?? val instead of ... || val, avoid bugs.
"" || 2 // 2
0 || 3 // 3
NaN || 1 // 1
"" ?? 2 // ""
0 ?? 3 // 0
NaN ?? 1 // NaN
?? only falls back for null/undefined

in || :- 0, "" are replaced.
in ?? :- 0, "" stay the same.
```

```jsx
const express = require("express");
const app = express();

app.get("/info", (req, res) => {
  const userAgent = req.headers["user-agent"] ?? null;
  const accept = req.headers["accept"] ?? null;
  const contentType = req.headers["content-type"] ?? null;

  res.json({
    userAgent,
    accept,
    contentType,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server started and listening on port: ${PORT}`),
);

```

---

### Set custom response headers

```jsx
Understand how to attach custom and standard headers to your HTTP responses.

Create a route GET /ping that returns { status: 'ok' }
Set X-Request-Id to a random UUID on every response
Set Cache-Control: no-store on the response
Verify headers appear using curl -I or browser DevTools
```
	const { v4: uuidv4 } = require('uuid');
	app.get('/ping', (req, res) => {
	 TODO : set X-Request-Id and Cache-Control headers
	 Todo : res.json({ status: 'ok' });
	});
```f
Tips:
Use res.set('Header-Name', value) or res.setHeader() before calling res.json().
X-Request-Id (or X-Trace-Id) is standard in microservices for distributed tracing — log it server-side too.
```

```jsx

const express = require("express");
const app = express();
const { v4: uuidv4 } = require("uuid");

app.get("/ping", (req, res) => {
  res.set("X-Request-Id", uuidv4());
  res.set("Cache-Control", "no-store");

  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`server started and listening on port: ${PORT}`),
);
```

---

### Parse and validate query string

```jsx
Read query parameters from a URL and handle missing or invalid values gracefully.
Create GET /greet?name=Zonic&lang=en — return { message: 'Hello, Zonic!' }
Default name to 'Guest' if missing; default lang to 'en'
If lang is neither 'en' nor 'hi', return 400 with a descriptive error
```
    app.get('/greet', (req, res) => {
    const { name, lang } = req.query;
    TODO : defaults + validation
    });
```
req.query values are always strings. Use destructuring with defaults: const { name = 'Guest' } = req.query
Always validate and sanitize query params — they're user-controlled input and can contain anything
```

```jsx
const express = require("express");
const app = express();

app.get("/greet", (req, res) => {
  const { name = "Guest", lang = "en" } = req.query;

  const normalLang = lang.toLowerCase();

  if (normalLang !== "en" && normalLang !== "hi") {
    res
      .status(400)
      .send({ message: "The only supported languages are en and hi" });
    return;
  }

  res.send({ message: `Hello ${name}` });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(
    `server started and listening on port: ${PORT} vist: http://localhost:${PORT}/`,
  ),
);
```

### pagination via query params

```jsx
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
```

```jsx

const express = require("express");
const app = express();

const items = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  name: `Item ${i + 1}`,
}));
app.get("/items", (req, res) => {
  // TODO : parse page & limit, slice items, return with metadata
  const page = parseInt(req.query.page) ?? 1;
  const limit = parseInt(req.query.limit) ?? 10;
  const dataLen = items.length;
  if (dataLen === 0) res.status(204).json({ message: "no data found" });
  const maxLimit = Math.min(Math.min(100, items.length), limit);
  const maxPage = Math.min(page, Math.ceil(dataLen / limit));

  //   extract data
  const start = (page - 1) * limit;
  const end = start + limit;

  const data = items.slice(start, end);

  res.json({ data, maxPage, maxLimit, dataLen });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(
    `server started and listening on port: ${PORT} vist: http://localhost:${PORT}/`,
  ),
);

```

---