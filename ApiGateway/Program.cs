using System.Diagnostics;
using Ocelot.DependencyInjection;
using Ocelot.Middleware;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration
    .AddJsonFile("ocelot.json", optional: false, reloadOnChange: true)
    .AddEnvironmentVariables();

// ── Logging ──────────────────────────────────────────────────────────────────
builder.Logging.ClearProviders();
builder.Logging.AddJsonConsole();

// Enable Ocelot warning logging only (reduce noise)
builder.Logging.AddFilter("Ocelot", LogLevel.Warning);

// ── CORS (read from config, no duplication) ───────────────────────────────────
var corsOrigins = builder.Configuration
    .GetSection("CORS:Origins")
    .Get<string[]>() ?? [];

builder.Services.AddCors(options =>
{
    options.AddPolicy("GatewayPolicy", policy =>
        policy.WithOrigins(corsOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials()
              .WithExposedHeaders(
                  "X-Request-Id",
                  "X-Rate-Limit-Limit",
                  "X-Rate-Limit-Remaining",
                  "X-Rate-Limit-Reset",
                  "Retry-After"));
});

// ── Caching + Ocelot ─────────────────────────────────────────────────────────
builder.Services.AddMemoryCache();

builder.Services.AddStackExchangeRedisCache(o =>
{
    o.Configuration = builder.Configuration.GetConnectionString("Redis")
                      ?? "localhost:6380,abortConnect=false";
    o.InstanceName = "icoach-gateway:";
});

builder.Services.AddOcelot(builder.Configuration);

builder.WebHost.ConfigureKestrel(o =>
{
    o.ListenAnyIP(8080);
    o.Limits.MaxRequestBodySize = 52_428_800; // 50MB (for file uploads)
});

// ── Build ─────────────────────────────────────────────────────────────────────
var app = builder.Build();

// 1. Exception handler
app.UseExceptionHandler(errApp => errApp.Run(async ctx =>
{
    ctx.Response.StatusCode = 500;
    ctx.Response.ContentType = "application/json";
    await ctx.Response.WriteAsJsonAsync(new
    {
        error = "Internal gateway error",
        requestId = ctx.TraceIdentifier
    });
}));

// 2. CORS
app.UseCors("GatewayPolicy");

// 3. Correlation ID
app.Use(async (ctx, next) =>
{
    var requestId = ctx.Request.Headers["X-Request-Id"].FirstOrDefault()
                    ?? Activity.Current?.Id
                    ?? Guid.NewGuid().ToString("N")[..16];

    ctx.Items["RequestId"] = requestId;
    ctx.Response.Headers["X-Request-Id"] = requestId;
    await next();
});

// 4. Security headers
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
    ctx.Response.Headers["X-Frame-Options"] = "DENY";
    ctx.Response.Headers["X-XSS-Protection"] = "1; mode=block";
    ctx.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload";
    ctx.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    ctx.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
    ctx.Response.Headers["Content-Security-Policy"] =
        "default-src 'self'; connect-src 'self' ws: wss:; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; frame-ancestors 'none'";
    await next();
});

// 5. Request logging
app.Use(async (ctx, next) =>
{
    var sw = Stopwatch.StartNew();
    var logger = ctx.RequestServices.GetRequiredService<ILogger<Program>>();
    var requestId = ctx.Items["RequestId"]?.ToString();
    var path = ctx.Request.Path.Value ?? "";
    
    var isSystemRoute = path == "/" ||
                        path == "/health" || 
                        path == "/ready" || 
                        path == "/rate-limit-status" ||
                        path == "/debug/routes" ||
                        path == "/nodejs-docs" ||
                        path == "/fastapi-docs" ||
                        path == "/fastapi-openapi.json";

    await next();

    sw.Stop();
    
    if (!isSystemRoute)
    {
        logger.LogInformation(
            "gateway {Method} {Path} → {StatusCode} ({ElapsedMs}ms) rid={RequestId}",
            ctx.Request.Method,
            ctx.Request.Path,
            ctx.Response.StatusCode,
            sw.ElapsedMilliseconds,
            requestId);
    }
});

