using PaymentService.Domain.AggregateRoots;

namespace PaymentService.Domain.Repositories;

public interface IPaymentRepository
{
    Task<Payment?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task AddAsync(Payment payment, CancellationToken cancellationToken);
    void Update(Payment payment);
}