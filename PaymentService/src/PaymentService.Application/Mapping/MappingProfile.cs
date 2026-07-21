using AutoMapper;
using PaymentService.Domain.AggregateRoots;

namespace PaymentService.Application.Mapping;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<Payment, Payment>();
        CreateMap<Subscription, Subscription>();
    }
}