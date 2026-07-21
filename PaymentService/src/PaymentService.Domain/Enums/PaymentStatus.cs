namespace PaymentService.Domain.Enums;

public enum PaymentStatus 
{ 
    Pending, 
    Processing, 
    Paid, 
    Failed, 
    Cancelled, 
    Refunded 
}