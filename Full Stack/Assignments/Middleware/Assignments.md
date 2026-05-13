### Register express.json() as middleware

```jsx
Tasks:
-> Create an Express app with GET /hello that returns 'Hello world'.
-> Write an application-level middleware that logs [METHOD] [URL] [timestamp] to the console for every incoming request.
-> Register it with app.use() BEFORE your route — confirm it logs on every hit.
-> Move app.use() AFTER the route — observe it no longer runs. Understand why order matters.

Topics:
app.use()
req / res / next
execution order
application-level middleware
```

```jsx

const express = require('express');
const app = express();

// Register the JSON middleware
app.use(express.json());

app.post('/data', (req, res) => {
  console.log(req.body); // Access the parsed JSON here
  res.send('Data received');
});

app.listen(3000);
```

---

### Log all incoming requests

```jsx
const exp = require("express");

const app = exp();

const logRequests = (req, res, next) => {
  console.log(
    new Date().toISOString(),
    ` METHOD: ${req.method}, URL: ${req.url}`,
  );
  next();
};

app.get("/log", logRequests, (req, res) => {
  res.send({ msg: "request logged" });
});

app.listen(3000);

```

---

### Gatekeeper / block requests / authenticate

```jsx
-> Create a route GET /secret that returns 'Top secret data'.
-> Write middleware that checks for a query param ?key=mysecret. If missing or wrong → res.status(401).send('Forbidden') without calling next().
-> If correct → call next() to let the route handler run.
-> Test both paths with a browser or curl.

Topics:
short-circuiting
conditional next()
query params in middleware
401 vs 403
```

```jsx
const express = require("express");
const app = express();

const authenticate = (req, res, next) => {
  const secret = req.query.key;
  console.log(secret);

  if (secret == "mysecret") next();
  else res.status(401).send("Forbidden");
};

app.use(authenticate);

app.get("/secret", (req, res) => {
  res.send({ msg: "access granted" });
});

app.listen(3000);

```

---

### Built-in body parser

```jsx
Tasks:
Register express.json() as middleware.
Create POST /echo that reads req.body and sends it back as JSON.
Test with a POST request carrying a JSON body — observe req.body is undefined without the middleware.
Add express.urlencoded({ extended: true }) and test with form-style body too.

Topics:
express.json()
express.urlencoded()
req.body
built-in middleware

Note: express.urlencoded() is a method inbuilt in express to recognize the incoming Request Object as strings or arrays.
```

```jsx
const express = require("express");
const app = express();

app.use(express.json());

app.post("/echo", (req, res) => {
  res.send(req.body);
});

app.listen(3000);
```

---

### Router level middleware

```jsx
Scope middleware to specific route groups using express.Router() — critical for real app architecture.

Tasks:
Create a router for /api/products with at least two routes: GET / and GET /:id.
Write middleware on the router that checks a header x-api-key. Invalid key → 403. Valid → next().
Mount the router with app.use('/api/products', router) — confirm the key check only applies to /api/products routes, not others.
Add a second router for /api/public with no auth middleware and verify it works without a key.

Topics:
express.Router()
router.use()
scoped middleware
mounting routers
```

```jsx
const express = require("express");
const app = express();
const router = express.Router();
const routerNoAuth = express.Router();

// middleware
const auth = (req, res, next) => {
  const key = req.headers["x-api-key"];
  if (key === "secret") next();
  else res.status(403).send({ msg: "not authorized to enter" });
};

router.use(auth);

router.get("/", (req, res) => {
  res.json({ msg: "base route" });
});

router.get("/:id", (req, res) => {
  console.log(req.params.id);
  res.send("bye");
});

routerNoAuth.get("/", (req, res) => {
  res.json({ msg: "No auth route hit" });
});

app.use("/api/products/", routerNoAuth);

app.listen(3000);
```

### Attach data to req.

```jsx
Understand that middleware can enrich the req object — passing computed data downstream to route handlers.

Tasks
Simulate a user database as a plain JS object: { 'token-abc': { id:1, name:'Alice', role:'admin' } }.
Write auth middleware that reads an Authorization header, looks up the user, and attaches it as req.user.
Create GET /me that returns req.user (or 401 if not set).
Create GET /admin that checks req.user.role === 'admin' in its own middleware before responding.

Toics:
req augmentation
chaining middleware
token-based auth pattern
separation of concerns

Note: request sent via postman : authorization -> bearer token ('token-abc')
```

```jsx
const express = require("express");
const app = express();
const db = {
  "token-abc": { id: 1, name: "Alice", role: "admin" },
  "token-bcd": { id: 2, name: "Luffy", role: "user" },
};

const auth = (req, res, next) => {
  const token = req.headers["authorization"];
  if (token && token.startsWith("Bearer")) {
    const dbToken = token.split(" ")[1];
    if (!db[dbToken]) res.status(401).send("user doesnt exist");
    req.user = db[dbToken];
    next();
  } else {
    res.status(401).send("not authorized");
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).send("not an admin");
  }
};

app.use(auth);

app.get("/me", (req, res) => {
  res.send(req.user);
});

app.get("/admin", adminMiddleware, (req, res) => {
  res.send("welcome admin");
});

app.listen(3000);

```

