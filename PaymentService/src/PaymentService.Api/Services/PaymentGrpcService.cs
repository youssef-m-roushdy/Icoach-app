using Grpc.Core;
using MediatR;
using PaymentService.Application.Commands.CancelSubscription;
using PaymentService.Application.Commands.CreatePayment;
using PaymentService.Application.Commands.CreateSubscription;
using PaymentService.Application.Commands.RefundPayment;
using PaymentService.Application.Queries.GetPayment;
using PaymentService.Application.Queries.GetPaymentStatus;
using PaymentService.Application.Queries.GetSubscriptionStatus;
using PaymentService.Contracts.Grpc;

namespace PaymentService.Api.Services;

public class PaymentGrpcService : PaymentGrpcService.PaymentGrpcServiceBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<PaymentGrpcService> _logger;

    public PaymentGrpcService(IMediator mediator, ILogger<PaymentGrpcService> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    public override async Task<CreatePaymentResponse> CreatePayment(CreatePaymentRequest request, ServerCallContext context)
    {
        _logger.LogInformation("Processing gRPC CreatePayment for Order {OrderId}", request.OrderId);
        
        var command = new CreatePaymentCommand(request.UserId, request.OrderId, (decimal)request.Amount, request.Currency, request.Gateway);
        var result = await _mediator.Send(command, context.CancellationToken);
        
        return new CreatePaymentResponse
        {
            PaymentId = result.PaymentId.ToString(),
            CheckoutUrl = result.CheckoutUrl,
            Status = result.Status
        };
    }

    public override async Task<CreateSubscriptionResponse> CreateSubscription(CreateSubscriptionRequest request, ServerCallContext context)
    {
        _logger.LogInformation("Processing gRPC CreateSubscription for User {UserId}", request.UserId);
        
        var coachId = string.IsNullOrEmpty(request.CoachId) ? null : request.CoachId;
        var command = new CreateSubscriptionCommand(request.UserId, request.PlanType, request.Gateway, coachId);
        var result = await _mediator.Send(command, context.CancellationToken);
        
        return new CreateSubscriptionResponse
        {
            SubscriptionId = result.SubscriptionId.ToString(),
            CheckoutUrl = result.CheckoutUrl
        };
    }

    public override async Task<PaymentResponse> GetPayment(GetPaymentRequest request, ServerCallContext context)
    {
        var query = new GetPaymentQuery(Guid.Parse(request.PaymentId));
        var payment = await _mediator.Send(query, context.CancellationToken);
        
        if (payment == null) throw new RpcException(new Status(StatusCode.NotFound, "Payment not found"));

        return new PaymentResponse
        {
            PaymentId = payment.Id.ToString(),
            UserId = payment.UserId,
            OrderId = payment.OrderId,
            Amount = (double)payment.Amount,
            Currency = payment.Currency,
            Gateway = payment.Gateway.ToString(),
            Status = payment.Status.ToString(),
            ExternalPaymentId = payment.ExternalPaymentId ?? "",
            CheckoutUrl = payment.CheckoutUrl ?? "",
            CreatedAt = payment.CreatedAt.ToString("O")
        };
    }

    public override async Task<PaymentStatusResponse> GetPaymentStatus(GetPaymentStatusRequest request, ServerCallContext context)
    {
        var query = new GetPaymentStatusQuery(Guid.Parse(request.PaymentId));
        var status = await _mediator.Send(query, context.CancellationToken);
        
        return new PaymentStatusResponse { Status = status };
    }

    public override async Task<RefundResponse> RefundPayment(RefundPaymentRequest request, ServerCallContext context)
    {
        var command = new RefundPaymentCommand(Guid.Parse(request.PaymentId));
        var result = await _mediator.Send(command, context.CancellationToken);
        
        return new RefundResponse { Success = result.Success, Message = result.Message };
    }

    public override async Task<CancelSubscriptionResponse> CancelSubscription(CancelSubscriptionRequest request, ServerCallContext context)
    {
        var command = new CancelSubscriptionCommand(Guid.Parse(request.SubscriptionId));
        var result = await _mediator.Send(command, context.CancellationToken);
        
        return new CancelSubscriptionResponse { Success = result.Success, Status = result.Status };
    }

    public override async Task<SubscriptionStatusResponse> GetSubscriptionStatus(GetSubscriptionStatusRequest request, ServerCallContext context)
    {
        var query = new GetSubscriptionStatusQuery(request.UserId);
        var sub = await _mediator.Send(query, context.CancellationToken);
        
        if (sub == null) throw new RpcException(new Status(StatusCode.NotFound, "Active subscription not found"));

        return new SubscriptionStatusResponse
        {
            IsActive = sub.Status == Domain.Enums.SubscriptionStatus.Active || sub.Status == Domain.Enums.SubscriptionStatus.Trialing,
            PlanType = sub.PlanType.ToString(),
            CurrentPeriodEnd = sub.CurrentPeriodEnd.ToString("O"),
            CoachId = sub.CoachId?.ToString() ?? ""
        };
    }
}