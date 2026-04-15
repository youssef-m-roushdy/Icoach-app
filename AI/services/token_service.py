import tiktoken
import logging

logger = logging.getLogger(__name__)

class TokenService:
    @staticmethod
    def count_tokens(text: str, model: str = "gpt-3.5-turbo") -> int:
        """Counts the number of tokens in a string."""
        try:
            # Llama 3/4 uses different encoding, but tiktoken is close enough for estimation 
            # or you can use specific llama tokenizers if needed.
            encoding = tiktoken.get_encoding("cl100k_base") 
            return len(encoding.encode(text))
        except Exception as e:
            logger.error(f"Error counting tokens: {e}")
            return len(text) // 4  # Fallback estimation