---

### Error middleware

```jsx
Learn Express's special 4-argument error middleware — the single most misunderstood middleware type.

Tasks
Create a route GET /crash that calls next(new Error('Something blew up')).
Write an error-handling middleware with signature (err, req, res, next) — all 4 params are required.
Return a JSON response: { error: err.message, status: 500 }. Register it LAST in your app.
Create a custom AppError class with a statusCode field, throw it from a route, and use err.statusCode in your error middleware.

Topics:
(err,req,res,next)
next(err)
error propagation
custom error classes
middleware registration order

Notes: 
* error middleware's are not like normal middlewares, and are to be registered last and will not be called on every request to app.get (or any methods instead of get), it will be called from top to bottom like the normal flow of a program and if any error was thrown then it captures it and can be used in the  err parameter of the middleware.
* It runs if the next(error) is called just like next(new Error 'something went wrong' is called in the assignment below.
```

```jsx
const express = require("express");
const app = express();

const errorHandler = (err, req, res, next) => {
  res
    .status(err.statusCode || 500)
    .json({ error: err.message, status: err.statusCode || 500 });
};

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

app.get("/crash", (req, res, next) => {
  next(new AppError("something went wrong", 404)); // this thrown error is captured in error middleware err obj and used.
});

app.use(errorHandler);

app.listen(3000);
```

### Middleware chain - measure response time

```jsx
Build a multi-step middleware chain that records a start time and calculates duration after the response is sent.

Tasks
Write middleware that records Date.now() on req.startTime.
Use res.on('finish', ...) inside this middleware to calculate and log the duration after the response finishes.
Chain it with the request logger from the Easy assignment — observe both running in sequence.
Add a third middleware that appends an X-Response-Time header. Verify it appears in the response headers.

Topics:
middleware chaining
res events
custom headers
X-Response-Time pattern

Notes:
* Monkey patching, res.send(),
	send() is just a function on the res object so we overwrite it with over own fuction do what we want to do
	and then call the original res.send() from express we intercepted res.send() and also got very close to
	the response and now the calculated response time is accurate.
```

```jsx
const express = require("express");
const app = express();

//~ middleware

const middle = (req, res, next) => {
  req["startTime"] = Date.now();
  res.on("finish", () => {
    console.log(Date.now() - req.startTime);
    console.log(res.get("X-Response-Time"));
  });
  next();
};

const logRequests = (req, res, next) => {
  console.log(
    new Date().toISOString(),
    ` METHOD: ${req.method}, URL: ${req.url}`,
  );
  next();
};

const responseHeader = (req, res, next) => {
  const originalSend = res.send;

  res.send = (body) => {
    res.set("X-Response-Time", Date.now() - req.startTime);
    originalSend.call(res, body);
  };
  next();
};

//~ routes

app.get("/listener", [middle, logRequests, responseHeader], (req, res) => {
  res.send("listening"); // the custom overwritten res.send from the middleware responseHandler is called here.
});

app.listen(3000);
```

### RateLimitter

```jsx
Build a stateful middleware that limits how many requests a client can make — no libraries allowed. This forces you to think about middleware as stateful logic, not just pass-through.

Tasks
Store an in-memory map: IP → { count, windowStart }. Set a limit of 5 requests per 60 seconds per IP.
In middleware: read req.ip, check/update the map, return 429 Too Many Requests with a Retry-After header when over limit.
Reset the count when 60s have elapsed since windowStart.
Make the limit and window configurable by writing the middleware as a factory function: rateLimiter({ max:5, windowMs:60000 }).
Test with a loop of 10 rapid requests and confirm the 6th onward gets a 429.

Topics:
middleware factories
stateful middleware
429 status
Retry-After header
sliding vs fixed window
req.ip

Notes:
* The factory middleware acts as a closure and preserves the limitObj. which is used to set response header
and use in error object.
* req.ip to get remote ip address of client
* obj[val] -> val is a variable that needs to be evaluated otherwise use
obj.key directly
* use let m = new Map() instead of let m = {} // __proto__ or constructor can cause subtle bugs.
* m.get(key) , m.set(key, value) is better than doing m[key] = val or m.key = val or trying to figure out  
if m.key or m[key] and commiting errors.
* and m[key] if key is a variable with var, const, var and m.key if m already has a property with nane 'key'
let m = {
	'fruit':apple,
}

let key = fruit;

m[key] and m.fruit give same value
but m[fruit] // ERROR
```

