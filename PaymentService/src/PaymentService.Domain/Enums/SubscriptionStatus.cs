namespace PaymentService.Domain.Enums;

public enum SubscriptionStatus 
{ 
    Active, 
    Canceled, 
    Expired, 
    PastDue, 
    Trialing 
}