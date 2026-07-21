using Microsoft.AspNetCore.Mvc;
using PaymentService.Application.Interfaces;
using PaymentService.Domain.Enums;
using PaymentService.Infrastructure.Persistence;

namespace PaymentService.Api.Controllers;

[ApiController]
[Route("webhooks")]
public class WebhooksController : ControllerBase
{
    private readonly IPaymentGatewayFactory _factory;
    private readonly PaymentDbContext _dbContext;
    private readonly ILogger<WebhooksController> _logger;

    public WebhooksController(IPaymentGatewayFactory factory, PaymentDbContext dbContext, ILogger<WebhooksController> logger)
    {
        _factory = factory;
        _dbContext = dbContext;
        _logger = logger;
    }

    [HttpPost("stripe")]
    public async Task<IActionResult> StripeWebhook()
    {
        var payload = await new StreamReader(Request.Body).ReadToEndAsync();
        var signature = Request.Headers["Stripe-Signature"].ToString();
        
        var gateway = _factory.Create(GatewayType.Stripe);
        
        if (!gateway.ValidateWebhookSignature(payload, signature))
        {
            _logger.LogWarning("Invalid Stripe webhook signature received");
            return Unauthorized();
        }

        _logger.LogInformation("Stripe webhook received and validated");
        
        // TODO: Parse payload, find Payment/Subscription, update status via Domain methods, save to DB.
        // Example: _dbContext.Payments.Update(payment); await _dbContext.SaveChangesAsync();
        
        return Ok(); // Must return 200 OK quickly to the gateway
    }

    [HttpPost("paymob")]
    public async Task<IActionResult> PaymobWebhook()
    {
        var payload = await new StreamReader(Request.Body).ReadToEndAsync();
        // Implement Paymob signature validation
        return Ok();
    }

    [HttpPost("paypal")]
    public async Task<IActionResult> PayPalWebhook()
    {
        var payload = await new StreamReader(Request.Body).ReadToEndAsync();
        // Implement PayPal signature validation
        return Ok();
    }
}