// ── Root Landing Page ────────────────────────────────────────────────────────
app.MapGet("/", (HttpContext ctx) =>
{
    ctx.Response.ContentType = "text/html; charset=utf-8";
    
    var html = @"<!DOCTYPE html>
<html lang='en'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Icoach API Gateway</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; 
            max-width: 1000px; 
            margin: 40px auto; 
            padding: 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container { 
            background: white; 
            border-radius: 16px; 
            padding: 40px; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.1); 
        }
        h1 { 
            color: #1a1a2e; 
            margin-bottom: 10px; 
            font-size: 2.5em; 
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .subtitle { 
            color: #666; 
            margin-bottom: 30px; 
            font-size: 1.1em; 
        }
        .status-badge { 
            display: inline-block; 
            background: #10b981; 
            color: white; 
            padding: 8px 20px; 
            border-radius: 30px; 
            font-size: 0.95em;
            font-weight: 500;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);
        }
        .status-dot {
            display: inline-block;
            width: 10px;
            height: 10px;
            background: white;
            border-radius: 50%;
            margin-right: 8px;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .service { 
            background: #f8f9fa; 
            padding: 24px; 
            margin: 20px 0; 
            border-radius: 12px; 
            border-left: 4px solid #667eea;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .service:hover {
            transform: translateX(5px);
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
        }
        .service h2 { 
            margin-bottom: 12px; 
            color: #1a1a2e;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 1.5em;
        }
        .service p { 
            color: #666; 
            margin-bottom: 16px; 
            line-height: 1.5;
        }
        .links { 
            display: flex; 
            gap: 12px; 
            flex-wrap: wrap; 
        }
        .btn { 
            display: inline-block; 
            padding: 12px 24px; 
            background: #667eea; 
            color: white; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: 500;
            transition: all 0.2s;
            border: none;
            cursor: pointer;
        }
        .btn:hover { 
            background: #5a67d8; 
            transform: translateY(-2px); 
            box-shadow: 0 6px 12px rgba(102, 126, 234, 0.3);
        }
        .btn-outline {
            background: transparent;
            color: #667eea;
            border: 2px solid #667eea;
        }
        .btn-outline:hover { 
            background: #667eea; 
            color: white; 
        }
        .endpoint-section { 
            margin-top: 30px; 
        }
        .endpoint-section h3 {
            color: #1a1a2e;
            margin-bottom: 15px;
            font-size: 1.2em;
        }
        .endpoint-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 10px; 
        }
        .endpoint-item {
            background: #e9ecef;
            padding: 12px 16px;
            border-radius: 8px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace;
            font-size: 0.9em;
            transition: background 0.2s;
        }
        .endpoint-item:hover {
            background: #dee2e6;
        }
        .endpoint-item .method {
            font-weight: bold;
            color: #10b981;
        }
        .footer { 
            margin-top: 40px; 
            padding-top: 20px;
            text-align: center; 
            color: #999; 
            font-size: 0.85em; 
            border-top: 1px solid #e9ecef;
        }
        .icon {
            font-size: 1.5em;
        }
    </style>
</head>
<body>
    <div class='container'>
        <h1>
            <span>🚀</span>
            <span>Icoach API Gateway</span>
        </h1>
        <p class='subtitle'>Unified entry point for all Icoach microservices</p>
        <div class='status-badge'>
            <span class='status-dot'></span>
            Gateway Online | Port 8080
        </div>
        
        <div class='service'>
            <h2>
                <span>📘</span>
                <span>Node.js Server</span>
            </h2>
            <p>Main application server with authentication, users, workouts, chat history, and more.</p>
            <div class='links'>
                <a href='/nodejs-docs' class='btn'>📄 API Documentation (Swagger)</a>
                <a href='http://localhost:5000/api-docs' class='btn btn-outline' target='_blank'>🔗 Direct Access</a>
            </div>
        </div>
        
        <div class='service'>
            <h2>
                <span>🤖</span>
                <span>FastAPI Server</span>
            </h2>
            <p>AI/ML services for intelligent chat and food recognition.</p>
            <div class='links'>
                <a href='/fastapi-docs' class='btn'>📄 Swagger UI</a>
                <a href='http://localhost:8000/docs' class='btn btn-outline' target='_blank'>🔗 Direct Access</a>
            </div>
        </div>
        
        <div class='endpoint-section'>
            <h3>🔧 Gateway Management Endpoints</h3>
            <div class='endpoint-grid'>
                <div class='endpoint-item'><span class='method'>GET</span> /health</div>
                <div class='endpoint-item'><span class='method'>GET</span> /ready</div>
                <div class='endpoint-item'><span class='method'>GET</span> /rate-limit-status</div>
                <div class='endpoint-item'><span class='method'>GET</span> /debug/routes</div>
                <div class='endpoint-item'><span class='method'>GET</span> /nodejs-docs</div>
                <div class='endpoint-item'><span class='method'>GET</span> /fastapi-docs</div>
            </div>
        </div>
        
        <div class='footer'>
            Icoach Microservices Architecture | Gateway v1.0.0
        </div>
    </div>
</body>
</html>";
    
    return Results.Content(html, "text/html; charset=utf-8");
});

