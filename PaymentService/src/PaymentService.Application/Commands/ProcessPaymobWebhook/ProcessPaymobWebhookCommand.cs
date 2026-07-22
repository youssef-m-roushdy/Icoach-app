using System.Diagnostics;
using System.Text.Json;
using MediatR;
using Microsoft.Extensions.Logging;
using PaymentService.Application.Interfaces;
using PaymentService.Domain.Repositories;

namespace PaymentService.Application.Commands.ProcessPaymobWebhook;

public record ProcessPaymobWebhookCommand(string EventId, string EventType, string Payload) : IRequest<bool>;

public class ProcessPaymobWebhookCommandHandler : IRequestHandler<ProcessPaymobWebhookCommand, bool>
{
    private readonly IPaymentRepository _paymentRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IIdempotencyStore _idempotencyStore;
    private readonly ILogger<ProcessPaymobWebhookCommandHandler> _logger;

    public ProcessPaymobWebhookCommandHandler(
        IPaymentRepository paymentRepository,
        IUnitOfWork unitOfWork,
        IIdempotencyStore idempotencyStore,
        ILogger<ProcessPaymobWebhookCommandHandler> logger)
    {
        _paymentRepository = paymentRepository;
        _unitOfWork = unitOfWork;
        _idempotencyStore = idempotencyStore;
        _logger = logger;
    }

    public async Task<bool> Handle(ProcessPaymobWebhookCommand request, CancellationToken cancellationToken)
    {
        var sw = Stopwatch.StartNew();
        Guid? paymentId = null;

        try
        {
            var existing = await _idempotencyStore.GetResponseAsync(request.EventId, cancellationToken);
            if (existing is not null)
            {
                _logger.LogInformation(
                    "Paymob webhook ignored (duplicate). EventId={EventId} EventType={EventType} Gateway=Paymob ElapsedMs={ElapsedMs}",
                    request.EventId, request.EventType, sw.ElapsedMilliseconds);
                return true;
            }

            JsonDocument doc;
            try
            {
                doc = JsonDocument.Parse(request.Payload);
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex,
                    "Paymob webhook invalid JSON. EventId={EventId} Gateway=Paymob ElapsedMs={ElapsedMs}",
                    request.EventId, sw.ElapsedMilliseconds);
                await CommitIdempotencyAsync(request, cancellationToken);
                return true;
            }

            using (doc)
            {
                var root = doc.RootElement;
                if (root.TryGetProperty("obj", out var obj) && obj.ValueKind == JsonValueKind.Object)
                {
                    paymentId = await ApplyPaymobObjectAsync(obj, cancellationToken);
                }
                else
                {
                    _logger.LogWarning(
                        "Paymob webhook missing obj. EventId={EventId} EventType={EventType} Gateway=Paymob",
                        request.EventId, request.EventType);
                }

                await CommitIdempotencyAsync(request, cancellationToken);
            }

            _logger.LogInformation(
                "Paymob webhook processed. EventId={EventId} EventType={EventType} PaymentId={PaymentId} Gateway=Paymob ElapsedMs={ElapsedMs}",
                request.EventId, request.EventType, paymentId, sw.ElapsedMilliseconds);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Paymob webhook failed. EventId={EventId} EventType={EventType} PaymentId={PaymentId} Gateway=Paymob ElapsedMs={ElapsedMs}",
                request.EventId, request.EventType, paymentId, sw.ElapsedMilliseconds);
            throw;
        }
    }

    private async Task<Guid?> ApplyPaymobObjectAsync(JsonElement obj, CancellationToken ct)
    {
        var success = obj.TryGetProperty("success", out var successProp)
                      && (successProp.ValueKind == JsonValueKind.True
                          || (successProp.ValueKind == JsonValueKind.String
                              && bool.TryParse(successProp.GetString(), out var b)
                              && b));

        var isRefunded = obj.TryGetProperty("is_refunded", out var refundedProp)
                         && refundedProp.ValueKind == JsonValueKind.True;

        var externalId = obj.TryGetProperty("id", out var idProp)
            ? idProp.ToString()
            : null;

        Guid? paymentId = null;
        if (obj.TryGetProperty("order", out var order)
            && order.ValueKind == JsonValueKind.Object
            && order.TryGetProperty("merchant_order_id", out var merchantOrderId)
            && Guid.TryParse(merchantOrderId.GetString(), out var parsedPaymentId))
        {
            paymentId = parsedPaymentId;
        }

        var payment = paymentId.HasValue
            ? await _paymentRepository.GetByIdAsync(paymentId.Value, ct)
            : null;

        if (payment is null && !string.IsNullOrWhiteSpace(externalId))
            payment = await _paymentRepository.GetByExternalPaymentIdAsync(externalId, ct);

        if (payment is null)
        {
            _logger.LogWarning("Paymob payment not found. ExternalId={ExternalId}", externalId);
            return null;
        }

        try
        {
            if (isRefunded)
                payment.MarkAsRefunded();
            else if (success)
                payment.MarkAsPaid(externalId ?? payment.ExternalPaymentId ?? payment.Id.ToString());
            else
                payment.MarkAsFailed("Paymob reported unsuccessful transaction.");

            _paymentRepository.Update(payment);
            return payment.Id;
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Ignored invalid Paymob transition. PaymentId={PaymentId}", payment.Id);
            return payment.Id;
        }
    }

    private async Task CommitIdempotencyAsync(ProcessPaymobWebhookCommand request, CancellationToken ct)
    {
        await _idempotencyStore.SaveResponseAsync(
            request.EventId, nameof(ProcessPaymobWebhookCommand), "true", ct);
        await _unitOfWork.SaveChangesAsync(ct);
    }
}
