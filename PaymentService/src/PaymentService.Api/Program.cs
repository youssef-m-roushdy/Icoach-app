using System.Security.Cryptography;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using PaymentService.Api.Middleware;
using PaymentService.Api.Services;
using PaymentService.Application;
using PaymentService.Infrastructure;
using PaymentService.Infrastructure.Persistence;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Serilog
builder.Host.UseSerilog((ctx, lc) => lc
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console());

// Database & Infrastructure
builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddApplicationServices();

// gRPC
builder.Services.AddGrpc();

// JWT Authentication using RSA Public Key from File
var publicKeyPath = Path.Combine(AppContext.BaseDirectory, builder.Configuration["Jwt:PublicKeyPath"]!);
if (!File.Exists(publicKeyPath))
{
    throw new FileNotFoundException("RSA Public Key file not found.", publicKeyPath);
}

var rsaPublicKey = File.ReadAllText(publicKeyPath);
var rsa = RSA.Create();
rsa.ImportFromPem(rsaPublicKey);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new RsaSecurityKey(rsa)
        };

        // Allow gRPC to pass token in Authorization header
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
                if (!string.IsNullOrEmpty(accessToken))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();

var app = builder.Build();

app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseSerilogRequestLogging();

app.UseAuthentication();
app.UseAuthorization();

app.MapGrpcService<PaymentGrpcService>();
app.MapControllers();

app.MapGet("/health", () => "Healthy");
app.MapGet("/ready", () => "Ready");

// Apply Migrations on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<PaymentDbContext>();
    try
    {
        DbInitializer.InitializeAsync(db).Wait();
        Log.Information("Database migrations applied successfully.");
    }
    catch (Exception ex)
    {
        Log.Fatal(ex, "Failed to apply database migrations.");
    }
}

app.Run();