// ── System Endpoints ────────────────────────────────────────────────────────
app.MapGet("/health", () => Results.Ok(new
{
    status = "healthy",
    timestamp = DateTime.UtcNow,
    version = "1.0.0",
    services = new[]
    {
        new { 
            name = "nodejs", 
            port = 5000, 
            url = "http://localhost:5000",
            docs = "http://localhost:5000/api-docs",
            gateway_docs = "/nodejs-docs"
        },
        new { 
            name = "fastapi", 
            port = 8000, 
            url = "http://localhost:8000",
            docs = "http://localhost:8000/docs",
            gateway_docs = "/fastapi-docs"
        }
    }
}));

app.MapGet("/ready", async () =>
{
    using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };
    var checks = new Dictionary<string, object>();

    try
    {
        var r = await http.GetAsync("http://host.docker.internal:5000/health");
        checks["nodejs"] = r.IsSuccessStatusCode ? "healthy" : "unhealthy";
    }
    catch { checks["nodejs"] = "unreachable"; }

    try
    {
        var r = await http.GetAsync("http://host.docker.internal:8000/health");
        checks["fastapi"] = r.IsSuccessStatusCode ? "healthy" : "unhealthy";
    }
    catch { checks["fastapi"] = "unreachable"; }

    var allHealthy = checks.Values.All(v => v.ToString() == "healthy");
    return allHealthy
        ? Results.Ok(new { status = "ready", checks })
        : Results.Json(new { status = "degraded", checks }, statusCode: 503);
});

app.MapGet("/rate-limit-status", (HttpContext ctx) =>
{
    var clientIp = ctx.Request.Headers["X-Forwarded-For"].FirstOrDefault()
                   ?? ctx.Connection.RemoteIpAddress?.ToString()
                   ?? "unknown";
    return Results.Ok(new
    {
        clientIp,
        globalPolicy = new { limit = 100, window = "15m", type = "sliding", appliesTo = "All routes unless overridden" },
        policies = new[]
        {
            new { route = "/api/v1/auth/**",                  limit = 20,  window = "15m", type = "sliding" },
            new { route = "/api/v1/users/**",                 limit = 50,  window = "15m", type = "sliding" },
            new { route = "/api/v1/workout-sessions/**",      limit = 100, window = "15m", type = "sliding" },
            new { route = "/api/v1/chat-history/**",          limit = 30,  window = "1m",  type = "sliding" },
            new { route = "/api/v1/ai/chat",                  limit = 20,  window = "1m",  type = "sliding" },
            new { route = "/api/v1/ai/chat/tokens/usage",     limit = 100, window = "15m", type = "sliding (global)" },
            new { route = "/api/v1/food-recognition/predict", limit = 10,  window = "1m",  type = "sliding" },
            new { route = "/api/v1/food-recognition/predict-top", limit = 10, window = "1m", type = "sliding" },
            new { route = "/api/v1/progress/**",              limit = 100, window = "15m", type = "sliding (global)" },
            new { route = "/api/v1/workouts/**",              limit = 100, window = "15m", type = "sliding (global)" },
            new { route = "/api/v1/foods/**",                 limit = 100, window = "15m", type = "sliding (global)" },
            new { route = "/api/v1/saved-workouts/**",        limit = 100, window = "15m", type = "sliding (global)" },
            new { route = "/api/v1/daily-active/**",          limit = 100, window = "15m", type = "sliding (global)" },
            new { route = "/api/v1/water-intake/**",          limit = 100, window = "15m", type = "sliding (global)" },
        }
    });
});

