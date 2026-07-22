using System.Diagnostics;
using System.Text.Json;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PaymentService.Application.Commands.ProcessPayPalWebhook;
using PaymentService.Application.Commands.ProcessPaymobWebhook;
using PaymentService.Application.Commands.ProcessStripeWebhook;
using PaymentService.Application.Interfaces;
using PaymentService.Domain.Enums;

namespace PaymentService.Api.Controllers;

[ApiController]
[Route("webhooks")]
[EnableRateLimiting("webhooks")]
public class WebhooksController : ControllerBase
{
    private readonly IPaymentGatewayFactory _factory;
    private readonly ISender _mediator;
    private readonly ILogger<WebhooksController> _logger;

    public WebhooksController(
        IPaymentGatewayFactory factory,
        ISender mediator,
        ILogger<WebhooksController> logger)
    {
        _factory = factory;
        _mediator = mediator;
        _logger = logger;
    }

    [HttpPost("stripe")]
    public async Task<IActionResult> StripeWebhook(CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        var payload = await ReadBodyAsync(ct);
        var signature = Request.Headers["Stripe-Signature"].ToString();
        var gateway = _factory.Create(GatewayType.Stripe);

        if (!gateway.ValidateWebhookSignature(payload, signature))
        {
            _logger.LogWarning(
                "Invalid Stripe webhook signature. Gateway=Stripe ElapsedMs={ElapsedMs}",
                sw.ElapsedMilliseconds);
            return Unauthorized();
        }

        try
        {
            using var doc = JsonDocument.Parse(payload);
            var root = doc.RootElement;

            if (!root.TryGetProperty("id", out var idProp) || !root.TryGetProperty("type", out var typeProp))
                return BadRequest("Invalid payload structure");

            var eventId = idProp.GetString();
            var eventType = typeProp.GetString();

            if (string.IsNullOrEmpty(eventId) || string.IsNullOrEmpty(eventType))
                return BadRequest("Invalid payload structure");

            _logger.LogInformation(
                "Received Stripe webhook. EventId={EventId} EventType={EventType} Gateway=Stripe",
                eventId, eventType);

            await _mediator.Send(new ProcessStripeWebhookCommand(eventId, eventType, payload), ct);
            return Ok();
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Stripe webhook payload parse failed. Gateway=Stripe ElapsedMs={ElapsedMs}",
                sw.ElapsedMilliseconds);
            return BadRequest("Invalid JSON");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error dispatching Stripe webhook. Gateway=Stripe ElapsedMs={ElapsedMs}",
                sw.ElapsedMilliseconds);
            return StatusCode(500);
        }
    }

    [HttpPost("paymob")]
    public async Task<IActionResult> PaymobWebhook(CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        var payload = await ReadBodyAsync(ct);
        var signature = Request.Headers["hmac"].ToString();
        if (string.IsNullOrWhiteSpace(signature))
            signature = Request.Query["hmac"].ToString();

        var gateway = _factory.Create(GatewayType.Paymob);
        if (!gateway.ValidateWebhookSignature(payload, signature))
        {
            _logger.LogWarning("Invalid Paymob webhook signature. Gateway=Paymob ElapsedMs={ElapsedMs}",
                sw.ElapsedMilliseconds);
            return Unauthorized();
        }

        try
        {
            using var doc = JsonDocument.Parse(payload);
            var root = doc.RootElement;
            var eventType = root.TryGetProperty("type", out var typeProp) ? typeProp.GetString() : null;
            var obj = root.TryGetProperty("obj", out var o) ? o : default;
            var eventId = obj.ValueKind == JsonValueKind.Object && obj.TryGetProperty("id", out var idProp)
                ? idProp.ToString()
                : null;

            if (string.IsNullOrWhiteSpace(eventId))
                return BadRequest("Missing event id");

            _logger.LogInformation(
                "Received Paymob webhook. EventId={EventId} EventType={EventType} Gateway=Paymob",
                eventId, eventType);

            await _mediator.Send(new ProcessPaymobWebhookCommand(eventId, eventType ?? "unknown", payload), ct);
            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error dispatching Paymob webhook. Gateway=Paymob ElapsedMs={ElapsedMs}",
                sw.ElapsedMilliseconds);
            return StatusCode(500);
        }
    }

    [HttpPost("paypal")]
    public async Task<IActionResult> PayPalWebhook(CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        var payload = await ReadBodyAsync(ct);
        var signature = Request.Headers["PAYPAL-TRANSMISSION-SIG"].ToString();
        var gateway = _factory.Create(GatewayType.PayPal);

        if (!gateway.ValidateWebhookSignature(payload, signature))
        {
            _logger.LogWarning("Invalid PayPal webhook signature. Gateway=PayPal ElapsedMs={ElapsedMs}",
                sw.ElapsedMilliseconds);
            return Unauthorized();
        }

        try
        {
            using var doc = JsonDocument.Parse(payload);
            var root = doc.RootElement;
            var eventId = root.TryGetProperty("id", out var idProp) ? idProp.GetString() : null;
            var eventType = root.TryGetProperty("event_type", out var typeProp) ? typeProp.GetString() : null;

            if (string.IsNullOrWhiteSpace(eventId) || string.IsNullOrWhiteSpace(eventType))
                return BadRequest("Invalid payload structure");

            _logger.LogInformation(
                "Received PayPal webhook. EventId={EventId} EventType={EventType} Gateway=PayPal",
                eventId, eventType);

            await _mediator.Send(new ProcessPayPalWebhookCommand(eventId, eventType, payload), ct);
            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error dispatching PayPal webhook. Gateway=PayPal ElapsedMs={ElapsedMs}",
                sw.ElapsedMilliseconds);
            return StatusCode(500);
        }
    }

    private async Task<string> ReadBodyAsync(CancellationToken ct)
    {
        using var reader = new StreamReader(Request.Body);
        return await reader.ReadToEndAsync(ct);
    }
}