```jsx

const express = require("express");
const app = express();

const clientMap = {
  // ip : {startTime: date.now), count: 1-5'}
};

// Rate limit logic
const limitClient = (ip, max, windowMs) => {
  if (clientMap[ip]) {
    if (
      Date.now() - clientMap[ip].startTime < windowMs &&
      clientMap[ip].count < max
    ) {
      clientMap[ip].count++;
      return true;
    } else if (Date.now() - clientMap[ip].startTime >= windowMs) {
      clientMap[ip].startTime = Date.now();
      clientMap[ip].count = 1;
      return true;
    } else return false;
  } else {
    clientMap[ip] = { startTime: Date.now(), count: 1 };
    return true;
  }
};

// custom middleware factory

const customMiddleware = (limitObj = { max: 5, windowMs: 5000 }) => {
  return (req, res, next) => {
    const clientIp = req.ip;

    if (limitClient(clientIp, limitObj.max, limitObj.windowMs)) next();
    else {
      res.set("Retry-After", Math.ceil(limitObj.windowMs / 1000));
      next(new Error(`Too many request retry after ${res.get("Retry-After")} seconds`));
    }
  };
};

// error middleware
const errorHandler = (err, req, res, next) => {
  res.status(429).send({ msg: err.message });
};

app.use(customMiddleware());

app.get("/profile", (req, res) => {
  res.send("profile is here.");
});

app.use(errorHandler);

app.listen(3000);

```

### JWT auth middleware pipeline

```jsx
Build a complete, production-style auth pipeline using multiple middleware layers that each do one thing.

Tasks
Install jsonwebtoken. Write a /login route that returns a signed JWT with { userId, role } payload.
Write verifyToken middleware: extracts Bearer token from Authorization header, verifies signature, attaches decoded payload to req.user. Passes a 401 to next(err) on failure.
Write requireRole(role) — a factory that returns middleware checking req.user.role. Passes 403 to next(err) if unauthorized.
Create three routes: GET /public (no auth), GET /dashboard (any logged-in user), GET /admin (admin role only).
Write a single error-handling middleware at the bottom that handles both 401 and 403 errors with proper JSON responses.
Test the full flow: no token, valid token, admin token — all three paths.

Topics:
JWT
middleware factories
pipeline composition
role-based access
error delegation
Bearer tokens
```

```jsx
const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const KEY = "acki332j";

const requireRole = (role) => {
  return (req, res, next) => {
    if (req.user.role === role) next();
    else {
      const err = new Error("Not an " + role);
      err.status = 403;
      next(err);
    }
  };
};

const verifyToken = (req, res, next) => {
  if (
    req.headers["authorization"] &&
    req.headers["authorization"].startsWith("Bearer")
  ) {
    const token = req.headers["authorization"].split(" ")[1];

    try {
      const payload = jwt.verify(token, KEY);

      req.user = payload;
      next();
    } catch (error) {
      const err = new Error("invalid token");
      err.status = 401;
      console.log(err, "this is error");
      next(err);
    }
  } else {
    const err = new Error("no token provided");
    err.status = 401;
    next(err);
  }
};

const errorMiddleware = (err, req, res, next) => {
  res.status(err.status).send(err.message);
};

app.post("/login", (req, res) => {
  const token = jwt.sign({ usdId: 1244, role: "user" }, KEY, {
    expiresIn: "1h",
  });

  res.status(200).send(token);
});

app.get("/public", (req, res) => {
  res.send("you are in public free to roam play and run...");
});

app.get("/dashboard", verifyToken, (req, res) => {
  res.send("continue using heres your dashboard");
});

app.get("/admin", [verifyToken, requireRole("admin")], (req, res) => {
  res.send("you are a admin");
});

app.use(errorMiddleware);

app.listen(3000);

------------------------------------------------------------------------------------------------------------

Production alternative:

handled directly by browser set token on browser cookies:

res
    .cookie("token", token, {
      maxAge: Date.now() + 60 * 60,
      httpOnly: true,
      secure: true, // sends only on https
      sameSite: "strict", // avoid csrf attack where another site tricks the browser into making requests to your server using stored cookie.
    })
    .send("Login successfull");

Notes:

Also store KEY the secret used to sign jwt in a environment variable on a server.

```

### Middleware engine

```jsx
Understand how frameworks like Express themselves work internally — build a minimal middleware engine that processes an array of functions in sequence.

Tasks
Without using Express at all, build a pipeline(req, res, middlewares) function that runs an array of middleware functions in order, passing a next() that advances to the next function.

Implement async support — each middleware can be async and the engine should await it before calling next.

Implement error propagation — if any middleware calls next(err) or throws, skip to the first function with arity 4 (the error handler).

Rebuild the rate limiter and JWT middleware from previous assignments as pure functions compatible with your engine.

Write a 200-line reflection: how does this differ from Express's actual implementation? Look up Express's layer.js source.

Topics:
recursive dispatch
async middleware
error propagation internals
arity detection
how Express actually works
```

```jsx

```