app.MapGet("/debug/routes", () => Results.Ok(new
{
    gateway = "http://localhost:8080",
    systemEndpoints = new[]
    {
        new { path = "/", method = "GET", description = "Landing page" },
        new { path = "/health", method = "GET", description = "Health check" },
        new { path = "/ready", method = "GET", description = "Readiness check" },
        new { path = "/rate-limit-status", method = "GET", description = "Rate limit status" },
        new { path = "/debug/routes", method = "GET", description = "Debug routes" },
        new { path = "/nodejs-docs", method = "GET", description = "Redirect to Node.js docs" },
        new { path = "/fastapi-docs", method = "GET", description = "Redirect to FastAPI docs" },
        new { path = "/fastapi-openapi.json", method = "GET", description = "FastAPI OpenAPI spec" },
    },
    apiEndpoints = new[]
    {
        new { path = "/api/v1/auth/**", method = "ALL", description = "Authentication (OAuth, login, register)" },
        new { path = "/api/v1/users/**", method = "ALL", description = "User management & profile" },
        new { path = "/api/v1/users/profile", method = "GET,PUT", description = "User profile" },
        new { path = "/api/v1/users/profile/avatar", method = "POST,PUT,DELETE", description = "Avatar management" },
        new { path = "/api/v1/progress/**", method = "ALL", description = "User progress dashboard" },
        new { path = "/api/v1/progress/dashboard", method = "GET", description = "Progress dashboard" },
        new { path = "/api/v1/progress/history", method = "GET", description = "Progress history" },
        new { path = "/api/v1/workout-sessions/**", method = "ALL", description = "Workout session tracking" },
        new { path = "/api/v1/workout-sessions/stats", method = "GET", description = "Session statistics" },
        new { path = "/api/v1/workout-sessions/{id}/sets/**", method = "ALL", description = "Set management" },
        new { path = "/api/v1/workouts/**", method = "ALL", description = "Workout management" },
        new { path = "/api/v1/workouts/filters", method = "GET", description = "Workout filter options" },
        new { path = "/api/v1/foods/**", method = "ALL", description = "Food database" },
        new { path = "/api/v1/foods/search", method = "GET", description = "Search foods" },
        new { path = "/api/v1/foods/high-protein", method = "GET", description = "High protein foods" },
        new { path = "/api/v1/foods/low-calorie", method = "GET", description = "Low calorie foods" },
        new { path = "/api/v1/saved-workouts/**", method = "ALL", description = "Saved workouts" },
        new { path = "/api/v1/daily-active/**", method = "ALL", description = "Daily activity tracking" },
        new { path = "/api/v1/water-intake/**", method = "ALL", description = "Water intake tracking" },
        new { path = "/api/v1/chat-history/**", method = "ALL", description = "Chat history" },
        new { path = "/api/v1/ai/chat", method = "POST", description = "AI chat (FastAPI)" },
        new { path = "/api/v1/ai/chat/tokens/usage", method = "GET", description = "Token usage stats (FastAPI)" },
        new { path = "/api/v1/food-recognition/predict", method = "POST", description = "Food recognition (FastAPI)" },
        new { path = "/api/v1/food-recognition/predict-top", method = "POST", description = "Top predictions (FastAPI)" },
    }
}));

app.MapGet("/nodejs-docs", () => Results.Redirect("http://host.docker.internal:5000/api-docs", permanent: false));
app.MapGet("/fastapi-docs", () => Results.Redirect("http://host.docker.internal:8000/docs", permanent: false));

app.MapGet("/fastapi-openapi.json", async () =>
{
    using var client = new HttpClient();
    try
    {
        var json = await client.GetStringAsync("http://host.docker.internal:8000/openapi.json");
        return Results.Text(json, "application/json");
    }
    catch
    {
        return Results.Problem("FastAPI service is not available", statusCode: 503);
    }
});

// WebSocket support for Socket.IO
app.UseWebSockets();

// ── Branch: API routes ONLY (Ocelot) ──────────────────────────────────────────
// All non-system routes go through Ocelot
var systemPaths = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
{
    "/", "/health", "/ready", "/rate-limit-status", "/debug/routes",
    "/nodejs-docs", "/fastapi-docs", "/fastapi-openapi.json", "/favicon.ico"
};

app.MapWhen(ctx => !systemPaths.Contains(ctx.Request.Path), app =>
{
    app.UseOcelot().Wait();
});

// System routes are handled by MapGet endpoints (defined earlier in the file)
// Ocelot never sees these requests due to MapWhen branching above

var port = 8080;
var url = $"http://localhost:{port}";

app.Lifetime.ApplicationStarted.Register(() =>
{
   
    // Console output - fixed formatting (removed erroneous ,-{width} alignment)
    Console.WriteLine("");
    Console.WriteLine("╔══════════════════════════════════════════════════════════╗");
    Console.WriteLine($"║  Gateway is running at: {url}".PadRight(57) + "║");
    Console.WriteLine("╠══════════════════════════════════════════════════════════╣");
    Console.WriteLine($"║  Landing Page:      {url}".PadRight(57) + "║");
    Console.WriteLine($"║  Health Check:      {url}/health".PadRight(57) + "║");
    Console.WriteLine("╚══════════════════════════════════════════════════════════╝");
    Console.WriteLine("");
});

app.Run();