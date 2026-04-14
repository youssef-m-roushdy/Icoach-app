"""
Middlewares package — Clean Architecture for ICoach AI
"""
# شيلنا الـ ScopeGuard لأنه اتمسح
# وشيلنا الـ AuthMiddleware Class واستبدلناه بالـ Function

from .auth_middleware import get_current_user
# سيبنا ده لحد ما نعدله هو كمان

__all__ = [
    "get_current_user",
    "TokenBudgetMiddleware"
]